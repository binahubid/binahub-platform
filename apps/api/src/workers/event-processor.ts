import { getDb } from '../lib/database.js';
import { parseCVWithFallback } from '@ams/ai';
import type { EventQueue } from '@ams/shared/types/events';

// ============================================
// EVENT PROCESSOR
// ============================================

export async function processPendingEvents(limit: number = 10) {
  const db = getDb();
  
  // Get pending events
  const { data: events, error } = await db
    .from('event_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('available_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  if (!events || events.length === 0) {
    return { processed: 0, events: [] };
  }

  const results: Array<{ id: string; type: string; status: string; error?: string }> = [];
  
  for (const event of events) {
    const result = await processEvent(event as EventQueue);
    if (result) results.push(result);
  }

  return {
    processed: results.filter((result) => result.status === 'done').length,
    failed: results.filter((result) => result.status === 'failed').length,
    retrying: results.filter((result) => result.status === 'pending').length,
    events: results,
  };
}

// ============================================
// PROCESS SINGLE EVENT
// ============================================

async function processEvent(event: EventQueue): Promise<{ id: string; type: string; status: string; error?: string } | null> {
  const db = getDb();
  const currentAttempts = Number(event.attempts || 0);
  const maxAttempts = Number((event as unknown as { max_attempts?: number }).max_attempts || event.maxAttempts || 3);
  
  // Claim only while the row is still pending. This prevents two serverless
  // workers from processing the same side effect concurrently.
  const { data: claimed, error: claimError } = await db
    .from('event_queue')
    .update({
      status: 'processing',
      attempts: currentAttempts + 1,
      error_message: null,
    })
    .eq('id', event.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (claimError) throw new Error('Failed to claim event');
  if (!claimed) return null;

  try {
    switch (event.type) {
      case 'CVUploaded':
        await processCVUploaded(event);
        break;
      case 'AssociateSubmitted':
        await processAssociateSubmitted(event);
        break;
      case 'AssociateApproved':
        await processAssociateApproved(event);
        break;
      case 'AssociateRejected':
        await processAssociateRejected(event);
        break;
      case 'SearchSyncNeeded':
        await processSearchSync(event);
        break;
      default:
        throw new Error(`Unsupported event type: ${event.type}`);
    }

    // Mark as done
    await db
      .from('event_queue')
      .update({
        status: 'done',
        processed_at: new Date().toISOString()
      })
      .eq('id', event.id);

    return { id: event.id, type: event.type, status: 'done' };

  } catch (error) {
    console.error(`Error processing event ${event.id}:`, error);
    const nextAttempt = currentAttempts + 1;
    const shouldRetry = nextAttempt < maxAttempts;
    const retryAt = new Date(Date.now() + Math.min(2 ** nextAttempt, 60) * 60 * 1000).toISOString();

    await db
      .from('event_queue')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        available_at: shouldRetry ? retryAt : new Date().toISOString(),
        error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error'
      })
      .eq('id', event.id);

    return {
      id: event.id,
      type: event.type,
      status: shouldRetry ? 'pending' : 'failed',
      error: shouldRetry ? `Dijadwalkan ulang pada ${retryAt}` : 'Batas percobaan tercapai',
    };
  }
}

// ============================================
// CV UPLOADED PROCESSOR
// ============================================

async function processCVUploaded(event: EventQueue) {
  const db = getDb();
  const { associate_id, file_id } = event.payload as { associate_id: string; file_id: string };
  
  console.log(`Processing CV upload for associate ${associate_id}`);
  
  // 1. Get file metadata
  const { data: file, error: fileError } = await db
    .from('files')
    .select('*')
    .eq('id', file_id)
    .single();

  if (fileError || !file) {
    throw new Error('File not found');
  }

  const { data: document, error: documentError } = await db
    .from('associate_documents')
    .select('id, parsed_data')
    .eq('id', file_id)
    .eq('associate_id', associate_id)
    .maybeSingle();
  if (documentError || !document) throw new Error('CV document is not registered');
  if (document.parsed_data && typeof document.parsed_data === 'object') {
    console.log(`CV ${file_id} was already parsed; skipping duplicate AI call`);
    return;
  }

  // 2. Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await db.storage
    .from(file.bucket)
    .download(file.path);

  if (downloadError || !fileData) {
    throw new Error('Failed to download file');
  }

  const text = await extractTextFromFile(fileData, file.mime);
  if (text.trim().length < 10) throw new Error('CV content could not be extracted');
  // 4. Parse with AI
  const parsed = await parseCVWithFallback(text.slice(0, 200_000));

  // Parsing only prepares a draft. Profile/history data is imported later,
  // after the associate reviews and explicitly confirms it in the UI.
  const { error: fileUpdateError } = await db
    .from('files')
    .update({
      metadata: { parsed: true, parsedAt: new Date().toISOString(), parsedData: parsed }
    })
    .eq('id', file_id);
  if (fileUpdateError) throw new Error('Failed to persist parsed CV metadata');

  const { error: documentUpdateError } = await db
    .from('associate_documents')
    .update({
      parsed_data: parsed as any
    })
    .eq('id', file_id);
  if (documentUpdateError) throw new Error('Failed to persist parsed CV draft');

  console.log(`CV processing completed for associate ${associate_id}`);
}

// ============================================
// HELPER: Extract text from file
// ============================================

async function extractTextFromFile(fileData: Blob, mime: string): Promise<string> {
  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (mime === 'application/pdf') {
    try {
      const { extractTextFromPDF } = await import('@ams/ai/utils/pdf');
      return await extractTextFromPDF(buffer);
    } catch (e) {
      console.error('PDF text extraction failed:', e);
      return '';
    }
  }

  if (mime.includes('word')) {
    try {
      const { extractTextFromDocx } = await import('@ams/ai/utils/pdf');
      return await extractTextFromDocx(buffer);
    } catch (error) {
      console.error('Word text extraction failed:', error);
      return '';
    }
  }

  // Fallback: treat as plain text
  try {
    return await fileData.text();
  } catch {
    return '';
  }
}

// ============================================
// ASSOCIATE SUBMITTED PROCESSOR
// ============================================

async function processAssociateSubmitted(event: EventQueue) {
  const db = getDb();
  const { associate_id } = event.payload as { associate_id: string };
  
  console.log(`Processing associate submission for ${associate_id}`);
  
  const { data: profile } = await db
    .from('associate_profiles')
    .select('full_name')
    .eq('associate_id', associate_id)
    .maybeSingle();

  const adminIds = await getAdminUserIds();
  if (adminIds.length === 0) throw new Error('No administrator available for submission notification');

  const { error } = await db.from('notifications').upsert(
    adminIds.map((adminId) => ({
      recipient_id: adminId,
      recipient_role: 'admin',
      type: 'submitted',
      title: 'Profil associate menunggu review',
      message: `${profile?.full_name || 'Seorang associate'} telah mengirim profil untuk ditinjau.`,
      link: `/admin/associates/${associate_id}`,
      reference_id: associate_id,
    })),
    { onConflict: 'recipient_id,type,reference_id' },
  );
  if (error) throw new Error('Failed to create submission notification');
  
  console.log(`Associate submission processed for ${associate_id}`);
}

// ============================================
// ASSOCIATE APPROVED PROCESSOR
// ============================================

async function processAssociateApproved(event: EventQueue) {
  const db = getDb();
  const { associate_id } = event.payload as { associate_id: string; approved_by: string };
  
  console.log(`Processing associate approval for ${associate_id}`);
  
  const { error: notificationError } = await db.from('notifications').upsert({
    recipient_id: associate_id,
    recipient_role: 'associate',
    type: 'approved',
    title: 'Profil Anda telah disetujui',
    message: 'Profil associate Anda sudah aktif dan dapat digunakan untuk menerima penugasan.',
    link: '/dashboard/profile',
    reference_id: associate_id,
  }, { onConflict: 'recipient_id,type,reference_id' });
  if (notificationError) throw new Error('Failed to create approval notification');
  
  // Sync to search index
  await db.rpc('enqueue_transformation_event', {
    p_type: 'SearchSyncNeeded',
    p_aggregate_type: 'associate',
    p_aggregate_id: associate_id,
    p_payload: { associate_id, action: 'index' }
  });
  
  console.log(`Associate approval processed for ${associate_id}`);
}

// ============================================
// ASSOCIATE REJECTED PROCESSOR
// ============================================

async function processAssociateRejected(event: EventQueue) {
  const db = getDb();
  const { associate_id, reason } = event.payload as {
    associate_id: string;
    rejected_by: string;
    reason?: string;
  };
  
  console.log(`Processing associate rejection for ${associate_id}`);
  
  const { error: notificationError } = await db.from('notifications').upsert({
    recipient_id: associate_id,
    recipient_role: 'associate',
    type: 'rejected',
    title: 'Profil perlu diperbaiki',
    message: reason ? `Catatan reviewer: ${reason.slice(0, 1000)}` : 'Profil dikembalikan untuk diperbaiki sebelum diajukan kembali.',
    link: '/dashboard/profile',
    reference_id: associate_id,
  }, { onConflict: 'recipient_id,type,reference_id' });
  if (notificationError) throw new Error('Failed to create rejection notification');
  
  console.log(`Associate rejection processed for ${associate_id}`);
}

// ============================================
// SEARCH SYNC PROCESSOR
// ============================================

async function processSearchSync(event: EventQueue) {
  const { associate_id, action } = event.payload as { associate_id: string; action: string };
  
  console.log(`Processing search sync for associate ${associate_id}`);
  
  // AMS currently searches the authoritative Postgres data directly. No
  // external index is required, so the event is an explicit no-op rather than
  // falsely recording a Meilisearch sync that never happened.
  console.log(`Database-backed search is current (${action}) for associate ${associate_id}`);
}

async function getAdminUserIds(): Promise<string[]> {
  const db = getDb();
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error('Failed to list administrators');
  const users = (data?.users || []) as Array<{
    id: string;
    app_metadata?: Record<string, unknown>;
  }>;
  return users
    .filter((user) => user.app_metadata?.role === 'admin')
    .map((user) => user.id);
}
