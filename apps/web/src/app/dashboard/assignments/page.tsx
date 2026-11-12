'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { ServiceError } from '@/components/ui';

type Assignment = {
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

const myStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  invited: { label: 'Diundang', bg: 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20', text: '' },
  applied: { label: 'Melamar', bg: 'bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20', text: '' },
  accepted: { label: 'Diterima', bg: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20', text: '' },
  declined: { label: 'Ditolak', bg: 'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20', text: '' },
  in_progress: { label: 'Berjalan', bg: 'bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20', text: '' },
  completed: { label: 'Selesai', bg: 'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20', text: '' },
  withdrawn: { label: 'Mundur', bg: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/10', text: '' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-600', text: '' },
  active: { label: 'Aktif', bg: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10', text: '' },
  completed: { label: 'Selesai', bg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10', text: '' },
  cancelled: { label: 'Batal', bg: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10', text: '' },
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AssignmentsPage() {
  const { accessToken } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    fetch(`${apiUrl}/api/associate/assignments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error();
        if (!controller.signal.aborted) setAssignments(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accessToken, apiUrl, retry]);

  const filtered = filter === 'all' ? assignments : assignments.filter((a) => a.status === filter);

  const stats = {
    total: assignments.length,
    active: assignments.filter((a) => a.status === 'active').length,
    completed: assignments.filter((a) => a.status === 'completed').length,
  };

  if (loading) return <p role="status" className="py-8 text-center text-sm text-slate-600">Memuat penugasan…</p>;
  if (loadError) {
    return <ServiceError title="Penugasan belum dapat dimuat" message="Periksa koneksi Anda dan coba lagi." onRetry={() => setRetry(retry + 1)} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Penugasan</h1>

      <div role="group" aria-label="Filter penugasan" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:max-w-md">
        {([
          { key: 'all', label: 'Semua', count: stats.total },
          { key: 'active', label: 'Aktif', count: stats.active },
          { key: 'completed', label: 'Selesai', count: stats.completed },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-1 text-sm transition-colors ${filter === key
              ? 'bg-white font-semibold text-[#0B2C6B] shadow-sm ring-1 ring-slate-200'
              : 'font-medium text-slate-600 hover:bg-white/70'}`}
          >
            {label}
            <span className="text-xs tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">Belum ada penugasan{filter === 'active' ? ' aktif' : filter === 'completed' ? ' yang selesai' : ''}.</p>
          {filter !== 'all' && stats.total > 0 && (
            <button type="button" onClick={() => setFilter('all')} className="mt-1 min-h-11 text-sm font-semibold text-[#0B2C6B] hover:underline">
              Lihat semua penugasan
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {filtered.map((assignment) => {
            const program = statusConfig[assignment.status] ?? statusConfig.draft;
            const participation = assignment.my_status ? myStatusConfig[assignment.my_status] : undefined;
            const showParticipation = participation && participation.label !== program.label;
            const dates = [assignment.start_date, assignment.end_date].filter((value): value is string => Boolean(value));
            const schedule = [...new Set(dates.map(fmtDate))].join(' – ');

            return (
              <li key={assignment.id}>
                <Link
                  href={`/dashboard/assignments/${assignment.id}`}
                  className="flex min-h-20 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0B2C6B] sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      {showParticipation && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${participation.bg}`}>{participation.label}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${program.bg}`}>{program.label}</span>
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
