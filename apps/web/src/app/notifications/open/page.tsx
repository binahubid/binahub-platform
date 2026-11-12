"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { notificationRequest } from "@/lib/notification-client";

function OpenNotice() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const role = user?.app_metadata?.role;
  const back =
    role === "admin"
      ? "/admin/notifications"
      : role === "reviewer"
        ? "/admin/reviews"
        : "/dashboard/notifications";
  useEffect(() => {
    if (loading) return;
    if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
      setError("Tautan pemberitahuan tidak valid.");
      return;
    }
    if (!user || !accessToken) {
      sessionStorage.setItem(
        "ams_notification_return",
        "/notifications/open?id=" + id,
      );
      router.replace("/auth/login");
      return;
    }
    const abort = new AbortController();
    void notificationRequest<{ url: string }>(
      accessToken,
      "/open",
      "POST",
      { id },
      abort.signal,
    )
      .then(({ url }) => {
        if (abort.signal.aborted) return;
        if (!/^\/(dashboard|admin)(\/|$)/.test(url) || /[\\\r\n]/.test(url))
          throw new Error("Tujuan pemberitahuan tidak valid.");
        window.dispatchEvent(new Event("update-notif-count"));
        router.replace(url);
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Pemberitahuan belum dapat dibuka.",
          );
      });
    return () => abort.abort();
  }, [accessToken, attempt, id, loading, router, user]);
  return (
    <main className="mx-auto mt-24 max-w-lg px-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-[#0B2C6B]">
          Pemberitahuan AMS
        </h1>
        <p
          role={error ? "alert" : "status"}
          className="mt-2 text-sm leading-6 text-slate-700"
        >
          {error || "Membuka pemberitahuan…"}
        </p>
        {error && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={back}
              className="inline-flex min-h-11 items-center rounded-lg bg-[#0B2C6B] px-4 text-sm font-semibold text-white"
            >
              Lihat notifikasi
            </Link>
            <button
              type="button"
              className="min-h-11 px-3 text-sm font-semibold text-[#0B2C6B]"
              onClick={() => {
                setError("");
                setAttempt(attempt + 1);
              }}
            >
              Coba lagi
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
export default function OpenNotificationPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-slate-600">
          Membuka pemberitahuan…
        </p>
      }
    >
      <OpenNotice />
    </Suspense>
  );
}
