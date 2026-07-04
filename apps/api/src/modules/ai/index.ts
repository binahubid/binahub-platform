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
        const { data: fileData } = await db.storage
          .from('ams-files')
          .createSignedUrl(doc.url, 3600);

        if (fileData?.signedUrl) {
          const resp = await fetch(fileData.signedUrl);
          if (resp.ok) {
            const contentType = resp.headers.get('content-type');
            if (contentType?.includes('pdf')) {
              const arrayBuffer = await resp.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              cvText = await extractTextFromPDF(buffer);
            } else {
              cvText = await resp.text();
            }
          }
        }
      } catch (e) {
        console.error('File download error:', e);
      }
    }

    if (!cvText) {
      cvText = `File: ${doc.name}`;
    }

    try {
      const provider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || "",
        model: process.env.OPENAI_MODEL || "openai/gpt-oss-120b:free"
      });
      const parsed = await provider.parseCV(cvText);

      await db
        .from('associate_documents')
        .update({ parsed_data: parsed })
        .eq('id', document_id);

      return c.json({ success: true, data: parsed });
    } catch (err) {
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
