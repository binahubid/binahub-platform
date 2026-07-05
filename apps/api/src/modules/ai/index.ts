import { Hono } from 'hono';
import { authMiddleware } from '../auth/middleware/auth.js';
import { getDb } from '../../lib/database.js';
import { createAIClient, parseCV, extractTextFromPDF, OpenAIProvider } from '@ams/ai';
import type { AppEnv } from '../../types/env.js';

const ai = new Hono<AppEnv>();

ai.use('*', authMiddleware);

ai.post('/parse-cv', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { document_id, text } = body;

  const db = getDb();

  let cvText = text || '';

  if (document_id) {
    const { data: doc, error } = await db
      .from('associate_documents')
      .select('*')
      .eq('id', document_id)
      .eq('associate_id', user.id)
      .single();

    if (error || !doc) {
      return c.json({ success: false, error: 'Dokumen tidak ditemukan' }, 404);
    }

    if (!cvText && doc.url) {
      try {
        console.log('Generating signed URL for document path:', doc.url);
        const { data: fileData, error: signedUrlError } = await db.storage
          .from('ams-files')
          .createSignedUrl(doc.url, 3600);

        if (signedUrlError) {
          console.error('Supabase signed URL generation failed:', signedUrlError);
        } else if (fileData?.signedUrl) {
          console.log('Downloading file from signed URL...');
          const resp = await fetch(fileData.signedUrl);
          if (resp.ok) {
            const contentType = resp.headers.get('content-type');
            console.log('File download success. Content-Type:', contentType);
            if (contentType?.includes('pdf')) {
              const arrayBuffer = await resp.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              cvText = await extractTextFromPDF(buffer);
              console.log('PDF text extraction success. Character length:', cvText?.length);
            } else {
              cvText = await resp.text();
              console.log('Text file download success. Character length:', cvText?.length);
            }
          } else {
            console.error('Download file from signed URL response not OK:', resp.status, resp.statusText);
          }
        }
      } catch (e) {
        console.error('File download/processing error:', e);
      }
    }

    if (!cvText || cvText.trim().length < 10) {
      console.warn('Warning: cvText is empty or too short. Falling back to filename.');
      cvText = `File: ${doc.name}`;
    }

    try {
      const provider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || "",
        model: process.env.OPENAI_MODEL || "openai/gpt-oss-120b:free"
      });
      console.log('Sending text to AI provider for CV parsing. Length:', cvText.length);
      const parsed = await provider.parseCV(cvText);
      console.log('AI CV parsing succeeded. Parsed keys:', Object.keys(parsed));

      await db
        .from('associate_documents')
        .update({ parsed_data: parsed })
        .eq('id', document_id);

      return c.json({ success: true, data: parsed });
    } catch (err) {
      console.error('AI CV parsing failed:', err);
      return c.json({ success: false, error: 'AI parsing gagal', detail: String(err) }, 500);
    }
  }

  if (!cvText) {
    return c.json({ success: false, error: 'Text atau document_id wajib diisi' }, 400);
  }

  try {
    const provider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "openai/gpt-oss-120b:free"
    });
    const parsed = await provider.parseCV(cvText);
    return c.json({ success: true, data: parsed });
  } catch (err) {
    return c.json({ success: false, error: 'AI parsing gagal', detail: String(err) }, 500);
  }
});

export default ai;
