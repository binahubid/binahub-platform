"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { deviceKey, notificationRequest } from "@/lib/notification-client";
import { useAmsNotifications } from "./provider";

const primaryButton =
  "min-h-11 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123e84] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2C6B] disabled:opacity-50";
const secondaryButton =
  "min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-[#0B2C6B] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2C6B] disabled:opacity-50";

export function InstallAmsCard() {
  const { installed, ios, supported, subscribed } = useAmsNotifications();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDismissed(localStorage.getItem("ams_install_hint_dismissed") === "true");
  }, []);
  if (dismissed || subscribed || (!ios && !supported)) return null;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="font-semibold text-[#0B2C6B]">
          {installed ? "Terima undangan di HP" : "Akses AMS dari layar utama"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Buka AMS dengan satu ketukan dan terima pemberitahuan pekerjaan.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/settings#notifikasi-hp"
          className={primaryButton}
        >
          {ios && !installed ? "Pasang AMS" : "Atur notifikasi HP"}
        </Link>
        <button
          type="button"
          className={secondaryButton}
          onClick={() => {
            localStorage.setItem("ams_install_hint_dismissed", "true");
            setDismissed(true);
          }}
        >
          Nanti
        </button>
      </div>
    </section>
  );
}

export function DeviceSettings({ allowTest = false }: { allowTest?: boolean }) {
  const state = useAmsNotifications();
  const { user } = useAuth();
  const [installError, setInstallError] = useState("");
  const [key, setKey] = useState("");
  useEffect(() => {
    setKey(deviceKey());
  }, []);

  const installFirst = state.ios && !state.installed;
  const active =
    state.subscribed && state.permission === "granted" && state.configured;
  const blocked = state.permission === "denied";
  const readyToEnable =
    state.configured && state.supported && !installFirst && !blocked;
  const otherDevices = state.devices.filter(
    (device) => device.active && device.device_key !== key,
  );
  const canTest = allowTest && user?.app_metadata?.role === "admin";
  const isBusy = state.busy || state.checking;
  let status = "Belum aktif";
  let description =
    "Aktifkan untuk menerima undangan, penugasan, dan perubahan jadwal di perangkat ini.";

  if (active) {
    status = "Aktif di perangkat ini";
    description =
      "Undangan, penugasan, dan perubahan jadwal dapat muncul saat AMS ditutup.";
  } else if (installFirst) {
    status = "Perlu dipasang";
    description =
      "Di iPhone atau iPad, pasang AMS ke layar utama sebelum mengaktifkan notifikasi.";
  } else if (blocked) {
    status = "Izin diblokir";
    description =
      "Izinkan notifikasi AMS dari pengaturan HP atau browser, lalu kembali ke halaman ini.";
  } else if (state.checking) {
    status = "Memeriksa…";
    description = "Memeriksa apakah perangkat ini bisa menerima notifikasi.";
  } else if (!state.configured) {
    status = "Belum tersedia";
    description =
      "Notifikasi HP sedang tidak tersedia. Anda dapat memeriksanya kembali.";
  } else if (!state.supported) {
    status = "Belum didukung";
    description = state.ios
      ? "Perbarui iOS atau iPadOS agar AMS yang terpasang dapat menerima notifikasi."
      : "Buka AMS di Chrome atau Safari terbaru untuk mengaktifkan notifikasi.";
  }

  async function install() {
    setInstallError("");
    try {
      await state.install();
    } catch {
      setInstallError(
        "Gunakan menu browser untuk memasang AMS ke layar utama.",
      );
    }
  }

  return (
    <section
      id="notifikasi-hp"
      className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      aria-labelledby="notification-settings-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="notification-settings-heading"
          className="text-base font-semibold text-slate-900"
        >
          Notifikasi HP
        </h2>
        <span
          role="status"
          className={
            "rounded-full px-2.5 py-1 text-xs font-semibold " +
            (active
              ? "bg-emerald-50 text-emerald-800"
              : blocked
                ? "bg-amber-50 text-amber-900"
                : "bg-slate-100 text-slate-700")
          }
        >
          {status}
        </span>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>

      {installFirst && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
          <li>
            Buka AMS di Safari dan ketuk <strong>Bagikan</strong>.
          </li>
          <li>
            Pilih <strong>Tambah ke Layar Utama</strong>.
          </li>
          <li>
            Buka ikon AMS dan pilih <strong>Aktifkan notifikasi HP</strong>.
          </li>
        </ol>
      )}

      {((!active && readyToEnable) ||
        blocked ||
        (!state.configured && !state.checking && !installFirst) ||
        state.subscribed) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {!active && readyToEnable && (
            <button
              type="button"
              className={primaryButton}
              disabled={isBusy}
              onClick={() => void state.enable()}
            >
              {state.busy ? "Mengaktifkan…" : "Aktifkan notifikasi HP"}
            </button>
          )}
          {(blocked ||
            (!state.configured && !state.checking && !installFirst)) && (
            <button
              type="button"
              className={secondaryButton}
              disabled={isBusy}
              onClick={() => void state.refresh()}
            >
              Periksa lagi
            </button>
          )}
          {active && canTest && (
            <button
              type="button"
              className={primaryButton}
              disabled={isBusy}
              onClick={() => void state.test()}
            >
              Kirim notifikasi uji
            </button>
          )}
          {state.subscribed && (
            <button
              type="button"
              className={secondaryButton}
              disabled={isBusy}
              onClick={() => void state.disable()}
            >
              Nonaktifkan di perangkat ini
            </button>
          )}
        </div>
      )}

      {(state.error || installError) && (
        <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
          {state.error || installError}
        </p>
      )}
      {state.message && (
        <p role="status" className="mt-3 text-sm leading-6 text-emerald-800">
          {state.message}
        </p>
      )}

      {!state.installed && !installFirst && state.supported && (
        <details className="mt-4 border-t border-slate-200 pt-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[#0B2C6B]">
            Pasang AMS di layar utama
          </summary>
          <p className="text-sm leading-6 text-slate-600">
            Buka AMS langsung dari ikon di layar utama perangkat Anda.
          </p>
          {state.canInstall ? (
            <button
              type="button"
              className={secondaryButton + " mt-2"}
              onClick={() => void install()}
            >
              Pasang AMS
            </button>
          ) : (
            <p className="text-sm leading-6 text-slate-700">
              Di menu browser, pilih <strong>Instal aplikasi</strong> atau{" "}
              <strong>Tambahkan ke layar utama</strong>.
            </p>
          )}
        </details>
      )}
      {otherDevices.length > 0 && (
        <details className="mt-4 border-t border-slate-200 pt-3">
          <summary className="cursor-pointer py-2 text-sm font-medium text-[#0B2C6B]">
            Perangkat lain ({otherDevices.length})
          </summary>
          <ul className="mt-2 divide-y divide-slate-200">
            {otherDevices.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-slate-700">{device.label}</span>
                <button
                  type="button"
                  aria-label={"Nonaktifkan notifikasi pada " + device.label}
                  disabled={isBusy}
                  className={secondaryButton}
                  onClick={() => void state.removeDevice(device.device_key)}
                >
                  Nonaktifkan
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

type Preferences = {
  agreements: boolean;
  assignments: boolean;
  schedules: boolean;
  reminders: boolean;
  quiet_start: number;
  quiet_end: number;
  timezone: string;
};
const preferences = [
  ["agreements", "Undangan dan perjanjian"],
  ["assignments", "Penugasan konsultasi"],
  ["schedules", "Perubahan jadwal"],
  ["reminders", "Pengingat undangan dan jadwal"],
] as const;
const zones = [
  ["Asia/Jakarta", "WIB"],
  ["Asia/Makassar", "WITA"],
  ["Asia/Jayapura", "WIT"],
] as const;

export function NoticePreferences() {
  const { accessToken } = useAuth();
  const [values, setValues] = useState<Preferences | null>(null);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    const abort = new AbortController();
    void notificationRequest<Preferences>(
      accessToken,
      "/preferences",
      "GET",
      undefined,
      abort.signal,
    )
      .then((preferences) => {
        if (abort.signal.aborted) return;
        setValues(preferences);
        setQuietEnabled(preferences.quiet_start !== preferences.quiet_end);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setResult({
            error: true,
            text: "Pilihan notifikasi belum dapat dimuat.",
          });
      });
    return () => abort.abort();
  }, [accessToken, retry]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || !values || saving) return;
    if (quietEnabled && values.quiet_start === values.quiet_end) {
      setResult({
        error: true,
        text: "Pilih jam mulai dan selesai yang berbeda.",
      });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      await notificationRequest(accessToken, "/preferences", "PUT", {
        ...values,
        quiet_end: quietEnabled ? values.quiet_end : values.quiet_start,
      });
      setResult({ error: false, text: "Pilihan notifikasi tersimpan." });
    } catch (error) {
      setResult({
        error: true,
        text:
          error instanceof Error ? error.message : "Pilihan belum tersimpan.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white px-5 py-2 sm:px-6">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-slate-900">
        Jenis notifikasi dan jam tenang
      </summary>
      <p className="text-sm leading-6 text-slate-600">
        Pilih pemberitahuan yang dikirim ke HP dan email Anda.
      </p>
      {values && (
        <form
          className="mt-4 space-y-4 pb-4"
          onSubmit={(event) => void save(event)}
        >
          <fieldset className="grid gap-1 sm:grid-cols-2">
            <legend className="sr-only">Jenis pemberitahuan</legend>
            {preferences.map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 items-center gap-3 text-sm text-slate-800"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#0B2C6B]"
                  checked={values[key]}
                  onChange={(event) => {
                    setValues({ ...values, [key]: event.target.checked });
                    setResult(null);
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <fieldset className="border-t border-slate-200 pt-3">
            <legend className="sr-only">Jam tenang</legend>
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#0B2C6B]"
                checked={quietEnabled}
                onChange={(event) => {
                  setQuietEnabled(event.target.checked);
                  if (
                    event.target.checked &&
                    values.quiet_start === values.quiet_end
                  )
                    setValues({ ...values, quiet_start: 21, quiet_end: 7 });
                  setResult(null);
                }}
              />
              Terapkan jam tenang
            </label>
            {quietEnabled && (
              <>
                <p className="mb-3 text-sm leading-6 text-slate-600">
                  Notifikasi rutin menunggu sampai jam tenang berakhir.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["quiet_start", "Mulai"],
                      ["quiet_end", "Selesai"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="grid gap-1.5 text-sm font-medium text-slate-800"
                    >
                      {label}
                      <select
                        className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal"
                        value={values[key]}
                        onChange={(event) => {
                          setValues({
                            ...values,
                            [key]: Number(event.target.value),
                          });
                          setResult(null);
                        }}
                      >
                        {Array.from({ length: 24 }, (_, hour) => (
                          <option key={hour} value={hour}>
                            {String(hour).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="grid gap-1.5 text-sm font-medium text-slate-800">
                    Zona waktu
                    <select
                      className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal"
                      value={values.timezone}
                      onChange={(event) => {
                        setValues({ ...values, timezone: event.target.value });
                        setResult(null);
                      }}
                    >
                      {!zones.some(([value]) => value === values.timezone) && (
                        <option value={values.timezone}>
                          {values.timezone}
                        </option>
                      )}
                      {zones.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
          </fieldset>
          <button className={primaryButton} type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan pilihan"}
          </button>
        </form>
      )}
      {!values && !result && (
        <p role="status" className="py-3 text-sm text-slate-600">
          Memuat pilihan…
        </p>
      )}
      {result && (
        <p
          role={result.error ? "alert" : "status"}
          className={
            "pb-3 text-sm " +
            (result.error ? "text-red-700" : "text-emerald-800")
          }
        >
          {result.text}
        </p>
      )}
      {!values && result?.error && (
        <button
          className={secondaryButton + " mb-3"}
          type="button"
          onClick={() => {
            setResult(null);
            setRetry(retry + 1);
          }}
        >
          Coba lagi
        </button>
      )}
    </details>
  );
}
