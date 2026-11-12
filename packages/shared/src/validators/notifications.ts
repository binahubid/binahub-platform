import { z } from "zod";

const base64url = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const notificationDeviceSchema = z
  .object({
    deviceKey: z.uuid(),
    label: z.string().trim().min(1).max(80),
    subscription: z
      .object({
        endpoint: z.url().max(2048),
        keys: z
          .object({
            p256dh: base64url.length(87),
            auth: base64url.length(22),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();
export const notificationDeviceKeySchema = z
  .object({ deviceKey: z.uuid() })
  .strict();
export const notificationPreferencesSchema = z
  .object({
    agreements: z.boolean(),
    assignments: z.boolean(),
    schedules: z.boolean(),
    reminders: z.boolean(),
    quiet_start: z.number().int().min(0).max(23),
    quiet_end: z.number().int().min(0).max(23),
    timezone: z
      .string()
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Pilih zona waktu yang valid."),
  })
  .strict();
export const notificationFeedSchema = z.object({
  filter: z.enum(["all", "unread", "action"]).default("all"),
  page: z.coerce.number().int().min(0).max(10000).default(0),
});
export const consultantNoticeSchema = z
  .object({
    eventId: z.uuid(),
    sourceId: z.uuid(),
    leadId: z.uuid(),
    kind: z.enum(["assignment", "schedule", "task"]),
    version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    active: z.boolean(),
    associateId: z.uuid().nullable(),
    membershipId: z.uuid().nullable(),
    status: z.string().max(32),
    startAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.active && (!value.associateId || !value.membershipId))
      ctx.addIssue({
        code: "custom",
        message: "Penerima aktif wajib tersedia.",
      });
  });
export const notificationOpenSchema = z.object({ id: z.uuid() }).strict();
export const consultantPortalTargetSchema = z
  .object({ leadId: z.uuid().optional() })
  .strict();
