'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';

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
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${apiUrl}/api/associate/assignments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAssignments(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accessToken, apiUrl]);

  const filtered = filter === 'all' ? assignments : assignments.filter((a) => a.status === filter);

  const stats = {
    total: assignments.length,
    active: assignments.filter((a) => a.status === 'active').length,
    completed: assignments.filter((a) => a.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">Lihat proyek dan penugasan khusus Anda</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Penugasan', val: stats.total, color: 'text-slate-800', border: 'border-slate-200', bg: 'bg-white' },
          { label: 'Penugasan Aktif', val: stats.active, color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50/20' },
          { label: 'Penugasan Selesai', val: stats.completed, color: 'text-indigo-600', border: 'border-indigo-100', bg: 'bg-indigo-50/20' },
        ].map((item, i) => (
          <div key={i} className={`rounded-xl border ${item.border} ${item.bg} p-5 shadow-sm transition-all hover:shadow-md`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 border-b border-slate-200 pb-px">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`relative pb-3 px-4 text-xs font-semibold transition-all ${
              filter === f
                ? 'text-[#0B2C6B] border-b-2 border-[#0B2C6B]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {f === 'all' ? 'Semua Proyek' : f === 'active' ? 'Aktif' : 'Selesai'}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="rounded-full bg-slate-50 p-4 border border-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-bold text-slate-800">Tidak Ada Penugasan</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">Anda belum memiliki penugasan dengan status ini atau belum diundang oleh admin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((a) => {
            const config = statusConfig[a.status] || statusConfig.draft;
            const myConfig = a.my_status ? (myStatusConfig[a.my_status] || null) : null;
            return (
              <div key={a.id} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-[#0B2C6B] transition-colors">{a.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${config.bg}`}>
                        {config.label}
                      </span>
                      {myConfig && (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${myConfig.bg}`}>
                          {myConfig.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{a.client_name}</p>
                    {a.description && <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{a.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {fmtDate(a.start_date)} {a.end_date && `s/d ${fmtDate(a.end_date)}`}
                      </span>
                      {a.needed_roles.length > 0 && (
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {a.needed_roles.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center flex-shrink-0 sm:self-center">
                    <Link
                      href={`/dashboard/assignments/${a.id}`}
                      className="w-full sm:w-auto text-center rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-[#0B2C6B] hover:text-white hover:border-[#0B2C6B] transition-all shadow-sm"
                    >
                      Detail Penugasan
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
