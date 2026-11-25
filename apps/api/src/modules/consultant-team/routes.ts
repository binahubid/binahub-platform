import { Hono } from 'hono';
import { consultantTeamAgreement, activeConsultantMembership } from '@ams/domain';
import { teamAdminSchema, teamQuerySchema, teamResponseSchema } from '@ams/shared/validators/consultant-team';
import { authMiddleware, requireRole } from '../auth/middleware/auth.js';
import { getDb } from '../../lib/database.js';
import { getTeamMembership, syncConsultantMembership, teamErrorMessages } from '../../lib/consultant-team.js';
import { getAssociateIdentity, requestAppAccessLink } from '../../lib/app-integration.js';
import { queueNotificationEmail } from '../../lib/notification-email.js';
import { consultantPortalTargetSchema } from '@ams/shared/validators/notifications';
import type { AppEnv } from '../../types/env.js';

export const teamAdminRoutes = new Hono<AppEnv>();
teamAdminRoutes.use('*', authMiddleware, requireRole(['admin']));
teamAdminRoutes.get('/', async (c) => {
  const parsed = teamQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ success: false, error: 'Pencarian tidak valid.' }, 400);
  const { data, error } = await getDb().rpc('consultant_team_directory', {
    p_page: parsed.data.page, p_search: parsed.data.search, p_status: parsed.data.status,
  });
  if (error) return c.json({ success: false, error: 'Daftar tim belum dapat dimuat. Periksa penyiapan AMS.' }, 503);
  return c.json({ success: true, data: { ...data, defaultAgreement: consultantTeamAgreement } });
});
teamAdminRoutes.get('/candidates', async (c) => {
  const parsed = teamQuerySchema.safeParse({ search: c.req.query('search') || '' });
  if (!parsed.success) return c.json({ success: false, error: 'Pencarian tidak valid.' }, 400);
  const { data, error } = await getDb().rpc('consultant_team_candidates', { p_search: parsed.data.search });
  if (error) return c.json({ success: false, error: 'Daftar associate belum tersedia.' }, 503);
  return c.json({ success: true, data });
});
teamAdminRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^[a-f0-9-]{36}$/i.test(id)) return c.json({ success: false, error: 'Akun tidak valid.' }, 400);
  const db = getDb();
  const [membership, history] = await Promise.all([
    getTeamMembership(id),
    db.from('consultant_team_history').select('id,revision,action,actor_id,snapshot,created_at')
      .eq('associate_id', id).order('revision', { ascending: false }).limit(50),
  ]);
  if (history.error) return c.json({ success: false, error: 'Riwayat belum dapat dimuat.' }, 503);
  if (!membership) return c.json({ success: false, error: 'Keanggotaan tidak ditemukan.' }, 404);
  return c.json({ success: true, data: { membership, history: history.data } });
});
teamAdminRoutes.post('/', async (c) => {
  const parsed = teamAdminSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ success: false, error: 'Periksa akun dan kelengkapan perjanjian.' }, 400);
  const value = parsed.data, db = getDb();
  if (value.action === 'retry_sync') {
    const current = await getTeamMembership(value.associateId);
    if (!current || current.revision !== value.revision)
      return c.json({ success: false, error: teamErrorMessages.TEAM_CONFLICT }, 409);
  } else {
    const { error } = await db.rpc('consultant_team_change', {
      p_actor: c.get('user').id, p_associate: value.associateId,
      p_action: value.action, p_revision: value.revision, p_data: value,
    });
    if (error) {
      const code = /TEAM_[A-Z_]+/.exec(error.message)?.[0] || '';
      return c.json({ success: false, error: teamErrorMessages[code] || 'Perubahan belum tersimpan.' }, code ? 409 : 503);
    }
  }
  const sync = await Promise.allSettled([syncConsultantMembership(value.associateId)]);
  const current = await getTeamMembership(value.associateId);
  if (value.action === 'invite' && current) {
    const { data: notice } = await db.from('notifications').select('id')
      .eq('recipient_id', value.associateId).eq('reference_id', current.invitation_id).maybeSingle();
    if (notice) await queueNotificationEmail(notice.id, 'consultant-team-invitation').catch(() => {});
  }
  return c.json({ success: true, data: current, syncPending: sync[0].status === 'rejected' });
});

export const teamAssociateRoutes = new Hono<AppEnv>();
teamAssociateRoutes.use('*', authMiddleware);
teamAssociateRoutes.get('/', async (c) => {
  const membership = await getTeamMembership(c.get('user').id);
  return c.json({ success: true, data: membership ? { ...membership, sync_error: undefined } : null });
});
teamAssociateRoutes.post('/respond', async (c) => {
  const parsed = teamResponseSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ success: false, error: 'Baca dan setujui perjanjian sebelum melanjutkan.' }, 400);
  const { data, error } = await getDb().rpc('consultant_team_change', {
    p_actor: c.get('user').id, p_associate: c.get('user').id, p_action: parsed.data.action,
    p_revision: parsed.data.revision, p_data: parsed.data,
  });
  if (error) {
    const code = /TEAM_[A-Z_]+/.exec(error.message)?.[0] || '';
    return c.json({ success: false, error: teamErrorMessages[code] || 'Persetujuan belum tersimpan.' }, code ? 409 : 503);
  }
  const sync = await Promise.allSettled([syncConsultantMembership(c.get('user').id)]);
  return c.json({ success: true, data, syncPending: sync[0].status === 'rejected' });
});
teamAssociateRoutes.post('/open', async (c) => {
  const target = consultantPortalTargetSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!target.success) return c.json({ success: false, error: 'Tujuan portal tidak valid.' }, 400);
  const id = c.get('user').id;
  try {
    const [membership, identity] = await Promise.all([
      getTeamMembership(id),
      getAssociateIdentity(id),
    ]);
    if (!membership || !activeConsultantMembership(membership, identity.status))
      return c.json({ success: false, error: 'Keanggotaan konsultan Anda belum aktif. Hubungi admin BinaHub.' }, 403);

    if (membership.sync_status !== 'synced' || membership.synced_revision !== membership.revision) {
      await syncConsultantMembership(id);
    }
    const access = await requestAppAccessLink(identity, target.data.leadId ? `/konsultan/clients/${target.data.leadId}` : '/konsultan');
    return c.json({ success: true, data: { url: access.url } });
  } catch {
    return c.json({ success: false, error: 'Portal belum dapat dibuka. Keanggotaan Anda tetap tersimpan; coba lagi sebentar.' }, 503);
  }
});
