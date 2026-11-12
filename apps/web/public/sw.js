/* AMS keeps authenticated pages and API responses out of offline caches. */
const DB_NAME = "ams-device-state";
function stateDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("settings");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Device state unavailable"));
  });
}
async function getAccount() {
  const db = await stateDB();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("settings")
        .objectStore("settings")
        .get("account");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
async function setAccount(value) {
  const db = await stateDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").put(value, "account");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
async function updateBadge(count) {
  if ("setAppBadge" in self.navigator) {
    try {
      await (count > 0
        ? self.navigator.setAppBadge(count)
        : self.navigator.clearAppBadge());
    } catch {
      /* OS may disable badges separately. */
    }
  }
}
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("message", (event) => {
  const message = event.data || {};
  event.waitUntil(
    (async () => {
      if (message.type === "BIND_ACCOUNT") await setAccount(message.account);
      if (
        message.type === "UNBIND_ACCOUNT" &&
        (await getAccount()) === message.account
      ) {
        await setAccount(null);
        await updateBadge(0);
        const notices = await self.registration.getNotifications();
        notices.forEach((notice) => notice.close());
      }
      if (
        message.type === "UPDATE_BADGE" &&
        (await getAccount()) === message.account
      )
        await updateBadge(Math.max(0, Number(message.count) || 0));
      event.ports[0]?.postMessage({ ok: true });
    })().catch(() => event.ports[0]?.postMessage({ ok: false })),
  );
});
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data.json();
      } catch {
        return;
      }
      if (
        !payload ||
        !/^[a-f0-9-]{36}$/i.test(payload.id) ||
        !payload.account ||
        (await getAccount()) !== payload.account
      )
        return;
      await Promise.all([
        self.registration.showNotification("BinaHub AMS", {
          body:
            typeof payload.body === "string"
              ? payload.body.slice(0, 180)
              : "Ada pembaruan untuk Anda di AMS.",
          icon: "/icons/ams-192.png",
          badge: "/icons/ams-badge.png",
          tag: `ams-${payload.id}`,
          data: { id: payload.id, account: payload.account },
        }),
        updateBadge(Math.max(0, Number(payload.count) || 0)),
      ]);
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      windows.forEach((client) =>
        client.postMessage({
          type: "NOTIFICATION_RECEIVED",
          account: payload.account,
        }),
      );
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const { id, account } = event.notification.data || {};
      const target = new URL(
        account === (await getAccount()) && /^[a-f0-9-]{36}$/i.test(id)
          ? `/notifications/open?id=${id}`
          : "/auth/login",
        self.location.origin,
      ).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(target);
        await existing.focus();
      } else await self.clients.openWindow(target);
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.mode !== "navigate" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AMS sedang offline</title><body style="font:16px/1.7 system-ui;color:#0b2c6b;background:#f7f9fc;padding:32px;max-width:480px;margin:10vh auto"><h1>Koneksi internet terputus</h1><p>Sambungkan kembali internet untuk melihat undangan, membuka pekerjaan, atau memberikan persetujuan di AMS.</p><button onclick="location.reload()" style="padding:12px 20px;background:#0b2c6b;color:white;border:0;border-radius:8px;font:inherit">Coba lagi</button></body></html>',
          {
            status: 503,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
          },
        ),
    ),
  );
});
