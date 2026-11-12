"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { deviceKey, notificationRequest } from "@/lib/notification-client";
import { useAmsNotifications } from "./provider";

const primaryButton =
  "min-h-11 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123e84] disabled:opacity-50";
const secondaryButton =
  "min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-[#0B2C6B] hover:bg-slate-50 disabled:opacity-50";

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
          {installed ? "Atur notifikasi HP" : "Pasang AMS"}
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

export function DeviceSettings() {
  const state = useAmsNotifications();
  const [showInstall, setShowInstall] = useState(false);
  const [installError, setInstallError] = useState("");
  const [key, setKey] = useState("");
  useEffect(() => {
    setKey(deviceKey());
  }, []);
  const active =
    state.subscribed && state.permission === "granted" && state.configured;
  const installFirst = state.ios && !state.installed;
  const enabled =
    state.configured &&
    state.supported &&
    state.permission !== "denied" &&
    !installFirst;
  const permissionLabel =
    state.permission === "granted"
      ? "Diizinkan"
      : state.permission === "denied"
        ? "Diblokir"
        : "Belum diberikan";
  const activeDevices = state.devices.filter((device) => device.active);
  async function install() {
    setInstallError("");
    if (!state.canInstall) {
      setShowInstall((value) => !value);
      return;
    }
    try {
      await state.install();
    } catch {
      setInstallError("Gunakan menu browser untuk memasang AMS.");
    }
  }
  return (
    <section
      id="notifikasi-hp"
      className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      aria-labelledby="notification-settings-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="notification-settings-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Notifikasi HP
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Terima undangan, penugasan, dan perubahan jadwal saat AMS sedang
            ditutup.
          </p>
        </div>
        <button
          type="button"
          className={secondaryButton}
          disabled={state.checking || state.busy}
          onClick={() => void state.refresh()}
        >
          {state.checking ? "Memeriksa perangkat…" : "Periksa perangkat ini"}
        </button>
      </div>
      <dl className="my-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-600">Pemasangan</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {state.installed ? "Dibuka dari ikon AMS" : "Dibuka di browser"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Izin notifikasi</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {state.supported ? permissionLabel : "Belum tersedia"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Notifikasi perangkat</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {active ? "Aktif" : "Belum aktif"}
          </dd>
        </div>
      </dl>
      {!state.configured && !state.checking && !state.error && (
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Notifikasi HP sedang disiapkan. Undangan tetap tersedia di AMS dan
          melalui email sesuai pilihan Anda.
        </p>
      )}
      {state.permission === "denied" && (
        <p className="mb-4 text-sm leading-6 text-slate-700">
          Izinkan AMS di pengaturan notifikasi HP atau browser, lalu pilih{" "}
          <strong>Periksa perangkat ini</strong>.
        </p>
      )}
      {installFirst && (
        <p className="mb-4 text-sm leading-6 text-slate-700">
          Di iPhone atau iPad, pasang AMS di layar utama dan buka dari ikonnya
          sebelum mengaktifkan notifikasi.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!state.installed && (
          <button
            type="button"
            aria-expanded={state.canInstall ? undefined : showInstall}
            className={secondaryButton}
            onClick={() => void install()}
          >
            Pasang AMS
          </button>
        )}
        {!active && enabled && (
          <button
            type="button"
            className={primaryButton}
            disabled={state.busy || state.checking}
            onClick={() => void state.enable()}
          >
            Aktifkan notifikasi HP
          </button>
        )}
        {active && (
          <button
            type="button"
            className={primaryButton}
            disabled={state.busy}
            onClick={() => void state.test()}
          >
            Kirim notifikasi uji
          </button>
        )}
        {state.subscribed && (
          <button
            type="button"
            className={secondaryButton}
            disabled={state.busy}
            onClick={() => void state.disable()}
          >
            Nonaktifkan di perangkat ini
          </button>
        )}
      </div>
      {showInstall && (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
          {state.ios
            ? "Buka ams.binahub.id di Safari. Pilih Bagikan, lalu Tambah ke Layar Utama. Buka AMS dari ikon yang baru dibuat."
            : "Buka menu browser dan pilih Instal aplikasi atau Tambahkan ke layar utama. Jika pilihannya tidak tersedia, Anda tetap bisa menggunakan AMS di browser."}
        </p>
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
      {activeDevices.length > 0 && (
        <details className="mt-5 border-t border-slate-200 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#0B2C6B]">
            Perangkat aktif ({activeDevices.length})
          </summary>
          <ul className="mt-2 divide-y divide-slate-200">
            {activeDevices.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-slate-700">
                  {device.label}
                  {device.device_key === key ? " · Perangkat ini" : ""}
                </span>
                <button
                  type="button"
                  disabled={state.busy}
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
      .then(setValues)
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
    setSaving(true);
    setResult(null);
    try {
      await notificationRequest(accessToken, "/preferences", "PUT", values);
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
    <details className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold text-slate-900">
        Jenis pemberitahuan dan jam tenang
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Atur pemberitahuan yang dikirim ke email dan HP. Semua undangan dan
        pekerjaan tetap tersedia di AMS.
      </p>
      {values && (
        <form className="mt-4 space-y-5" onSubmit={(event) => void save(event)}>
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
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <fieldset className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
            <legend className="sr-only">Jam tenang</legend>
            {(
              [
                ["quiet_start", "Mulai jam tenang"],
                ["quiet_end", "Selesai jam tenang"],
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
                  onChange={(event) =>
                    setValues({ ...values, [key]: Number(event.target.value) })
                  }
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
                onChange={(event) =>
                  setValues({ ...values, timezone: event.target.value })
                }
              >
                {zones.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <p className="text-sm leading-6 text-slate-600">
            Samakan jam mulai dan selesai untuk mematikan jam tenang.
          </p>
          <button className={primaryButton} type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan pilihan"}
          </button>
        </form>
      )}
      {!values && !result && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          Memuat pilihan…
        </p>
      )}
      {result && (
        <p
          role={result.error ? "alert" : "status"}
          className={
            "mt-3 text-sm " +
            (result.error ? "text-red-700" : "text-emerald-800")
          }
        >
          {result.text}
        </p>
      )}
      {!values && result?.error && (
        <button
          className={secondaryButton + " mt-3"}
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
