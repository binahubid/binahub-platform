export const notificationApi =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export class NotificationRequestError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export async function notificationRequest<T>(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${notificationApi}/api/notifications${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: signal || AbortSignal.timeout(10000),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success)
    throw new NotificationRequestError(
      result.error ||
        "AMS belum dapat dihubungi. Periksa koneksi lalu coba lagi.",
      result.code,
    );
  return result.data as T;
}
export function deviceKey() {
  let key = localStorage.getItem("ams_notification_device");
  if (!key || !/^[a-f0-9-]{36}$/i.test(key)) {
    key = crypto.randomUUID();
    localStorage.setItem("ams_notification_device", key);
  }
  return key;
}
export async function messageWorker(
  message: Record<string, unknown>,
  registration?: ServiceWorkerRegistration,
) {
  if (!("serviceWorker" in navigator)) return;
  const reg =
    registration || (await navigator.serviceWorker.getRegistration("/"));
  const worker = reg?.active || reg?.waiting || reg?.installing;
  if (!worker) return;
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error("Pengaturan perangkat belum siap. Muat ulang AMS."));
    }, 2000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data?.ok) resolve();
      else reject(new Error("Pengaturan perangkat belum dapat disimpan."));
    };
    worker.postMessage(message, [channel.port2]);
  });
}
export async function releaseNotificationDevice(
  token: string | null,
  account: string,
) {
  if (localStorage.getItem("ams_notification_account") !== account) return;
  localStorage.removeItem("ams_notification_account");
  await messageWorker({ type: "UNBIND_ACCOUNT", account }).catch(() => {});
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    await (
      await registration?.pushManager?.getSubscription()
    )
      ?.unsubscribe()
      .catch(() => false);
  }
  const key = localStorage.getItem("ams_notification_device");
  if (token && key)
    await notificationRequest(
      token,
      `/devices/${key}`,
      "DELETE",
      undefined,
      AbortSignal.timeout(2500),
    ).catch(() => {});
}
export async function bindNotificationAccount(
  account: string,
  registration: ServiceWorkerRegistration,
) {
  const stored = localStorage.getItem("ams_notification_account");
  if (stored && stored !== account)
    await releaseNotificationDevice(null, stored);
  await messageWorker({ type: "BIND_ACCOUNT", account }, registration);
  localStorage.setItem("ams_notification_account", account);
}
export function notificationLoginReturn() {
  const path = sessionStorage.getItem("ams_notification_return");
  sessionStorage.removeItem("ams_notification_return");
  return path && /^\/notifications\/open\?id=[a-f0-9-]{36}$/i.test(path)
    ? path
    : null;
}
