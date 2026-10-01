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

async function assignmentInvitationEmail(recipientId: string, assignmentId: string, link: string) {
  const db = getDb();
  const [{ data: assignment }, { data: assignee }, { data: profile }] = await Promise.all([
    db.from('assignments').select('title, client_name, start_date, end_date').eq('id', assignmentId).maybeSingle(),
    db.from('assignment_assignees').select('role, compensation_amount, transport_amount, preparation_amount, invitation_expires_at').eq('assignment_id', assignmentId).eq('associate_id', recipientId).maybeSingle(),
    db.from('associate_profiles').select('full_name').eq('associate_id', recipientId).maybeSingle(),
  ]);
  if (!assignment || !assignee || assignee.compensation_amount === null || Number(assignee.compensation_amount) <= 0) {
    throw new Error('Undangan belum memiliki rincian fee yang valid');
  }
  const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  const items = [
    ['Kompensasi', Number(assignee.compensation_amount)],
    ...(assignee.transport_amount === null ? [] : [['Transportasi', Number(assignee.transport_amount)] as [string, number]]),
    ...(assignee.preparation_amount === null ? [] : [['Persiapan', Number(assignee.preparation_amount)] as [string, number]]),
  ] as Array<[string, number]>;
  const total = items.reduce((sum, [, value]) => sum + value, 0);
  const name = profile?.full_name?.trim() || 'Bapak/Ibu';
  const deadline = assignee.invitation_expires_at
    ? `${new Date(assignee.invitation_expires_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' })} WIB`
    : 'sesuai informasi di AMS';
  const subject = `Penawaran penugasan ${assignee.role || 'Associate'} — ${assignment.title}`;
  const schedule = assignment.start_date
    ? `${new Date(assignment.start_date).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' })}${assignment.end_date && assignment.end_date !== assignment.start_date ? ` – ${new Date(assignment.end_date).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' })}` : ''}`
    : null;
  const details = [`Project: ${assignment.title}`, ...(assignment.client_name ? [`Klien: ${assignment.client_name}`] : []), `Peran: ${assignee.role || 'Associate'}`, ...(schedule ? [`Jadwal: ${schedule}`] : []), `Batas respons: ${deadline}`];
  const text = `Yth. ${name},\n\nBinaHub mengundang Anda untuk mempertimbangkan penugasan berikut. Silakan tinjau ruang lingkup dan perjanjian kerja di AMS sebelum memberi keputusan.\n\n${details.join('\n')}\n\nRincian fee penawaran\n${items.map(([label, value]) => `${label}: ${rupiah(value)}`).join('\n')}\nTotal yang ditawarkan: ${rupiah(total)}\n\nTinjau dan jawab undangan: ${link}\n\nJika ada pertanyaan, balas email ini sebelum menerima penugasan.\n\nSalam hangat,\nBinaHub\nPT Binahub Solusi Transformasi\nwww.binahub.id`;
  const rows = items.map(([label, value]) => `<tr><td style="padding:9px 0;color:#506079">${escapeHtml(label)}</td><td style="padding:9px 0;text-align:right;font-weight:600;color:#142743">${escapeHtml(rupiah(value))}</td></tr>`).join('');
  const html = `<div style="background:#f5f7fa;padding:28px 12px;font-family:Arial,sans-serif;color:#142743"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dce3ec;border-radius:14px;overflow:hidden"><div style="background:#102f68;padding:24px 28px;color:#fff"><div style="font-size:22px;font-weight:700">BinaHub</div><div style="font-size:11px;letter-spacing:.13em;margin-top:4px;color:#dce7fa">PENAWARAN PENUGASAN</div></div><div style="padding:28px"><p style="font-size:15px;margin:0 0 18px">Yth. ${escapeHtml(name)},</p><h1 style="font-size:23px;line-height:1.3;margin:0 0 12px">${escapeHtml(assignment.title)}</h1><p style="font-size:14px;line-height:1.7;color:#506079;margin:0 0 22px">BinaHub mengundang Anda untuk mempertimbangkan penugasan ini. Tinjau ruang lingkup dan perjanjian kerja sebelum memberi keputusan.</p><div style="background:#f6f8fb;border:1px solid #e5eaf1;border-radius:9px;padding:16px;font-size:13px;line-height:1.8"><strong>Peran:</strong> ${escapeHtml(assignee.role || 'Associate')}<br>${assignment.client_name ? `<strong>Klien:</strong> ${escapeHtml(assignment.client_name)}<br>` : ''}${schedule ? `<strong>Jadwal:</strong> ${escapeHtml(schedule)}<br>` : ''}<strong>Batas respons:</strong> ${escapeHtml(deadline)}</div><h2 style="font-size:15px;margin:26px 0 10px">Rincian fee penawaran</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:14px 0;border-top:1px solid #dce3ec;font-weight:700">Total yang ditawarkan</td><td style="padding:14px 0;border-top:1px solid #dce3ec;text-align:right;font-weight:700;color:#102f68">${escapeHtml(rupiah(total))}</td></tr></table><p style="margin:25px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#102f68;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-size:14px;font-weight:700">Tinjau dan jawab undangan</a></p><p style="font-size:12px;line-height:1.6;color:#69788e">Jika ada pertanyaan, balas email ini sebelum menerima penugasan.</p><p style="font-size:13px;line-height:1.7;margin:28px 0 0">Salam hangat,<br><strong>BinaHub</strong><br>PT Binahub Solusi Transformasi</p></div><div style="padding:16px 28px;background:#f6f8fb;border-top:1px solid #e5eaf1;font-size:12px;color:#69788e">www.binahub.id</div></div></div>`;
  return { subject, text, html };
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
    const content = claimed.template_key === 'assignment-invitation' && notification.reference_id && notification.recipient_role === 'associate'
      ? await assignmentInvitationEmail(notification.recipient_id, notification.reference_id, link)
      : {
          subject: notification.title,
          text: `${notification.title}\n\n${notification.message}\n\nBuka BinaHub AMS: ${link}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#10213d"><p style="font-size:12px;color:#8a5b00;letter-spacing:.08em;text-transform:uppercase">BinaHub AMS</p><h1 style="font-size:22px;line-height:1.3">${title}</h1><p style="font-size:15px;line-height:1.7;color:#44536a;white-space:pre-line">${message}</p><p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#0b2c6b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Buka BinaHub AMS</a></p><p style="font-size:13px;color:#718096">Salam hangat,<br><strong>BinaHub</strong></p></div>`,
        };
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
        subject: content.subject,
        text: content.text,
        html: content.html,
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
