import { getDb } from '../lib/database';
import { OpenAIProvider } from '@ams/ai';
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

  const results = [];
  
  for (const event of events) {
    await processEvent(event);
    results.push({ id: event.id, type: event.type, status: 'done' });
  }

  return { processed: results.length, events: results };
}

// ============================================
// PROCESS SINGLE EVENT
// ============================================

async function processEvent(event: EventQueue) {
  const db = getDb();
  
  // Mark as processing
  await db
    .from('event_queue')
    .update({
      status: 'processing',
      attempts: (event.attempts || 0) + 1
    })
    .eq('id', event.id);

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
        console.log(`Unknown event type: ${event.type}`);
    }

    // Mark as done
    await db
      .from('event_queue')
      .update({
        status: 'done',
        processed_at: new Date().toISOString()
      })
      .eq('id', event.id);

  } catch (error) {
    console.error(`Error processing event ${event.id}:`, error);
    
    // Mark as failed
    await db
      .from('event_queue')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', event.id);
    
    throw error;
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

  // 2. Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await db.storage
    .from(file.bucket)
    .download(file.path);

  if (downloadError || !fileData) {
    throw new Error('Failed to download file');
  }

  // 3. Extract text from PDF (simplified - in production use pdf-parse)
  // For now, we'll simulate extraction
  const text = await extractTextFromFile(fileData, file.mime);

  // 4. Parse with AI
  const aiProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!
  });

  const parsed = await aiProvider.parseCV(text);

  // 5. Update associate profile with parsed data
  if (parsed.headline || parsed.bio) {
    await db
      .from('associate_profiles')
      .update({
        headline: parsed.headline,
        bio: parsed.bio,
        updated_at: new Date().toISOString()
      })
      .eq('associate_id', associate_id);
  }

  // 6. Add skills
  for (const skill of parsed.skills) {
    await db
      .from('associate_skills')
      .upsert({
        associate_id,
        skill_name: skill.name,
        category: skill.category || 'other',
        proficiency: skill.proficiency || 'intermediate',
        years_experience: skill.yearsExperience
      }, { onConflict: 'associate_id,skill_name' });
  }

  // 7. Add experience
  for (const exp of parsed.experience) {
    await db
      .from('associate_experiences')
      .insert({
        associate_id,
        company: exp.company,
        position: exp.position,
        description: exp.description,
        start_date: exp.startDate,
        end_date: exp.endDate,
        is_current: !exp.endDate
      });
  }

  // 8. Add education
  for (const edu of parsed.education) {
    await db
      .from('associate_educations')
      .insert({
        associate_id,
        institution: edu.institution,
        degree: edu.degree,
        field_of_study: edu.fieldOfStudy,
        start_year: edu.startYear,
        end_year: edu.endYear
      });
  }

  // 9. Add certifications
  for (const cert of parsed.certifications) {
    await db
      .from('associate_certifications')
      .insert({
        associate_id,
        name: cert.name,
        issuer: cert.issuer,
        issue_date: cert.issueDate,
        expiry_date: cert.expiryDate
      });
  }

  // 10. Add languages
  for (const lang of parsed.languages) {
    await db
      .from('associate_languages')
      .upsert({
        associate_id,
        language: lang.language,
        proficiency: lang.proficiency || 'conversational'
      }, { onConflict: 'associate_id,language' });
  }

  // 11. Update file metadata
  await db
    .from('files')
    .update({
      metadata: { parsed: true, parsedAt: new Date().toISOString(), parsedData: parsed }
    })
    .eq('id', file_id);

  // 12. Enqueue search sync event
  await db.rpc('enqueue_transformation_event', {
    p_type: 'SearchSyncNeeded',
    p_aggregate_type: 'associate',
    p_aggregate_id: associate_id,
    p_payload: { associate_id, action: 'update' }
  });

  console.log(`CV processing completed for associate ${associate_id}`);
}

// ============================================
// HELPER: Extract text from file
// ============================================

async function extractTextFromFile(fileData: Blob, mime: string): Promise<string> {
  // In production, use proper PDF parsing library
  // For now, return placeholder
  if (mime === 'application/pdf') {
    // TODO: Implement PDF text extraction using pdf-parse
    return 'PDF content extracted - implement pdf-parse library';
  }
  
  if (mime.includes('word')) {
    // TODO: Implement Word document extraction using mammoth
    return 'Word document content extracted - implement mammoth library';
  }
  
  return '';
}

// ============================================
// ASSOCIATE SUBMITTED PROCESSOR
// ============================================

async function processAssociateSubmitted(event: EventQueue) {
  const db = getDb();
  const { associate_id } = event.payload as { associate_id: string };
  
  console.log(`Processing associate submission for ${associate_id}`);
  
  // Send notification to admin (email/WhatsApp)
  // TODO: Implement notification service
  
  console.log(`Associate submission processed for ${associate_id}`);
}

// ============================================
// ASSOCIATE APPROVED PROCESSOR
// ============================================

async function processAssociateApproved(event: EventQueue) {
  const db = getDb();
  const { associate_id, approved_by } = event.payload as { associate_id: string; approved_by: string };
  
  console.log(`Processing associate approval for ${associate_id}`);
  
  // Send approval email to associate
  // TODO: Implement email service
  
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
  const { associate_id, rejected_by, reason } = event.payload as {
    associate_id: string;
    rejected_by: string;
    reason?: string;
  };
  
  console.log(`Processing associate rejection for ${associate_id}`);
  
  // Send rejection email to associate with reason
  // TODO: Implement email service
  
  console.log(`Associate rejection processed for ${associate_id}`);
}

// ============================================
// SEARCH SYNC PROCESSOR
// ============================================

async function processSearchSync(event: EventQueue) {
  const db = getDb();
  const { associate_id, action } = event.payload as { associate_id: string; action: string };
  
  console.log(`Processing search sync for associate ${associate_id}`);
  
  // TODO: Implement Meilisearch sync
  // For now, just log the action
  console.log(`Search sync: ${action} for associate ${associate_id}`);
  
  // Log to search_sync_log table
  await db
    .from('search_sync_log')
    .insert({
      entity_type: 'associate',
      entity_id: associate_id,
      action,
      status: 'synced',
      synced_at: new Date().toISOString()
    });
  
  console.log(`Search sync completed for associate ${associate_id}`);
}
