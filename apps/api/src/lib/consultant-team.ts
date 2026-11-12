import { getDb } from './database.js';
import { getAssociateIdentity, postSigned } from './app-integration.js';

export type TeamMembership = {
  associate_id: string; membership_id: string; invitation_id: string;
  status: string; revision: number; agreement_text: string; compensation_terms: string;
  agreement_hash: string; accepted_at: string | null; invited_at: string; updated_at: string;
  sync_status: string; synced_revision: number | null;
};

export async function getTeamMembership(associateId: string): Promise<TeamMembership | null> {
  const { data, error } = await getDb().from('consultant_team_memberships')
    .select('*').eq('associate_id', associateId).maybeSingle();
  if (error) throw new Error('TEAM_UNAVAILABLE');
  return data;
}

export async function syncConsultantMembership(associateId: string) {
  const db = getDb();
  const membership = await getTeamMembership(associateId);
  if (!membership) return { success: true, skipped: true };
  try {
    const associate = await getAssociateIdentity(associateId);
    await postSigned('/api/integrations/ams/consultant-team', {
      associate,
      membership: {
        id: membership.membership_id, revision: membership.revision, status: membership.status,
        acceptedAt: membership.accepted_at, agreementHash: membership.agreement_hash,
        changedAt: membership.updated_at,
      },
    });
    await db.from('consultant_team_memberships').update({
      sync_status: 'synced', synced_revision: membership.revision, sync_error: null,
    }).eq('associate_id', associateId).eq('revision', membership.revision);
    return { success: true };
  } catch (error) {
    await db.from('consultant_team_memberships').update({
      sync_status: 'failed', sync_error: 'Portal belum dapat diperbarui. Coba sinkronkan kembali.',
    }).eq('associate_id', associateId).eq('revision', membership.revision);
    throw error;
  }
}

export const teamErrorMessages: Record<string, string> = {
  TEAM_FORBIDDEN: 'Anda tidak memiliki akses untuk tindakan ini.',
  TEAM_ADMIN_REQUIRED: 'Tindakan ini hanya dapat dilakukan admin.',
  TEAM_NOT_FOUND: 'Keanggotaan tidak ditemukan.',
  TEAM_CONFLICT: 'Data telah berubah. Muat ulang sebelum melanjutkan.',
  TEAM_ALREADY_INVITED: 'Associate ini sudah aktif atau masih memiliki undangan.',
  TEAM_ASSOCIATE_INACTIVE: 'Akun associate harus berstatus aktif di AMS.',
  TEAM_AGREEMENT_REQUIRED: 'Tinjau dan setujui ketentuan kerja sama yang berlaku.',
  TEAM_INVALID_TRANSITION: 'Perubahan status ini tidak tersedia. Muat ulang data terbaru.',
};
