import { Hono } from 'hono';
import { authMiddleware } from '../auth/middleware/auth.js';
import { getDb } from '../../lib/database.js';
import { extractTextFromDocx, extractTextFromPDF, OpenAIProvider } from '@ams/ai';
import type { AppEnv } from '../../types/env.js';
import { rateLimit } from '../../middleware/rate-limit.js';

const ai = new Hono<AppEnv>();

ai.use('*', authMiddleware);

ai.post('/parse-cv', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null) as { document_id?: unknown; text?: unknown; force?: unknown } | null;
  if (!body) return c.json({ success: false, error: 'Format JSON tidak valid' }, 400);
  const { document_id, text, force } = body;

  if (document_id !== undefined && typeof document_id !== 'string') {
    return c.json({ success: false, error: 'document_id tidak valid' }, 400);
  }
  if (text !== undefined && (typeof text !== 'string' || text.length > 200_000)) {
    return c.json({ success: false, error: 'Teks CV tidak valid atau terlalu panjang' }, 400);
  }
  if (force !== undefined && typeof force !== 'boolean') {
    return c.json({ success: false, error: 'Nilai force tidak valid' }, 400);
  }
  if (force === true && user.role !== 'admin') {
    return c.json({ success: false, error: 'Hanya admin yang dapat meminta analisis ulang' }, 403);
  }

  const db = getDb();

  let cvText = typeof text === 'string' ? text.trim() : '';

  if (document_id) {
    let documentQuery = db
      .from('associate_documents')
      .select('*')
      .eq('id', document_id)
      .eq('type', 'cv')
      .is('deleted_at', null);
    if (user.role !== 'admin') {
      documentQuery = documentQuery.eq('associate_id', user.id);
    }
    const { data: doc, error } = await documentQuery.single();

    if (error || !doc) {
      return c.json({ success: false, error: 'Dokumen tidak ditemukan' }, 404);
    }

    // Reuse a completed parse so retrying the same document does not trigger
    // another paid AI call.
    if (force !== true && doc.parsed_data && typeof doc.parsed_data === 'object') {
      return c.json({ success: true, data: doc.parsed_data, cached: true });
    }

    const downloadDebug: Record<string, unknown> = {};

    if (!cvText && doc.url) {
      try {
        console.log('Generating signed URL for document path:', doc.url);
        const { data: fileData, error: signedUrlError } = await db.storage
          .from('ams-files')
          .createSignedUrl(doc.url, 3600);

        if (signedUrlError) {
          console.error('Supabase signed URL generation failed:', signedUrlError);
          downloadDebug.signedUrlError = String(signedUrlError);
        } else if (fileData?.signedUrl) {
          console.log('Downloading file from signed URL...');
          const resp = await fetch(fileData.signedUrl);
          if (resp.ok) {
            const contentType = resp.headers.get('content-type') || '';
            downloadDebug.contentType = contentType;
            downloadDebug.status = resp.status;
            console.log('File download success. Content-Type:', contentType);
            
            const isPDF = contentType.includes('pdf') ||
                          doc.name?.toLowerCase().endsWith('.pdf') || 
                          doc.url?.toLowerCase().endsWith('.pdf');
            const isDocx = contentType.includes('wordprocessingml') ||
                           doc.name?.toLowerCase().endsWith('.docx') ||
                           doc.url?.toLowerCase().endsWith('.docx');

            downloadDebug.isPDF = isPDF;
            downloadDebug.isDocx = isDocx;

            if (isPDF) {
              const arrayBuffer = await resp.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              cvText = await extractTextFromPDF(buffer);
              console.log('PDF text extraction success. Character length:', cvText?.length);
            } else if (isDocx) {
              const arrayBuffer = await resp.arrayBuffer();
              cvText = await extractTextFromDocx(Buffer.from(arrayBuffer));
              console.log('DOCX text extraction success. Character length:', cvText?.length);
            } else {
              const textContent = await resp.text();
              // Check if file is text-based or binary
              if (textContent.includes('\u0000') || /[\x00-\x08\x0E-\x1F]/.test(textContent.slice(0, 200))) {
                console.warn('Binary non-PDF file detected, skipping raw text extraction.');
                cvText = '';
              } else {
                cvText = textContent;
                console.log('Text file download success. Character length:', cvText?.length);
              }
            }
          } else {
            console.error('Download file from signed URL response not OK:', resp.status, resp.statusText);
            downloadDebug.downloadError = `Status ${resp.status}: ${resp.statusText}`;
          }
        }
      } catch (e) {
        console.error('File download/processing error:', e);
        downloadDebug.exception = String(e);
      }
    }

    if (!cvText || cvText.trim().length < 10) {
      console.warn('CV text extraction produced insufficient text.', downloadDebug);
      return c.json({ success: false, error: 'Isi dokumen tidak dapat dibaca. Gunakan PDF berbasis teks, DOCX, atau tempelkan teks CV.' }, 422);
    }

    cvText = cvText.slice(0, 200_000);

    downloadDebug.cvTextLength = cvText.length;

    try {
      if (!process.env.OPENAI_API_KEY) {
        return c.json({ success: false, error: 'Layanan AI belum dikonfigurasi' }, 503);
      }
      const provider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "aihubmix/xiaomi-mimo-v2.5-free"
      });
      console.log('Sending text to AI provider for CV parsing. Length:', cvText.length);
      const parsed = await provider.parseCV(cvText);
      console.log('AI CV parsing succeeded. Parsed keys:', Object.keys(parsed));

      const { error: persistError } = await db
        .from('associate_documents')
        .update({ parsed_data: parsed })
        .eq('id', document_id);
      if (persistError) {
        console.error('Persist parsed CV failed:', persistError);
        return c.json({ success: false, error: 'Hasil analisis belum dapat disimpan' }, 500);
      }

      return c.json({ success: true, data: parsed });
    } catch (err) {
      console.error('AI CV parsing failed:', err);
      return c.json({ success: false, error: 'AI parsing gagal' }, 500);
    }
  }

  if (!cvText) {
    return c.json({ success: false, error: 'Text atau document_id wajib diisi' }, 400);
  }
  if (cvText.trim().length < 10) {
    return c.json({ success: false, error: 'Teks CV terlalu pendek untuk dianalisis' }, 400);
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return c.json({ success: false, error: 'Layanan AI belum dikonfigurasi' }, 503);
    }
    const provider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "aihubmix/xiaomi-mimo-v2.5-free"
    });
    const parsed = await provider.parseCV(cvText);
    return c.json({ success: true, data: parsed });
  } catch (err) {
    console.error('AI CV parsing failed (direct text):', err);
    return c.json({ success: false, error: 'AI parsing gagal' }, 500);
  }
});

export default ai;
