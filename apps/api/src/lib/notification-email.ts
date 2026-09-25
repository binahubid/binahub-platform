import { getDb } from './database.js';

export async function getAdminRecipientIds(): Promise<string[]> {
  const db = getDb();
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error('Daftar administrator tidak tersedia');
  return (data.users || [])
    .filter((user) => user.app_metadata?.role === 'admin')
    .map((user) => user.id);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character);
}

export async function queueNotificationEmail(notificationId: string, templateKey: string) {
  const db = getDb();
  const { data: notification } = await db.from('notifications').select('id, recipient_id, recipient_role').eq('id', notificationId).maybeSingle();
  if (!notification) throw new Error('Notifikasi tidak ditemukan');

  let email = '';
  if (notification.recipient_role === 'associate') {
    const { data } = await db.from('associates').select('email').eq('id', notification.recipient_id).maybeSingle();
    email = data?.email || '';
  } else {
    const { data } = await db.auth.admin.getUserById(notification.recipient_id);
    email = data.user?.email || '';
  }
  if (!email) throw new Error('Email penerima notifikasi tidak tersedia');

  const idempotencyKey = `ams-notification/${notificationId}/${templateKey}`;
  const { data: delivery, error } = await db.from('email_notification_deliveries').upsert({
    notification_id: notificationId,
    recipient_email: email.toLowerCase(),
    template_key: templateKey,
    idempotency_key: idempotencyKey,
    status: 'pending',
    available_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'idempotency_key', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) throw new Error('Gagal membuat antrean email notifikasi');
  if (!delivery) return;

  await db.rpc('enqueue_transformation_event', {
    p_type: 'NotificationEmailRequested',
    p_aggregate_type: 'notification',
    p_aggregate_id: notificationId,
    p_payload: { delivery_id: delivery.id },
  });

  // Attempt delivery in the originating request so important notifications do
  // not depend on a scheduler. The queued event remains the durable retry path.
  try {
    await sendQueuedNotificationEmail(delivery.id);
  } catch (error) {
    console.error('Immediate notification email delivery failed; queued for retry', {
      deliveryId: delivery.id,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
}

export async function sendQueuedNotificationEmail(deliveryId: string) {
  const db = getDb();
  const { data: delivery } = await db.from('email_notification_deliveries').select('*').eq('id', deliveryId).maybeSingle();
  if (!delivery || ['sent', 'skipped'].includes(delivery.status)) return;

  if (delivery.status === 'processing') {
    const processingSince = new Date(delivery.updated_at).getTime();
    if (Number.isFinite(processingSince) && Date.now() - processingSince < 10 * 60_000) {
      throw new Error('Pengiriman email masih diproses oleh worker lain');
    }
    await db.from('email_notification_deliveries').update({
      status: 'failed',
      last_error: 'Pengiriman sebelumnya terhenti sebelum selesai',
      updated_at: new Date().toISOString(),
    }).eq('id', deliveryId).eq('status', 'processing');
  }

  const { data: claimed } = await db.from('email_notification_deliveries').update({
    status: 'processing',
    attempts: Number(delivery.attempts || 0) + 1,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', deliveryId).in('status', ['pending', 'failed']).select('*').maybeSingle();
  if (!claimed) return;

  try {
    const { data: notification } = await db.from('notifications').select('*').eq('id', claimed.notification_id).maybeSingle();
    if (!notification) throw new Error('Notifikasi email tidak memiliki sumber');

    let enabled = true;
    if (notification.recipient_role === 'associate') {
      const { data: preferences } = await db.from('associate_preferences').select('email_notifications').eq('associate_id', notification.recipient_id).maybeSingle();
      enabled = preferences?.email_notifications !== false;
    } else {
      const { data: preferences } = await db.from('admin_preferences').select('email_notifications').eq('admin_id', notification.recipient_id).maybeSingle();
      enabled = preferences?.email_notifications !== false;
    }
    if (!enabled) {
      await db.from('email_notification_deliveries').update({ status: 'skipped', updated_at: new Date().toISOString() }).eq('id', deliveryId);
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.NOTIFICATION_EMAIL_FROM || process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error('Konfigurasi email notifikasi belum lengkap');
    const appUrl = (process.env.APP_URL || 'https://ams.binahub.id').replace(/\/$/, '');
    const link = notification.link?.startsWith('/') ? `${appUrl}${notification.link}` : appUrl;
    const title = escapeHtml(notification.title);
    const message = escapeHtml(notification.message);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': claimed.idempotency_key,
      },
      body: JSON.stringify({
        from,
        to: [claimed.recipient_email],
        subject: notification.title,
        text: `${notification.title}\n\n${notification.message}\n\nBuka BinaHub AMS: ${link}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#10213d"><p style="font-size:12px;color:#8a5b00;letter-spacing:.08em;text-transform:uppercase">BinaHub AMS</p><h1 style="font-size:22px;line-height:1.3">${title}</h1><p style="font-size:15px;line-height:1.7;color:#44536a">${message}</p><p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#0b2c6b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Buka BinaHub AMS</a></p><p style="font-size:13px;color:#718096">Salam hangat,<br><strong>BinaHub</strong></p></div>`,
      }),
    });
    const result = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok || !result?.id) throw new Error(result?.message || `Pengiriman email gagal (${response.status})`);

    await db.from('email_notification_deliveries').update({
      status: 'sent',
      provider_message_id: result.id,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', deliveryId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pengiriman email gagal';
    await db.from('email_notification_deliveries').update({
      status: 'failed',
      last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq('id', deliveryId);
    throw error;
  }
}
