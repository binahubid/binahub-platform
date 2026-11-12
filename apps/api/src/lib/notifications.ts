import { randomUUID } from "node:crypto";
import webpush from "web-push";
import {
  defaultNotificationPreferences,
  isTrustedPushEndpoint,
  notificationCategoryAllowed,
  notificationQuietDelay,
  pushFailureStatus,
  type NotificationPreferences,
} from "@ams/domain";
import { getDb } from "./database.js";
import { postSigned } from "./app-integration.js";

export type Notice = {
  id: string;
  recipient_id: string;
  recipient_role: string;
  title: string;
  type: string;
  category?: string;
  reminder_parent?: string | null;
  link?: string;
  context?: Record<string, unknown>;
};
export class NotificationDeferred extends Error {
  constructor(public seconds: number) {
    super("NOTIFICATION_DEFERRED");
  }
}
export function notificationPushConfig() {
  const publicKey = process.env.AMS_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.AMS_VAPID_PRIVATE_KEY || "";
  return {
    enabled:
      process.env.AMS_PUSH_ENABLED === "true" &&
      (process.env.AMS_NOTIFICATION_WORKER_SECRET?.length || 0) >= 32 &&
      /^[\w-]{87}$/.test(publicKey) &&
      /^[\w-]{43}$/.test(privateKey),
    publicKey,
    privateKey,
  };
}
export async function notificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await getDb()
    .from("notification_preferences")
    .select(
      "agreements,assignments,schedules,reminders,quiet_start,quiet_end,timezone",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("NOTIFICATION_PREFERENCES_UNAVAILABLE");
  return { ...defaultNotificationPreferences, ...data };
}
export async function noticeIsCurrent(notice: Notice) {
  const { data, error } = await getDb().rpc("ams_notice_current", {
    p_id: notice.id,
  });
  if (error) throw new Error("NOTIFICATION_CONTEXT_UNAVAILABLE");
  if (!data) return false;
  if (notice.context?.externalSourceId) {
    const result = await postSigned<{ success: true; current: boolean }>(
      "/api/integrations/ams/notification-context",
      {
        eventId: notice.context.eventId,
        sourceId: notice.context.externalSourceId,
        kind: notice.context.kind,
        version: notice.context.version,
        associateId: notice.recipient_id,
      },
      4500,
    );
    return result.current === true;
  }
  return true;
}
export async function noticeDeliveryDecision(notice: Notice) {
  if (!(await noticeIsCurrent(notice)))
    return { send: false, reason: "SOURCE_CHANGED", wait: 0 };
  const preferences = await notificationPreferences(notice.recipient_id);
  if (
    !notificationCategoryAllowed(
      notice.category || "system",
      Boolean(notice.reminder_parent),
      preferences,
    )
  )
    return { send: false, reason: "PREFERENCE_DISABLED", wait: 0 };
  const urgent =
    notice.context?.status === "cancelled" || notice.context?.testDeviceKey;
  const wait = urgent ? 0 : notificationQuietDelay(preferences, new Date());
  return { send: !wait, reason: wait ? "QUIET_HOURS" : "", wait };
}

export async function processPushNotifications(
  limit = 10,
  notificationId?: string,
) {
  const config = notificationPushConfig();
  if (!config.enabled)
    return {
      state: "not_configured",
      accepted: 0,
      failed: 0,
      deferred: 0,
      skipped: 0,
    };
  webpush.setVapidDetails(
    process.env.AMS_VAPID_SUBJECT || "mailto:admin@binahub.id",
    config.publicKey,
    config.privateKey,
  );
  const db = getDb(),
    lease = randomUUID();
  const claim = {
    p_lease: lease,
    p_limit: limit,
  };
  const { data: deliveries, error } = notificationId
    ? await db.rpc("ams_notification_claim_new", {
        ...claim,
        p_notice: notificationId,
      })
    : await db.rpc("ams_notification_claim", claim);
  if (error) throw new Error("NOTIFICATION_QUEUE_UNAVAILABLE");
  const summary = {
    state: "ok",
    accepted: 0,
    failed: 0,
    deferred: 0,
    skipped: 0,
  };
  const rows = (deliveries || []) as Array<{
    id: string;
    device_id: string;
    notification_id: string;
    attempts: number;
  }>;
  const finish = async (
    row: (typeof rows)[number],
    status: string,
    reason: string | null = null,
    wait = 0,
  ) => {
    const { data, error } = await db.rpc("ams_notification_finish", {
      p_id: row.id,
      p_lease: lease,
      p_status: status,
      p_error: reason,
      p_wait: wait,
    });
    if (error || !data) throw new Error("NOTIFICATION_LEASE_LOST");
  };
  const deliver = async (row: (typeof rows)[number]) => {
    try {
      const [noticeResult, deviceResult] = await Promise.all([
        db
          .from("notifications")
          .select("*")
          .eq("id", row.notification_id)
          .maybeSingle(),
        db
          .from("notification_devices")
          .select("*")
          .eq("id", row.device_id)
          .maybeSingle(),
      ]);
      if (noticeResult.error || deviceResult.error)
        throw new Error("NOTIFICATION_CONTEXT_UNAVAILABLE");
      const notice = noticeResult.data as Notice | null,
        device = deviceResult.data;
      if (
        !notice ||
        !device?.active ||
        notice.recipient_id !== device.user_id ||
        notice.recipient_role !== device.recipient_role
      ) {
        await finish(row, "skipped", "DEVICE_INACTIVE");
        summary.skipped++;
        return;
      }
      const decision = await noticeDeliveryDecision(notice);
      if (!decision.send) {
        await finish(
          row,
          decision.wait ? "pending" : "skipped",
          decision.reason,
          decision.wait,
        );
        if (decision.wait) summary.deferred++;
        else summary.skipped++;
        return;
      }
      if (!isTrustedPushEndpoint(device.endpoint)) {
        await finish(row, "failed", "ENDPOINT_INVALID");
        summary.failed++;
        return;
      }
      const { count, error: countError } = await db
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", notice.recipient_id)
        .eq("recipient_role", notice.recipient_role)
        .is("read_at", null);
      if (countError) throw new Error("NOTIFICATION_COUNT_UNAVAILABLE");
      await webpush.sendNotification(
        {
          endpoint: device.endpoint,
          keys: { p256dh: device.p256dh, auth: device.auth },
        },
        JSON.stringify({
          title: "BinaHub AMS",
          body:
            notice.type === "invitation"
              ? "Anda memiliki undangan baru. Buka AMS untuk meninjaunya."
              : notice.reminder_parent
                ? "Ada undangan atau jadwal yang memerlukan perhatian Anda."
                : notice.context?.testDeviceKey
                  ? "Notifikasi HP Anda sudah terhubung dengan AMS."
                  : "Ada pembaruan pekerjaan untuk Anda. Buka AMS untuk melihatnya.",
          id: notice.id,
          account: notice.recipient_id,
          count: count || 0,
        }),
        {
          TTL: 3600,
          urgency: notice.context?.status === "cancelled" ? "high" : "normal",
          timeout: 5000,
        },
      );
      await finish(row, "accepted");
      summary.accepted++;
    } catch (error) {
      const code =
        typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : undefined;
      const outcome = pushFailureStatus(code, row.attempts);
      if (outcome.disable)
        await db
          .from("notification_devices")
          .update({ active: false })
          .eq("id", row.device_id);
      await finish(row, outcome.status, outcome.code, outcome.wait);
      if (outcome.status === "pending") summary.deferred++;
      else if (outcome.status === "skipped") summary.skipped++;
      else summary.failed++;
    }
  };
  for (let index = 0; index < rows.length; index += 4)
    await Promise.all(rows.slice(index, index + 4).map(deliver));
  if (summary.failed) summary.state = "degraded";
  return summary;
}

export async function runNotificationWorker() {
  if (!notificationPushConfig().enabled) return { state: "not_configured" };
  const db = getDb();
  const { data: run, error: runError } = await db
    .from("notification_worker_runs")
    .insert({})
    .select("id")
    .single();
  if (runError) throw new Error("NOTIFICATION_SETUP_REQUIRED");
  try {
    const { data: reminders, error } = await db.rpc(
      "ams_notification_generate_reminders",
      { p_limit: 30 },
    );
    if (error) throw new Error("NOTIFICATION_REMINDERS_UNAVAILABLE");
    const pushes = await processPushNotifications();
    const summary = { ...pushes, reminders };
    await db
      .from("notification_worker_runs")
      .update({
        finished_at: new Date().toISOString(),
        state: pushes.state,
        summary,
      })
      .eq("id", run.id);
    return summary;
  } catch {
    await db
      .from("notification_worker_runs")
      .update({ finished_at: new Date().toISOString(), state: "error" })
      .eq("id", run.id);
    throw new Error("NOTIFICATION_WORKER_UNAVAILABLE");
  }
}
