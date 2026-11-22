"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  notificationApi,
  notificationRequest,
} from "@/lib/notification-client";
import { useAmsNotifications } from "./provider";
import { useAmsLocale } from "@/components/ams-language";

type Notice = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  actionRequired: boolean;
  created_at: string;
  link?: string;
};
type Feed = {
  items: Notice[];
  total: number;
  unread: number;
  actionCount: number;
  pageSize: number;
  page: number;
};
const filters = [
  ["all", "Semua"],
  ["unread", "Belum dibaca"],
  ["action", "Perlu tindakan"],
] as const;
type Filter = (typeof filters)[number][0];

export function NotificationInbox() {
  const { t } = useAmsLocale();
  const { accessToken } = useAuth();
  const { refreshUnread, unread } = useAmsNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [legacy, setLegacy] = useState(false);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      setLoading(true);
      setError("");
      try {
        const data = await notificationRequest<Feed>(
          accessToken,
          "?filter=" + filter + "&page=" + page,
          "GET",
          undefined,
          signal,
        );
        if (!signal?.aborted) {
          setFeed(data);
          setLegacy(false);
        }
      } catch {
        if (signal?.aborted) return;
        try {
          const response = await fetch(
            notificationApi + "/api/associate/notifications",
            { headers: { Authorization: "Bearer " + accessToken }, signal },
          );
          const result = await response.json();
          if (!response.ok || !result.success || !Array.isArray(result.data))
            throw new Error();
          const rows = result.data as Notice[];
          const items =
            filter === "unread"
              ? rows.filter((row) => !row.read)
              : filter === "action"
                ? []
                : rows;
          if (!signal?.aborted) {
            setLegacy(true);
            setFeed({
              items,
              total: items.length,
              unread: rows.filter((row) => !row.read).length,
              actionCount: 0,
              page: 0,
              pageSize: 50,
            });
          }
        } catch {
          if (!signal?.aborted)
            setError(
              "Notifikasi belum dapat dimuat. Periksa koneksi dan coba lagi.",
            );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken, filter, page],
  );
  useEffect(() => {
    const abort = new AbortController();
    void refresh(abort.signal);
    return () => abort.abort();
  }, [refresh, unread]);

  async function markRead(ids: string[]) {
    if (!accessToken || !ids.length || saving) return;
    setSaving(true);
    setError("");
    try {
      if (legacy) {
        await Promise.all(
          ids.map(async (id) => {
            const response = await fetch(
              notificationApi + "/api/associate/notifications/" + id + "/read",
              {
                method: "POST",
                headers: { Authorization: "Bearer " + accessToken },
              },
            );
            if (!response.ok) throw new Error("Status baca belum tersimpan.");
          }),
        );
      } else {
        await notificationRequest(accessToken, "/read", "POST", { ids });
      }
      await Promise.all([refresh(), refreshUnread()]);
    } catch {
      setError("Status baca belum tersimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }
  const unreadIds = (feed?.items || [])
    .filter((item) => !item.read && item.id !== "welcome-notification")
    .map((item) => item.id);
  const first = page * (feed?.pageSize || 30);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">{t("Notifikasi")}</h1>
        </div>
        <Link
          href="/dashboard/settings#notifikasi-hp"
          className="hidden min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#0B2C6B] hover:bg-slate-50 lg:inline-flex"
        >{t("Atur notifikasi HP")}</Link>
      </div>
      <section className="ams-panel overflow-hidden">
        <div className="border-b border-slate-200 px-3 pt-1 sm:flex sm:flex-wrap sm:justify-between sm:gap-2 sm:px-5">
          <div
            className="flex flex-wrap gap-x-3 sm:gap-x-4"
            role="group"
            aria-label={t("Filter notifikasi")}
          >
            {filters
              .filter(([key]) => !legacy || key !== "action")
              .map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => {
                    setPage(0);
                    setFilter(key);
                  }}
                  className={
                    "min-h-11 border-b-2 px-0.5 text-xs font-semibold sm:px-1 sm:text-sm " +
                    (filter === key
                      ? "border-[#0B2C6B] text-[#0B2C6B]"
                      : "border-transparent text-slate-600 hover:text-[#0B2C6B]")
                  }
                >
                  {label}
                  {key === "unread" && !!feed?.unread
                    ? " (" + feed.unread + ")"
                    : key === "action" && !!feed?.actionCount
                      ? " (" + feed.actionCount + ")"
                      : ""}
                </button>
              ))}
          </div>
          {unreadIds.length > 0 && (
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void markRead(unreadIds)}
              className="min-h-11 px-1 text-left text-sm font-semibold text-[#0B2C6B] hover:underline disabled:opacity-60"
            >{t("Tandai halaman ini sudah dibaca")}</button>
          )}
        </div>
        {error && (
          <div
            role="alert"
            className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {t(error)}{" "}
            <button
              type="button"
              className="ml-2 min-h-10 font-semibold underline"
              onClick={() => void refresh()}
            >{t("Coba lagi")}</button>
          </div>
        )}
        {loading && (
          <p role="status" className="px-5 py-7 text-sm text-slate-600">{t("Memuat notifikasi…")}</p>
        )}
        {!loading && !error && !feed?.items.length && (
          <div className="px-5 py-9 text-center">
            <p className="font-semibold text-slate-900">
              {filter === "action"
                ? t("Tidak ada undangan atau tugas yang perlu ditindaklanjuti.")
                : filter === "unread"
                  ? t("Semua notifikasi sudah dibaca.")
                  : t("Belum ada notifikasi.")}
            </p>
          </div>
        )}
        {!loading && !!feed?.items.length && (
          <ul className="divide-y divide-slate-200">
            {feed.items.map((item) => (
              <li
                key={item.id}
                className={
                  "flex flex-col items-start gap-2 px-4 py-4 sm:flex-row sm:justify-between sm:px-5 " +
                  (!item.read ? "bg-blue-50/50" : "")
                }
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h2>
                    {!item.read && (
                      <span className="text-xs font-medium text-[#0B2C6B]">{t("Baru")}</span>
                    )}
                    {item.actionRequired && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900">{t("Perlu tindakan")}</span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-700">
                    {item.message}
                  </p>
                  <time
                    dateTime={item.created_at}
                    className="mt-1 block text-xs text-slate-600"
                  >
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.created_at))}
                  </time>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.link && (
                    <Link
                      href={item.link}
                      onClick={() => {
                        if (legacy && !item.read) void markRead([item.id]);
                      }}
                      className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-[#0B2C6B] hover:bg-slate-50"
                    >{t("Lihat pemberitahuan")}</Link>
                  )}
                  {!item.read && !item.link && (
                    <button
                      type="button"
                      className="min-h-11 text-sm font-semibold text-[#0B2C6B] hover:underline"
                      onClick={() => void markRead([item.id])}
                      disabled={saving}
                    >{t("Tandai dibaca")}</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!legacy && feed && (page > 0 || feed.total > feed.pageSize) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-600">
              {feed.total ? Math.min(first + 1, feed.total) : 0}–
              {Math.min(first + feed.pageSize, feed.total)} {t("dari")} {feed.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-[#0B2C6B] disabled:opacity-40"
                disabled={page === 0 || loading}
                onClick={() => setPage(page - 1)}
              >{t("Sebelumnya")}</button>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-[#0B2C6B] disabled:opacity-40"
                disabled={first + feed.pageSize >= feed.total || loading}
                onClick={() => setPage(page + 1)}
              >{t("Berikutnya")}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
