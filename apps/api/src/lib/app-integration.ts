import { createHmac, randomUUID } from 'node:crypto';
import { getDb } from './database.js';

type AssociateIdentity = {
  id: string;
  email: string;
  fullName: string;
  status: string;
};

export type AppProgramModule = {
  key: 'tbos' | 'lep';
  label: string;
  defaultRole: string;
  workspaceUrl: string;
};

export type AppProgramCatalogItem = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  modules: AppProgramModule[];
};

type AppProgramCatalogResponse = {
  success: true;
  data: {
    actorProfileId: string;
    actorMode: 'matched_admin' | 'system_admin';
    programs: AppProgramCatalogItem[];
  };
};

const SAFE_REMOTE_ERROR_PREFIXES = [
  'Tanda tangan integrasi',
  'Permintaan integrasi',
  'Payload JSON',
  'Event integrasi',
  'Program atau modul APP',
  'Permintaan katalog program',
  'Gagal membaca program APP',
  'Gagal membaca modul program APP',
  'Gagal memeriksa admin APP',
  'Admin APP pemberi assignment',
  'Admin pemberi assignment',
  'Gagal menyiapkan akun associate',
  'Gagal memeriksa profil APP',
  'Gagal membuat profil associate',
  'Gagal memperbarui profil associate',
  'Gagal menghubungkan identitas AMS dan APP',
  'Gagal menyinkronkan penugasan program',
  'Gagal mengaktifkan akses fasilitator T-BOS',
  'Gagal menghubungkan assignment fasilitator T-BOS',
  'Gagal mencabut akses fasilitator T-BOS',
  'Gagal menambahkan pembicara LEP',
  'Gagal memperbarui pembicara LEP',
  'Gagal menonaktifkan pembicara LEP',
] as const;

function safeRemoteError(message: string | undefined, status: number): string {
  if (message && SAFE_REMOTE_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix))) return message;
  if (status === 401 || status === 403) return 'Secret integrasi AMS dan APP tidak sama atau request sudah kedaluwarsa.';
  if (status === 404) return 'Endpoint integrasi APP belum tersedia pada deployment aktif.';
  if (status === 409) return 'Event integrasi APP masih diproses. Tunggu sebentar lalu coba sinkronkan kembali.';
  if (status >= 500) return 'APP belum dapat memproses assignment. Periksa migration dan log API APP.';
  return `APP menolak sinkronisasi dengan HTTP ${status}.`;
}

function integrationConfig() {
  const baseUrl = (process.env.APP_INTEGRATION_API_URL || 'https://api.binahub.id').replace(/\/$/, '');
  const secret = process.env.APP_INTEGRATION_SECRET;
  if (!secret) throw new Error('APP_INTEGRATION_SECRET belum dikonfigurasi');
  return { baseUrl, secret };
}

export function normalizeIntegrationTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return new Date().toISOString();
  const trimmed = value.trim();
  const timezoneAware = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const parsed = new Date(timezoneAware ? trimmed : `${trimmed}Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

async function postSigned<T>(path: string, payload: unknown): Promise<T> {
  const { baseUrl, secret } = integrationConfig();
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-binahub-timestamp': timestamp,
        'x-binahub-signature': signature,
      },
      body,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null) as (T & { success?: boolean; error?: string }) | null;
    if (!response.ok || !result?.success) throw new Error(safeRemoteError(result?.error, response.status));
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAssociateIdentity(associateId: string): Promise<AssociateIdentity> {
  const db = getDb();
  const [{ data: associate }, { data: profile }] = await Promise.all([
    db.from('associates').select('id, email, status').eq('id', associateId).maybeSingle(),
    db.from('associate_profiles').select('full_name').eq('associate_id', associateId).maybeSingle(),
  ]);
  if (!associate?.email || !profile?.full_name) throw new Error('Identitas associate tidak lengkap');
  return { id: associate.id, email: associate.email, fullName: profile.full_name, status: associate.status };
}

export async function syncAssociateIdentity(associateId: string, eventId: string = randomUUID()) {
  const associate = await getAssociateIdentity(associateId);
  return postSigned('/api/integrations/ams/assignments', {
    eventId,
    eventType: 'identity.synced',
    occurredAt: new Date().toISOString(),
    associate,
  });
}

export async function syncAssignmentAssignee(assigneeId: string, eventId: string = randomUUID()) {
  const db = getDb();
  const { data: assignee } = await db
    .from('assignment_assignees')
    .select('id, assignment_id, associate_id, status, role, updated_at')
    .eq('id', assigneeId)
    .maybeSingle();
  if (!assignee) throw new Error('Assignee tidak ditemukan');

  const { data: assignment } = await db
    .from('assignments')
    .select('id, external_program_id, external_module_key, external_scope')
    .eq('id', assignee.assignment_id)
    .maybeSingle();
  if (!assignment) throw new Error('Assignment tidak ditemukan');
  if (!assignment.external_program_id || !assignment.external_module_key) {
    return { success: true, skipped: true, reason: 'assignment_not_linked' };
  }
  const associate = await getAssociateIdentity(assignee.associate_id);

  await db.from('assignments').update({
    integration_status: 'pending',
    updated_at: new Date().toISOString(),
  }).eq('id', assignment.id);

  try {
    const result = await postSigned('/api/integrations/ams/assignments', {
      eventId,
      eventType: 'assignment.changed',
      occurredAt: normalizeIntegrationTimestamp(assignee.updated_at),
      associate,
      assignment: {
        id: assignment.id,
        assigneeId: assignee.id,
        status: assignee.status,
        role: assignee.role || (assignment.external_module_key === 'lep' ? 'Pembicara LEP' : 'Fasilitator T-BOS'),
        externalProgramId: assignment.external_program_id,
        moduleKey: assignment.external_module_key,
        scope: assignment.external_scope || {},
      },
    });

    await db.from('assignments').update({
      integration_status: 'synced',
      updated_at: new Date().toISOString(),
    }).eq('id', assignment.id);
    return result;
  } catch (error) {
    await db.from('assignments').update({
      integration_status: 'failed',
      updated_at: new Date().toISOString(),
    }).eq('id', assignment.id);
    throw error;
  }
}

export async function listAppPrograms(requesterEmail: string) {
  return postSigned<AppProgramCatalogResponse>('/api/integrations/ams/programs', {
    requesterEmail: requesterEmail.trim().toLowerCase(),
  });
}

export async function requestAppAccessLink(associateId: string, nextPath?: string) {
  const associate = await getAssociateIdentity(associateId);
  return postSigned<{ success: true; url: string; expiresAt: string }>('/api/integrations/ams/access-link', {
    associate,
    nextPath,
  });
}
