export type NotificationPreferences = {
  agreements: boolean;
  assignments: boolean;
  schedules: boolean;
  reminders: boolean;
  quiet_start: number;
  quiet_end: number;
  timezone: string;
};
export const defaultNotificationPreferences: NotificationPreferences = {
  agreements: true,
  assignments: true,
  schedules: true,
  reminders: true,
  quiet_start: 21,
  quiet_end: 7,
  timezone: "Asia/Jakarta",
};

export function notificationCategoryAllowed(
  category: string,
  reminder: boolean,
  preferences: NotificationPreferences,
) {
  if (reminder && !preferences.reminders) return false;
  return (
    !(category in preferences) ||
    preferences[category as "agreements" | "assignments" | "schedules"] !==
      false
  );
}

export function notificationQuietDelay(
  preferences: NotificationPreferences,
  now: Date,
) {
  if (preferences.quiet_start === preferences.quiet_end) return 0;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: preferences.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  const quiet =
    preferences.quiet_start > preferences.quiet_end
      ? hour >= preferences.quiet_start || hour < preferences.quiet_end
      : hour >= preferences.quiet_start && hour < preferences.quiet_end;
  if (!quiet) return 0;
  return Math.max(
    60,
    ((preferences.quiet_end - hour + 24) % 24) * 3600 - minute * 60,
  );
}

export function isTrustedPushEndpoint(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (!url.port || url.port === "443") &&
      (host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host === "push.services.mozilla.com" ||
        host === "web.push.apple.com" ||
        host.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}

export function safeNotificationLink(raw: unknown, role: string) {
  if (
    typeof raw !== "string" ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(raw)
  )
    return null;
  const url = new URL(raw, "https://ams.binahub.id");
  if (url.origin !== "https://ams.binahub.id") return null;
  if (role === "admin")
    return url.pathname === "/admin" || url.pathname.startsWith("/admin/")
      ? url.pathname + url.search
      : null;
  return url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")
    ? url.pathname + url.search
    : null;
}

export function pushFailureStatus(
  statusCode: number | undefined,
  attempts: number,
) {
  if (statusCode === 404 || statusCode === 410)
    return {
      status: "skipped" as const,
      code: "DEVICE_EXPIRED",
      disable: true,
      wait: 0,
    };
  const retry =
    (!statusCode ||
      statusCode === 408 ||
      statusCode === 429 ||
      statusCode >= 500) &&
    attempts < 6;
  return {
    status: retry ? ("pending" as const) : ("failed" as const),
    code: retry ? "PROVIDER_RETRY" : "PROVIDER_REJECTED",
    disable: false,
    wait: retry ? Math.min(3600, 30 * 2 ** attempts) : 0,
  };
}
