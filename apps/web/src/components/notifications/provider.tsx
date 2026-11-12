"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  bindNotificationAccount,
  deviceKey,
  messageWorker,
  notificationApi,
  notificationRequest,
  NotificationRequestError,
  releaseNotificationDevice,
} from "@/lib/notification-client";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export type NotificationDevice = {
  id: string;
  device_key: string;
  label: string;
  active: boolean;
  last_seen_at: string;
};
type State = {
  installed: boolean;
  ios: boolean;
  supported: boolean;
  canInstall: boolean;
  permission: NotificationPermission | "unsupported";
  configured: boolean;
  subscribed: boolean;
  checking: boolean;
  busy: boolean;
  error: string;
  message: string;
  unread: number;
  devices: NotificationDevice[];
  install: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  test: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  removeDevice: (key: string) => Promise<void>;
};
const Context = createContext<State | null>(null);
function applicationKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(
    atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    (char) => char.charCodeAt(0),
  );
}
export function AmsNotificationProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, loading } = useAuth();
  const account = user?.id;
  const role = user?.app_metadata?.role === "admin" ? "admin" : "associate";
  const [installed, setInstalled] = useState(false),
    [ios, setIos] = useState(false),
    [supported, setSupported] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [permission, setPermission] =
    useState<State["permission"]>("unsupported");
  const [config, setConfig] = useState({ enabled: false, publicKey: "" });
  const [subscribed, setSubscribed] = useState(false),
    [devices, setDevices] = useState<NotificationDevice[]>([]);
  const [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [unread, setUnread] = useState(0);
  const previous = useRef<{ account: string; token: string | null } | null>(
    null,
  );
  const accountTransition = useRef<Promise<void>>(Promise.resolve());
  const registration = useRef<Promise<ServiceWorkerRegistration | null> | null>(
    null,
  );
  const registeredWorker = useRef<ServiceWorkerRegistration | null>(null);
  const currentSubscription = useRef<PushSubscription | null>(null);
  useEffect(() => {
    setInstalled(
      matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    setIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    setSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
    if ("Notification" in window) setPermission(Notification.permission);
    if ("serviceWorker" in navigator) {
      registration.current = navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then(async (reg) => {
          const ready = reg.active
            ? reg
            : await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<null>((resolve) =>
                  setTimeout(() => resolve(null), 5000),
                ),
              ]);
          registeredWorker.current = ready;
          return ready;
        })
        .catch(() => null);
    }
    const onInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const installed = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  const refreshUnread = useCallback(async () => {
    if (!accessToken || !account) return;
    try {
      const response = await fetch(
        notificationApi + "/api/" + role + "/notifications/count",
        {
          headers: { Authorization: "Bearer " + accessToken },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        },
      );
      const result = await response.json();
      if (
        !response.ok ||
        !result.success ||
        previous.current?.account !== account
      )
        return;
      const count = Number(result.data.count) || 0;
      setUnread(count);
      await messageWorker({ type: "UPDATE_BADGE", account, count });
    } catch {
      /* The notification page exposes connection errors with a retry. */
    }
  }, [accessToken, account, role]);
  const refresh = useCallback(async () => {
    if (!accessToken) {
      setChecking(false);
      return;
    }
    setChecking(true);
    setError("");
    try {
      const [config, devices] = await Promise.all([
        notificationRequest<{ enabled: boolean; publicKey: string }>(
          accessToken,
          "/config",
        ),
        notificationRequest<NotificationDevice[]>(accessToken, "/devices"),
      ]);
      if (previous.current?.account !== account) return;
      setConfig(config);
      setDevices(devices);
      const reg = await registration.current;
      const sub = await reg?.pushManager?.getSubscription();
      currentSubscription.current = sub || null;
      setSubscribed(
        Boolean(
          sub &&
          devices.some(
            (device) => device.active && device.device_key === deviceKey(),
          ),
        ),
      );
      if ("Notification" in window) setPermission(Notification.permission);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Pengaturan belum dapat dimuat.",
      );
    } finally {
      setChecking(false);
    }
  }, [accessToken, account]);
  useEffect(() => {
    if (loading) return;
    const old = previous.current;
    previous.current = account ? { account, token: accessToken } : null;
    if (old?.account !== account) {
      setDevices([]);
      setSubscribed(false);
      setUnread(0);
    }
    let active = true;
    accountTransition.current = accountTransition.current
      .catch(() => {})
      .then(async () => {
        if (!active) return;
        const stored = localStorage.getItem("ams_notification_account");
        if (stored && stored !== account)
          await releaseNotificationDevice(
            old?.account === stored ? old.token : null,
            stored,
          );
        if (!active || !account) return;
        const reg = await registration.current;
        if (reg && active) await bindNotificationAccount(account, reg);
        if (active) await Promise.allSettled([refresh(), refreshUnread()]);
      })
      .catch(() => {
        if (active && account) void refresh();
      });
    return () => {
      active = false;
    };
  }, [account, accessToken, loading, refresh, refreshUnread]);
  useEffect(() => {
    if (!accessToken) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") {
        if ("Notification" in window) setPermission(Notification.permission);
        void refreshUnread();
      }
    };
    const incoming = (event: MessageEvent) => {
      if (
        event.data?.type === "NOTIFICATION_RECEIVED" &&
        event.data.account === account
      )
        void refreshUnread();
    };
    const interval = setInterval(refreshVisible, 60000);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("update-notif-count", refreshVisible);
    navigator.serviceWorker?.addEventListener("message", incoming);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("update-notif-count", refreshVisible);
      navigator.serviceWorker?.removeEventListener("message", incoming);
    };
  }, [accessToken, account, refreshUnread]);
  const act = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Pengaturan belum berhasil. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };
  const value: State = {
    installed,
    ios,
    supported,
    canInstall: Boolean(prompt),
    permission,
    configured: config.enabled,
    subscribed,
    checking,
    busy,
    error,
    message,
    devices,
    unread,
    install: async () => {
      if (prompt) {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }
    },
    refresh,
    refreshUnread,
    enable: () =>
      act(async () => {
        if (!account || !accessToken || !config.enabled)
          throw new Error(
            "Notifikasi HP sedang disiapkan. Email tetap mengikuti pilihan Anda.",
          );
        if (ios && !installed)
          throw new Error(
            "Tambahkan AMS ke layar utama, lalu buka AMS dari ikon tersebut.",
          );
        if (!supported)
          throw new Error(
            "Browser ini belum mendukung notifikasi HP. Coba Chrome atau Safari yang terbaru.",
          );
        const reg = registeredWorker.current;
        if (!reg)
          throw new Error(
            "Perangkat belum siap. Muat ulang AMS lalu coba lagi.",
          );
        const register = async (renew = false) => {
          let sub = currentSubscription.current;
          if (renew && sub) {
            await sub.unsubscribe();
            sub = null;
          }
          if (!sub) {
            try {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationKey(config.publicKey),
              });
            } catch {
              setPermission(Notification.permission);
              if (Notification.permission === "denied")
                throw new Error(
                  "Izin notifikasi diblokir. Izinkan AMS dari pengaturan browser atau HP.",
                );
              throw new Error(
                "Perangkat belum terhubung. Izinkan notifikasi saat diminta, lalu coba lagi.",
              );
            }
          }
          currentSubscription.current = sub;
          setPermission(Notification.permission);
          if (previous.current?.account !== account) {
            await sub.unsubscribe();
            return;
          }
          await bindNotificationAccount(account, reg);
          const json = sub.toJSON();
          await notificationRequest(accessToken, "/devices", "POST", {
            deviceKey: deviceKey(),
            label: ios
              ? "iPhone / iPad"
              : /android/i.test(navigator.userAgent)
                ? "HP Android"
                : "Browser komputer",
            subscription: { endpoint: json.endpoint, keys: json.keys },
          });
        };
        try {
          await register();
        } catch (e) {
          if (
            e instanceof NotificationRequestError &&
            e.code === "DEVICE_RENEW_REQUIRED"
          )
            await register(true);
          else throw e;
        }
        await refresh();
      }),
    disable: () =>
      act(async () => {
        if (!accessToken || !account) return;
        await notificationRequest(
          accessToken,
          `/devices/${deviceKey()}`,
          "DELETE",
        );
        await releaseNotificationDevice(null, account);
        currentSubscription.current = null;
        setSubscribed(false);
        await refresh();
      }),
    test: () =>
      act(async () => {
        if (!accessToken || role !== "admin") return;
        const data = await notificationRequest<{ message: string }>(
          accessToken,
          "/test",
          "POST",
          { deviceKey: deviceKey() },
        );
        setMessage(data.message);
        await refreshUnread();
      }),
    removeDevice: (key) =>
      act(async () => {
        if (!accessToken) return;
        await notificationRequest(accessToken, `/devices/${key}`, "DELETE");
        if (key === deviceKey() && account)
          await releaseNotificationDevice(null, account);
        await refresh();
        setMessage("Notifikasi perangkat sudah dinonaktifkan.");
      }),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAmsNotifications() {
  const context = useContext(Context);
  if (!context) throw new Error("Notification provider required");
  return context;
}
