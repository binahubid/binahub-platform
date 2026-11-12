import { Hono } from "hono";
import { z } from "zod";
import { isTrustedPushEndpoint, safeNotificationLink } from "@ams/domain";
import {
  notificationDeviceSchema,
  notificationDeviceKeySchema,
  notificationFeedSchema,
  notificationPreferencesSchema,
  notificationOpenSchema,
} from "@ams/shared/validators/notifications";
import { authMiddleware, requireRole } from "../auth/middleware/auth.js";
import { getDb } from "../../lib/database.js";
import {
  noticeIsCurrent,
  notificationPreferences,
  notificationPushConfig,
  type Notice,
} from "../../lib/notifications.js";
import type { AppEnv } from "../../types/env.js";

export const notificationRoutes = new Hono<AppEnv>();
notificationRoutes.use("*", authMiddleware);
notificationRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
const roleFor = (role: string) => (role === "admin" ? "admin" : "associate");

notificationRoutes.get("/config", (c) => {
  const config = notificationPushConfig();
  return c.json({
    success: true,
    data: {
      enabled: config.enabled,
      publicKey: config.enabled ? config.publicKey : "",
    },
  });
});
notificationRoutes.get("/devices", async (c) => {
  const { data, error } = await getDb()
    .from("notification_devices")
    .select("id,device_key,label,active,last_seen_at,created_at")
    .eq("user_id", c.get("user").id)
    .order("last_seen_at", { ascending: false })
    .limit(20);
  if (error)
    return c.json(
      { success: false, error: "Pengaturan notifikasi HP sedang disiapkan." },
      503,
    );
  return c.json({ success: true, data });
});
notificationRoutes.post("/devices", async (c) => {
  if (!notificationPushConfig().enabled)
    return c.json(
      {
        success: false,
        error:
          "Notifikasi HP sedang disiapkan. Coba lagi setelah admin mengaktifkannya.",
      },
      503,
    );
  const parsed = notificationDeviceSchema.safeParse(await c.req.json());
  if (
    !parsed.success ||
    !isTrustedPushEndpoint(parsed.data.subscription.endpoint) ||
    Buffer.from(parsed.data.subscription.keys.p256dh, "base64url")[0] !== 4
  )
    return c.json(
      {
        success: false,
        error:
          "Perangkat belum dapat didaftarkan. Aktifkan kembali notifikasi dari browser Anda.",
      },
      400,
    );
  const user = c.get("user"),
    input = parsed.data;
  const { data, error } = await getDb().rpc("ams_notification_device", {
    p_user: user.id,
    p_role: roleFor(user.role),
    p_key: input.deviceKey,
    p_label: input.label,
    p_endpoint: input.subscription.endpoint,
    p_p256dh: input.subscription.keys.p256dh,
    p_auth: input.subscription.keys.auth,
  });
  if (error)
    return c.json(
      {
        success: false,
        error:
          "Langganan perangkat perlu diperbarui. Nonaktifkan lalu aktifkan kembali notifikasi.",
        code: "DEVICE_RENEW_REQUIRED",
      },
      409,
    );
  return c.json({ success: true, data: { id: data } });
});
notificationRoutes.delete("/devices/:key", async (c) => {
  const parsed = z.uuid().safeParse(c.req.param("key"));
  if (!parsed.success)
    return c.json({ success: false, error: "Perangkat tidak valid." }, 400);
  const { error } = await getDb()
    .from("notification_devices")
    .update({ active: false })
    .eq("user_id", c.get("user").id)
    .eq("device_key", parsed.data);
  if (error)
    return c.json(
      {
        success: false,
        error: "Pengaturan perangkat belum tersimpan. Coba lagi.",
      },
      503,
    );
  return c.json({ success: true });
});
notificationRoutes.get("/preferences", async (c) =>
  c.json({
    success: true,
    data: await notificationPreferences(c.get("user").id),
  }),
);
notificationRoutes.put("/preferences", async (c) => {
  const parsed = notificationPreferencesSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      {
        success: false,
        error: "Periksa jam tenang dan pilihan notifikasi Anda.",
      },
      400,
    );
  const { error } = await getDb()
    .from("notification_preferences")
    .upsert({
      user_id: c.get("user").id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });
  if (error)
    return c.json(
      {
        success: false,
        error: "Pilihan notifikasi belum tersimpan. Coba lagi.",
      },
      503,
    );
  return c.json({ success: true, data: parsed.data });
});
notificationRoutes.post("/test", async (c) => {
  if (!notificationPushConfig().enabled)
    return c.json({ success: false, error: "Notifikasi HP belum aktif." }, 503);
  const parsed = notificationDeviceKeySchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json({ success: false, error: "Perangkat tidak valid." }, 400);
  const user = c.get("user");
  const { data, error } = await getDb().rpc("ams_notification_test", {
    p_user: user.id,
    p_role: roleFor(user.role),
    p_key: parsed.data.deviceKey,
  });
  if (error)
    return c.json(
      {
        success: false,
        error:
          "Aktifkan notifikasi perangkat ini, lalu tunggu satu menit sebelum menguji kembali.",
      },
      409,
    );
  return c.json({
    success: true,
    data: {
      id: data,
      message:
        "Notifikasi uji masuk antrean. Biasanya diproses pada putaran worker berikutnya.",
    },
  });
});
notificationRoutes.get("/", async (c) => {
  const parsed = notificationFeedSchema.safeParse(c.req.query());
  if (!parsed.success)
    return c.json(
      { success: false, error: "Pilihan daftar tidak valid." },
      400,
    );
  const user = c.get("user");
  const { data, error } = await getDb().rpc("ams_notification_feed", {
    p_user: user.id,
    p_role: roleFor(user.role),
    p_filter: parsed.data.filter,
    p_page: parsed.data.page,
  });
  if (error)
    return c.json(
      {
        success: false,
        error: "Notifikasi belum dapat dimuat. Coba lagi sebentar.",
      },
      503,
    );
  return c.json({ success: true, data });
});
notificationRoutes.post("/read", async (c) => {
  const parsed = z
    .object({ ids: z.array(z.uuid()).min(1).max(30) })
    .strict()
    .safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      {
        success: false,
        error: "Pilih pemberitahuan yang ingin ditandai dibaca.",
      },
      400,
    );
  const user = c.get("user");
  const { error } = await getDb()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("recipient_role", roleFor(user.role))
    .is("read_at", null)
    .in("id", parsed.data.ids);
  if (error)
    return c.json(
      { success: false, error: "Status baca belum tersimpan." },
      503,
    );
  return c.json({ success: true });
});
notificationRoutes.post("/open", async (c) => {
  const parsed = notificationOpenSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json({ success: false, error: "Pemberitahuan tidak valid." }, 400);
  const user = c.get("user"),
    db = getDb(),
    role = roleFor(user.role);
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("id", parsed.data.id)
    .eq("recipient_id", user.id)
    .eq("recipient_role", role)
    .maybeSingle();
  if (error)
    return c.json(
      { success: false, error: "Pemberitahuan belum dapat dibuka." },
      503,
    );
  if (!data)
    return c.json(
      { success: false, error: "Pemberitahuan tidak ditemukan pada akun ini." },
      404,
    );
  if (!(await noticeIsCurrent(data as Notice)))
    return c.json(
      {
        success: false,
        error:
          "Pemberitahuan ini sudah berubah atau selesai. Periksa daftar pekerjaan terbaru.",
      },
      409,
    );
  const url =
    safeNotificationLink(data.link, role) ||
    (role === "admin" ? "/admin/notifications" : "/dashboard/notifications");
  const result = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("recipient_id", user.id);
  if (result.error)
    return c.json(
      { success: false, error: "Status pemberitahuan belum tersimpan." },
      503,
    );
  return c.json({ success: true, data: { url } });
});
notificationRoutes.get("/operations", requireRole(["admin"]), async (c) => {
  const page = z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .safeParse(c.req.query("page") || 0);
  if (!page.success)
    return c.json({ success: false, error: "Halaman tidak valid." }, 400);
  const { data, error } = await getDb().rpc("ams_notification_operations", {
    p_page: page.data,
  });
  if (error)
    return c.json(
      { success: false, error: "Pemantauan notifikasi sedang disiapkan." },
      503,
    );
  return c.json({
    success: true,
    data: { ...data, pushEnabled: notificationPushConfig().enabled },
  });
});
notificationRoutes.post("/retry", requireRole(["admin"]), async (c) => {
  const parsed = z
    .object({ id: z.uuid(), channel: z.enum(["push", "email"]) })
    .strict()
    .safeParse(await c.req.json());
  if (!parsed.success)
    return c.json({ success: false, error: "Pengiriman tidak valid." }, 400);
  const { data, error } = await getDb().rpc("ams_notification_retry", {
    p_actor: c.get("user").id,
    p_id: parsed.data.id,
    p_channel: parsed.data.channel,
  });
  if (error)
    return c.json(
      {
        success: false,
        error:
          "Pengiriman sudah berubah atau tidak perlu diulang. Perbarui daftar.",
      },
      409,
    );
  return c.json({ success: true, data });
});
