import { createHmac, timingSafeEqual } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { appAssignmentRequestSchema, appAssociateSearchSchema } from '@ams/shared/validators/integration';
import { getDb } from '../../lib/database.js';
import { queueNotificationEmail } from '../../lib/notification-email.js';
import { syncAssignmentAssignee } from '../../lib/app-integration.js';
import type { AppEnv } from '../../types/env.js';

const integration = new Hono<AppEnv>();

function verifySignature(rawBody: string, timestamp: string | undefined, signature: string | undefined) {
  const secret = process.env.APP_INTEGRATION_SECRET;
  if (!secret || !timestamp || !signature || !/^\d{10,13}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const timestampMs = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60_000) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function signedBody(c: Context<AppEnv>) {
  const rawBody = await c.req.text();
  if (!verifySignature(rawBody, c.req.header('x-binahub-timestamp'), c.req.header('x-binahub-signature'))) {
    return { error: c.json({ success: false, error: 'Tanda tangan integrasi tidak valid' }, 401) };
  }
  try {
    return { value: JSON.parse(rawBody) as unknown };
  } catch {
    return { error: c.json({ success: false, error: 'Payload JSON tidak valid' }, 400) };
  }
}

integration.post('/associates/search', async (c) => {
  const body = await signedBody(c);
  if ('error' in body) return body.error;
  const parsed = appAssociateSearchSchema.safeParse(body.value);
  if (!parsed.success) return c.json({ success: false, error: 'Filter associate tidak valid' }, 400);
  const db = getDb();
  const { data: associates, error } = await db
    .from('associates')
    .select('id, email, status, profile:associate_profiles(full_name, headline, roles, expertises), availability:associate_availability(status)')
    .eq('status', 'active')
    .limit(parsed.data.limit);
  if (error) return c.json({ success: false, error: 'Gagal membaca associate' }, 500);

  const keyword = parsed.data.query.toLowerCase();
  const rows = (associates || []).filter((associate: any) => {
    const roles = Array.isArray(associate.profile?.roles) ? associate.profile.roles : [];
    if (parsed.data.role && !roles.some((role: string) => role.toLowerCase().includes(parsed.data.role!.toLowerCase()))) return false;
    if (!keyword) return true;
    return [associate.email, associate.profile?.full_name, associate.profile?.headline, ...roles, ...(associate.profile?.expertises || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(keyword);
  }).map((associate: any) => ({
    id: associate.id,
    email: associate.email,
    fullName: associate.profile?.full_name || associate.email,
    headline: associate.profile?.headline || null,
    roles: associate.profile?.roles || [],
    expertises: associate.profile?.expertises || [],
    availability: associate.availability?.status || null,
  }));
  return c.json({ success: true, data: rows });
});

integration.post('/assignments', async (c) => {
  const body = await signedBody(c);
  if ('error' in body) return body.error;
  const parsed = appAssignmentRequestSchema.safeParse(body.value);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues[0]?.message || 'Assignment tidak valid' }, 400);
  const input = parsed.data;
  const db = getDb();

  const { data: existing } = await db.from('assignments').select('id').eq('source_system', 'app-binahub').eq('external_reference', input.requestId).maybeSingle();
  if (existing) {
    const { data: assignees } = await db.from('assignment_assignees').select('id, associate_id, status, compensation_amount, transport_amount, preparation_amount').eq('assignment_id', existing.id);
    if (!assignees || assignees.length !== new Set(input.associateIds).size) return c.json({ success: false, error: 'Undangan masih disimpan. Periksa kembali beberapa saat lagi.' }, 409);
    const matchesOriginalOffer = assignees.every((assignee) => input.associateIds.includes(assignee.associate_id)
      && Number(assignee.compensation_amount) === input.fee.compensation
      && (assignee.transport_amount === null ? null : Number(assignee.transport_amount)) === (input.fee.transport ?? null)
      && (assignee.preparation_amount === null ? null : Number(assignee.preparation_amount)) === (input.fee.preparation ?? null));
    if (!matchesOriginalOffer) return c.json({ success: false, error: 'Undangan lama memiliki fee berbeda. Batalkan penawaran lama di AMS sebelum membuat yang baru.' }, 409);
    return c.json({ success: true, duplicate: true, data: { assignmentId: existing.id, assignees: assignees || [] } });
  }

  const requestedIds = [...new Set(input.associateIds)];
  const { data: activeAssociates } = await db.from('associates').select('id').in('id', requestedIds).eq('status', 'active');
  if ((activeAssociates || []).length !== requestedIds.length) return c.json({ success: false, error: 'Satu atau lebih associate belum aktif' }, 409);

  const { data: relatedAssignments } = await db
    .from('assignments')
    .select('id')
    .eq('source_system', 'app-binahub')
    .eq('external_program_id', input.program.id)
    .eq('external_module_key', input.program.moduleKey)
    .eq('status', 'active');
  if ((relatedAssignments || []).length > 0) {
    const relatedIds = relatedAssignments!.map((assignment) => assignment.id);
    const { data: existingAssignees } = await db
      .from('assignment_assignees')
      .select('id, assignment_id, associate_id, status, compensation_amount, transport_amount, preparation_amount')
      .in('assignment_id', relatedIds)
      .in('associate_id', requestedIds)
      .not('status', 'in', '(declined,withdrawn)');
    const duplicateAssignment = relatedAssignments!.find((assignment) => {
      const assigned = new Set((existingAssignees || [])
        .filter((assignee) => assignee.assignment_id === assignment.id)
        .map((assignee) => assignee.associate_id));
      return requestedIds.every((associateId) => assigned.has(associateId));
    });
    if (duplicateAssignment) {
      return c.json({ success: false, error: 'Associate ini sudah memiliki penawaran untuk modul yang sama. Periksa fee pada undangan lama di AMS; batalkan dahulu sebelum mengirim penawaran baru.' }, 409);
    }
    if ((existingAssignees || []).length > 0) {
      return c.json({ success: false, error: 'Satu atau lebih associate sudah memiliki penugasan aktif pada modul program ini' }, 409);
    }
  }

  const { data: assignment, error: assignmentError } = await db.from('assignments').insert({
    title: input.program.title,
    client_name: input.program.clientName,
    description: input.description || `Penugasan ${input.role} untuk ${input.program.title}`,
    status: 'active',
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    needed_roles: [input.role],
    needed_count: requestedIds.length,
    source_system: 'app-binahub',
    external_reference: input.requestId,
    external_program_id: input.program.id,
    external_program_url: input.program.url,
    external_module_key: input.program.moduleKey,
    external_scope: input.scope,
    integration_status: 'pending',
  }).select('id').single();
  if (assignmentError || !assignment) return c.json({ success: false, error: 'Gagal membuat assignment AMS' }, 500);

  const { data: assignees, error: assigneeError } = await db.from('assignment_assignees').insert(requestedIds.map((associateId) => ({
    assignment_id: assignment.id,
    associate_id: associateId,
    status: 'invited',
    role: input.role,
    compensation_amount: input.fee.compensation,
    compensation_currency: 'IDR',
    compensation_basis: 'fixed_project',
    transport_amount: input.fee.transport ?? null,
    preparation_amount: input.fee.preparation ?? null,
    invitation_expires_at: input.invitationExpiresAt,
  }))).select('id, associate_id, status');
  if (assigneeError || !assignees) {
    const { error: cleanupError } = await db.from('assignments').delete().eq('id', assignment.id);
    console.error('APP assignment invitation failed', { assignmentId: assignment.id, code: assigneeError?.code, cleanupCode: cleanupError?.code });
    return c.json({ success: false, error: 'Gagal mengundang associate; assignment sementara dibatalkan.' }, 500);
  }

  for (const assignee of assignees) {
    const money = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    const feeLines = [`Kompensasi: ${money(input.fee.compensation)}`];
    if (input.fee.transport !== undefined && input.fee.transport !== null) feeLines.push(`Transportasi: ${money(input.fee.transport)}`);
    if (input.fee.preparation !== undefined && input.fee.preparation !== null) feeLines.push(`Persiapan: ${money(input.fee.preparation)}`);
    feeLines.push(`Total fee: ${money(input.fee.compensation + (input.fee.transport || 0) + (input.fee.preparation || 0))}`);
    const { data: notification } = await db.from('notifications').upsert({
      recipient_id: assignee.associate_id,
      recipient_role: 'associate',
      type: 'invitation',
      title: `Penawaran penugasan: ${input.program.title}`,
      message: `BinaHub menawarkan peran ${input.role} untuk project ${input.program.title}.\n\n${feeLines.join('\n')}\n\nJawab sebelum ${new Date(input.invitationExpiresAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' })} WIB. Periksa lingkup tugas di AMS sebelum menjawab.`,
      link: `/dashboard/assignments/${assignment.id}`,
      reference_id: assignment.id,
    }, { onConflict: 'recipient_id,type,reference_id' }).select('id').single();
    await db.rpc('enqueue_transformation_event', {
      p_type: 'AssignmentAssigneeChanged',
      p_aggregate_type: 'assignment',
      p_aggregate_id: assignment.id,
      p_payload: { assignee_id: assignee.id },
    });
    const [emailResult, syncResult] = await Promise.allSettled([
      notification ? queueNotificationEmail(notification.id, 'assignment-invitation') : Promise.resolve(),
      syncAssignmentAssignee(assignee.id),
    ]);
    if (emailResult.status === 'rejected') console.error('APP assignment invitation email queued after immediate delivery failed', { assigneeId: assignee.id, error: emailResult.reason });
    if (syncResult.status === 'rejected') console.error('Immediate APP assignment sync failed; queued for retry', { assigneeId: assignee.id, error: syncResult.reason });
  }

  return c.json({ success: true, data: { assignmentId: assignment.id, assignees } }, 201);
});

export default integration;
