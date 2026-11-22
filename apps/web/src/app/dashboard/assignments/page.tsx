'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { ServiceError } from '@/components/ui';
import { assignmentStatusLabel, assignmentStatusTone, formatAssignmentDate, nextAssignmentTransition, type AssignmentWork } from '@/lib/assignment-display';
import { useAssignmentRefresh } from '@/lib/use-assignment-refresh';
import { useAmsLocale } from "@/components/ams-language";

type Assignment = AssignmentWork & {
  id: string;
  title: string;
  client_name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  needed_roles: string[];
  needed_count: number;
  created_at: string;
  my_status?: string | null;
};

const filters = [
  { key: 'active', label: 'Aktif', empty: 'Belum ada penugasan aktif.' },
  { key: 'follow_up', label: 'Tindak lanjut', empty: 'Belum ada penugasan yang perlu tindak lanjut.' },
  { key: 'history', label: 'Riwayat', empty: 'Belum ada riwayat penugasan.' },
] as const;

function bucketOf(assignment: Assignment) {
  if (assignment.work_bucket) return assignment.work_bucket;
  if (['declined', 'withdrawn', 'reviewed', 'cancelled'].includes(assignment.my_status || '') || ['completed', 'cancelled'].includes(assignment.status)) return 'history';
  if (assignment.status === 'paused' || assignment.my_status === 'completed') return 'follow_up';
  return assignment.status === 'active' ? 'active' : 'history';
}

export default function AssignmentsPage() {
  const { t } = useAmsLocale();
  const { accessToken } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('active');
  const request = useRef<AbortController | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const load = useCallback(async () => {
    if (!accessToken) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch(apiUrl + '/api/associate/assignments', {
        headers: { Authorization: 'Bearer ' + accessToken },
        signal: controller.signal,
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error();
      if (!controller.signal.aborted) {
        setAssignments(result.data);
        setLoadError(false);
      }
    } catch {
      if (!controller.signal.aborted) setLoadError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, apiUrl]);
  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);
  useAssignmentRefresh(nextAssignmentTransition(assignments), load, Boolean(accessToken));

  const filtered = assignments.filter((assignment) => bucketOf(assignment) === filter);
  const counts = { active: 0, follow_up: 0, history: 0 };
  for (const assignment of assignments) counts[bucketOf(assignment)]++;

  if (loading) return <p role="status" className="py-8 text-center text-sm text-slate-600">{t("Memuat penugasan…")}</p>;
  if (loadError) {
    return <ServiceError title={t("Penugasan belum dapat dimuat")} message={t("Periksa koneksi Anda dan coba lagi.")} onRetry={load} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">{t("Penugasan")}</h1>

      <div role="group" aria-label={t("Filter penugasan")} className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:max-w-md">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-1 text-xs transition-colors sm:text-sm ${filter === key
              ? 'bg-white font-semibold text-[#0B2C6B] shadow-sm ring-1 ring-slate-200'
              : 'font-medium text-slate-600 hover:bg-white/70'}`}
          >
            {t(label)}
            <span className="text-[11px] tabular-nums">{counts[key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="ams-panel px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">{filters.find((item) => item.key === filter)?.empty}</p>
        </div>
      ) : (
        <ul className="ams-panel divide-y divide-slate-200 overflow-hidden">
          {filtered.map((assignment) => {
            const status = assignment.work_status || assignment.my_status || assignment.status;
            const dates = [assignment.start_date, assignment.end_date].map(formatAssignmentDate).filter(Boolean);
            const schedule = [...new Set(dates)].join(' – ');

            return (
              <li key={assignment.id}>
                <Link
                  href={`/dashboard/assignments/${assignment.id}`}
                  className="flex min-h-20 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0B2C6B] sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + assignmentStatusTone(status)}>
                        {t(assignment.work_status_label || assignmentStatusLabel(status))}
                      </span>
                    </div>
                    <h2 className="break-words text-base font-semibold leading-snug text-slate-900">{assignment.title}</h2>
                    {assignment.client_name && <p className="mt-1 break-words text-sm text-slate-600">{assignment.client_name}</p>}
                    {assignment.description && <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-slate-600">{assignment.description}</p>}
                    <p className="mt-2 break-words text-xs leading-5 text-slate-600">
                      {[schedule, assignment.needed_roles?.join(', ')].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
