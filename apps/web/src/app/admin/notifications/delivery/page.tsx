"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { notificationRequest } from "@/lib/notification-client";
import {
  DeviceSettings,
  NoticePreferences,
} from "@/components/notifications/device-settings";

type Delivery = {
  id: string;
  title: string;
  channel: "push" | "email";
  status: string;
  attempts: number;
  created_at: string;
  device_label: string | null;
  read_at: string | null;
};
type Operations = {
  total: number;
  pending: number;
  failed: number;
  accepted: number;
  devices: number;
  waiting: number;
  pushEnabled: boolean;
  lastRun: { started_at: string; state: string } | null;
  items: Delivery[];
};
const statuses: Record<string, string> = {
  pending: "Mengantre",
  processing: "Diproses",
  accepted: "Diterima layanan",
  sent: "Diterima layanan",
  skipped: "Dilewati",
  failed: "Gagal",
  ok: "Berjalan",
  degraded: "Sebagian gagal",
  running: "Diproses",
  error: "Gagal",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value)) + " WIB";
const button =
  "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-[#0B2C6B] hover:bg-slate-50 disabled:opacity-50";

export default function NotificationDeliveryPage() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Operations | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      setLoading(true);
      setError("");
      try {
        const result = await notificationRequest<Operations>(
          accessToken,
          "/operations?page=" + page,
          "GET",
          undefined,
          signal,
        );
        if (!signal?.aborted) setData(result);
      } catch (error) {
        if (!signal?.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Pengiriman belum dapat dimuat.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken, page],
  );
  useEffect(() => {
    const abort = new AbortController();
    void refresh(abort.signal);
    return () => abort.abort();
  }, [refresh]);
  async function retry(item: Delivery) {
    if (!accessToken || busy) return;
    setBusy(item.id);
    setSuccess("");
    setError("");
    try {
      await notificationRequest(accessToken, "/retry", "POST", {
        id: item.id,
        channel: item.channel,
      });
      setSuccess("Pengiriman masuk antrean kembali.");
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Pengiriman belum dapat diulang.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/notifications"
            className="text-sm font-medium text-[#0B2C6B] hover:underline"
          >
            Kembali ke notifikasi
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Pengiriman notifikasi
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Pantau pengiriman email dan notifikasi HP serta ulangi pengiriman
            yang gagal.
          </p>
        </div>
        <button
          type="button"
          className={button}
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Memuat…" : "Perbarui data"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-800">
          {success}
        </p>
      )}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Mengantre", data.pending],
                ["Diterima layanan", data.accepted],
                ["Gagal", data.failed],
                ["Perangkat aktif", data.devices],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-6 text-slate-600">
            {data.pushEnabled ? "Push HP aktif." : "Push HP menunggu aktivasi."}{" "}
            {data.lastRun
              ? "Terakhir diproses " +
                date(data.lastRun.started_at) +
                " · " +
                (statuses[data.lastRun.state] || "Diperiksa")
              : "Belum ada proses pengiriman push yang tercatat."}
          </p>
          {data.waiting > 0 && (
            <p className="text-sm text-slate-700">
              <strong>{data.waiting}</strong> undangan menunggu respons.
            </p>
          )}
          <section className="ams-panel">
            {!data.items.length && (
              <p className="p-5 text-sm text-slate-600">
                Belum ada riwayat pengiriman.
              </p>
            )}
            <ul className="divide-y divide-slate-200">
              {data.items.map((item) => (
                <li
                  key={item.channel + item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {item.channel === "email"
                        ? "Email"
                        : item.device_label || "Notifikasi HP"}{" "}
                      · {date(item.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={
                        "text-sm " +
                        (item.status === "failed"
                          ? "text-red-700"
                          : "text-slate-700")
                      }
                    >
                      {statuses[item.status] || item.status}
                    </span>
                    {item.read_at && (
                      <span className="text-xs font-medium text-slate-600">
                        Dibaca di AMS
                      </span>
                    )}
                    {item.status === "failed" && (
                      <button
                        className={button}
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void retry(item)}
                      >
                        {busy === item.id
                          ? "Menjadwalkan…"
                          : "Ulangi pengiriman"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {(page > 0 || data.total > 30) && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-3">
                <button
                  type="button"
                  className={button}
                  disabled={page === 0 || loading}
                  onClick={() => setPage(page - 1)}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={(page + 1) * 30 >= data.total || loading}
                  onClick={() => setPage(page + 1)}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </section>
        </>
      )}
      <DeviceSettings allowTest />
      <NoticePreferences />
    </div>
  );
}
