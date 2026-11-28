import { Hono, type Context } from 'hono';
import {
  referralFilters, referralFollowUp, referralReview, referralSettings,
  type ReferralDashboardData,
} from '@ams/shared/validators/referrals';
import { postSigned } from '../../lib/app-integration.js';
import { getDb } from '../../lib/database.js';
import { authMiddleware, requireRole } from '../auth/middleware/auth.js';
import type { AppEnv } from '../../types/env.js';

const integrationPath = '/api/integrations/ams/referrals';
const errors: Record<string, [400 | 404 | 409, string]> = {
  REFERRAL_INVALID: [400, 'Periksa kembali isian referral.'],
  REFERRAL_NOT_FOUND: [404, 'Referral ini tidak tersedia.'],
  REFERRAL_CHANGED: [409, 'Referral sudah berubah. Muat ulang sebelum menyimpan.'],
  REFERRAL_CODE_CHANGED: [409, 'Kode sudah berubah. Muat ulang sebelum menyimpan.'],
  REFERRAL_CODE_INVALID: [400, 'Gunakan kode milik Associate aktif.'],
  REFERRAL_SELF: [400, 'Associate tidak dapat merujuk dirinya sendiri.'],
  REFERRAL_CONSENT_REQUIRED: [409, 'Catatan kontak memerlukan izin calon klien. Anda dapat meminta bantuan admin.'],
};

async function signedReferral(c: Context<AppEnv>, payload: Record<string, unknown>) {
  try {
    const result = await postSigned<{ success: true; data?: unknown; errorCode?: string }>(integrationPath, payload);
    if (result.errorCode) {
      const [status, error] = errors[result.errorCode] || errors.REFERRAL_INVALID;
      return c.json({ success: false, code: result.errorCode, error }, status);
    }
    return c.json({ success: true, data: result.data ?? null });
  } catch {
    return c.json({ success: false, error: 'Referral belum dapat diakses. Coba lagi sebentar.' }, 503);
  }
}

export const associateReferralRoutes = new Hono<AppEnv>();
associateReferralRoutes.use('*', authMiddleware, requireRole(['associate']), async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  const { data, error } = await getDb().from('associates').select('status').eq('id', c.get('user').id).maybeSingle();
  if (error) return c.json({ success: false, error: 'Status akun belum dapat dibaca.' }, 503);
  if (data?.status !== 'active') return c.json({ success: false, code: 'REFERRAL_INACTIVE', error: 'Referral tersedia untuk Associate aktif.' }, 403);
  await next();
});

associateReferralRoutes.get('/', (c) => {
  const params = referralFilters.safeParse(c.req.query());
  if (!params.success) return c.json({ success: false, error: 'Filter referral tidak valid.' }, 400);
  const { status, source, page } = params.data;
  return signedReferral(c, { action: 'list', associateId: c.get('user').id, status, source, page });
});
associateReferralRoutes.get('/code', (c) => signedReferral(c, {
  action: 'settings', associateId: c.get('user').id, email: c.get('user').email, operation: 'load',
}));
associateReferralRoutes.post('/code', (c) =>
  c.json({ success: false, error: 'Hubungi Admin untuk mengatur kode referral.' }, 403));
associateReferralRoutes.post('/follow-up', async (c) => {
  const input = referralFollowUp.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ success: false, error: 'Isi catatan, atur tanggal cek kembali, atau minta bantuan.' }, 400);
  return signedReferral(c, { action: 'follow_up', associateId: c.get('user').id, ...input.data });
});

export const adminReferralRoutes = new Hono<AppEnv>();
adminReferralRoutes.use('*', authMiddleware, requireRole(['admin']), async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});

adminReferralRoutes.get('/', async (c) => {
  const params = referralFilters.safeParse(c.req.query());
  if (!params.success) return c.json({ success: false, error: 'Filter referral tidak valid.' }, 400);
  try {
    const { data } = await postSigned<{ success: true; data: ReferralDashboardData }>(integrationPath, {
      action: 'admin_list', adminId: c.get('user').id, ...params.data,
    });
    const associates = data.associates || [];
    const db = getDb();
    const batches = Array.from({ length: Math.ceil(associates.length / 75) }, (_, index) =>
      associates.slice(index * 75, index * 75 + 75).map((row) => row.id));
    const directories = await Promise.all(batches.map((ids) => db.from('associates')
      .select('id,status,profile:associate_profiles(full_name)').in('id', ids)));
    if (directories.some((result) => result.error)) throw new Error('Directory unavailable');
    const directory = new Map(directories.flatMap(({ data: members }) => (members || []).map((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      return [row.id, { name: profile?.full_name || null, active: row.status === 'active' }] as const;
    })));
    return c.json({ success: true, data: {
      ...data, associates: associates.map((row) => ({ ...row, name: null, active: false, ...directory.get(row.id) })),
    } });
  } catch {
    return c.json({ success: false, error: 'Referral belum dapat diakses. Coba lagi sebentar.' }, 503);
  }
});

adminReferralRoutes.post('/review', async (c) => {
  const input = referralReview.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ success: false, error: 'Lengkapi kode dan alasan keputusan referral.' }, 400);
  return signedReferral(c, { action: 'admin_review', adminId: c.get('user').id, ...input.data });
});

adminReferralRoutes.post('/code', async (c) => {
  const input = referralSettings.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ success: false, error: 'Periksa kembali kode konfirmasi.' }, 400);
  const { data, error } = await getDb().from('associates').select('email').eq('id', input.data.associateId).maybeSingle();
  if (error) return c.json({ success: false, error: 'Referral belum dapat diakses. Coba lagi sebentar.' }, 503);
  if (!data?.email) return c.json({ success: false, error: 'Referral ini tidak tersedia.' }, 404);
  return signedReferral(c, {
    action: 'admin_settings', adminId: c.get('user').id, email: data.email, ...input.data,
  });
});
