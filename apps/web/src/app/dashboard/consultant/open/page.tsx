"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useConsultantTeam } from "@/components/consultant-team-context";

function OpenConsultantWork() {
  const { open, opening, error } = useConsultantTeam();
  const leadId = useSearchParams().get("lead");
  const valid = !!leadId && /^[a-f0-9-]{36}$/i.test(leadId);
  const [started, setStarted] = useState(false);
  return (
    <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-[#0B2C6B]">
        Penugasan konsultasi
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Buka ruang kerja terkait dengan akun AMS Anda.
      </p>
      {started && error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={opening}
          onClick={() => {
            setStarted(true);
            void open(valid ? leadId : undefined);
          }}
          className="min-h-11 rounded-lg bg-[#0B2C6B] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {opening ? "Membuka portal…" : "Buka pekerjaan"}
        </button>
        <Link
          href="/dashboard/notifications"
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[#0B2C6B]"
        >
          Kembali ke notifikasi
        </Link>
      </div>
    </section>
  );
}
export default function OpenConsultantWorkPage() {
  return (
    <Suspense fallback={<p role="status">Memuat penugasan…</p>}>
      <OpenConsultantWork />
    </Suspense>
  );
}
