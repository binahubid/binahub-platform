"use client";

import { useEffect, useId, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  DeviceSettings,
  NoticePreferences,
} from "@/components/notifications/device-settings";
import { notificationApi } from "@/lib/notification-client";

type Preferences = {
  email_notifications: boolean;
  profile_visibility: string;
};
type Setting = keyof Preferences;
type Feedback = { setting: Setting; ok: boolean };

export default function SettingsPage() {
  const { user, accessToken, signOut } = useAuth();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<Setting | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const account = user?.id;

  useEffect(() => {
    if (!account || !accessToken) return;
    const abort = new AbortController();
    setPreferences(null);
    setLoadError(false);
    setFeedback(null);
    void fetch(notificationApi + "/api/associate/preferences", {
      headers: { Authorization: "Bearer " + accessToken },
      signal: abort.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error();
        if (!abort.signal.aborted) {
          setPreferences({
            email_notifications: result.data?.email_notifications ?? true,
            profile_visibility: result.data?.profile_visibility ?? "private",
          });
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setLoadError(true);
      });
    return () => abort.abort();
  }, [account, accessToken, retry]);

  async function toggle(setting: Setting) {
    if (!accessToken || !preferences || saving) return;
    const update =
      setting === "email_notifications"
        ? { emailNotifications: !preferences.email_notifications }
        : {
            profileVisibility:
              preferences.profile_visibility === "public"
                ? "private"
                : "public",
          };

    setSaving(setting);
    setFeedback(null);
    try {
      const response = await fetch(
        notificationApi + "/api/associate/preferences",
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(update),
          signal: AbortSignal.timeout(10000),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) throw new Error();
      setPreferences({
        email_notifications: result.data.email_notifications,
        profile_visibility: result.data.profile_visibility,
      });
      setFeedback({ setting, ok: true });
    } catch {
      setFeedback({ setting, ok: false });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="pb-1">
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Kelola notifikasi dan privasi akun Anda.
        </p>
      </header>

      <DeviceSettings />
      <section
        className="rounded-xl border border-slate-200 bg-white px-5 sm:px-6"
        aria-label="Notifikasi email dan WhatsApp"
      >
        <div className="border-b border-slate-200 py-4">
          <h2 className="text-base font-semibold text-slate-900">Email</h2>
          {preferences ? (
            <ToggleRow
              label="Notifikasi email"
              description="Terima undangan dan pembaruan pekerjaan di email Anda."
              enabled={preferences.email_notifications}
              disabled={saving !== null}
              saving={saving === "email_notifications"}
              feedback={
                feedback?.setting === "email_notifications" ? feedback : null
              }
              onToggle={() => void toggle("email_notifications")}
            />
          ) : loadError ? (
            <div className="mt-2">
              <p role="alert" className="text-sm text-red-700">
                Pilihan email belum dapat dimuat.
              </p>
              <button
                type="button"
                className="min-h-11 text-sm font-semibold text-[#0B2C6B] hover:underline"
                onClick={() => setRetry(retry + 1)}
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <p role="status" className="mt-2 text-sm text-slate-600">
              Memuat pilihan email…
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 py-4">
          <h2 className="text-base font-semibold text-slate-900">WhatsApp</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            Segera hadir
          </span>
        </div>
      </section>

      <NoticePreferences />
      <section
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
        aria-labelledby="account-settings-heading"
      >
        <h2
          id="account-settings-heading"
          className="text-base font-semibold text-slate-900"
        >
          Akun dan privasi
        </h2>
        <dl className="mt-3 border-b border-slate-200 pb-3 text-sm">
          <dt className="text-slate-600">Email akun</dt>
          <dd className="mt-1 break-words font-medium text-slate-900">
            {user?.email || "—"}
          </dd>
        </dl>
        {preferences && (
          <ToggleRow
            label="Profil publik"
            description="Izinkan orang lain melihat profil Anda."
            enabled={preferences.profile_visibility === "public"}
            disabled={saving !== null}
            saving={saving === "profile_visibility"}
            feedback={
              feedback?.setting === "profile_visibility" ? feedback : null
            }
            onToggle={() => void toggle("profile_visibility")}
          />
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 min-h-11 text-sm font-semibold text-red-700 hover:underline lg:hidden"
        >
          Keluar dari akun
        </button>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  disabled,
  saving,
  feedback,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  saving: boolean;
  feedback: Feedback | null;
  onToggle: () => void;
}) {
  const descriptionId = useId();
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-4">
        <p id={descriptionId} className="text-sm leading-6 text-slate-600">
          {description}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={label}
          aria-describedby={descriptionId}
          aria-busy={saving}
          disabled={disabled}
          onClick={onToggle}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md text-sm font-medium text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2C6B] disabled:opacity-60"
        >
          <span aria-hidden="true">{enabled ? "Aktif" : "Nonaktif"}</span>
          <span
            aria-hidden="true"
            className={
              "relative h-6 w-11 rounded-full " +
              (enabled ? "bg-[#0B2C6B]" : "bg-slate-400")
            }
          >
            <span
              className={
                "absolute top-1 h-4 w-4 rounded-full bg-white " +
                (enabled ? "left-6" : "left-1")
              }
            />
          </span>
        </button>
      </div>
      {saving && (
        <p role="status" className="text-sm text-slate-600">
          Menyimpan…
        </p>
      )}
      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={
            "text-sm " + (feedback.ok ? "text-emerald-800" : "text-red-700")
          }
        >
          {feedback.ok
            ? "Pilihan tersimpan."
            : "Pilihan belum tersimpan. Coba lagi."}
        </p>
      )}
    </div>
  );
}
