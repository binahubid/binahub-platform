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
  invited: { label: 'Diundang', bg: 'bg-amber-50', text: 'text-amber-700' },
  applied: { label: 'Melamar', bg: 'bg-blue-50', text: 'text-blue-700' },
  accepted: { label: 'Diterima', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  declined: { label: 'Ditolak', bg: 'bg-red-50', text: 'text-red-600' },
  in_progress: { label: 'Berjalan', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  completed: { label: 'Selesai', bg: 'bg-slate-100', text: 'text-slate-600' },
  withdrawn: { label: 'Mundur', bg: 'bg-slate-100', text: 'text-slate-400' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600' },
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  completed: { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600' },
};

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">Lihat proyek dan penugasan yang tersedia</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-[#0B2C6B] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'Semua' : f === 'active' ? 'Active' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Assignment List */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-4 text-sm font-medium text-slate-900">Belum ada assignment</p>
          <p className="mt-1 text-xs text-slate-500">Assignment akan muncul di sini setelah admin membuatnya</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const config = statusConfig[a.status] || statusConfig.draft;
            const myConfig = a.my_status ? (myStatusConfig[a.my_status] || null) : null;
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      {myConfig && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${myConfig.bg} ${myConfig.text}`}>
                          {myConfig.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{a.client_name}</p>
                    {a.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.description}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      {a.start_date && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(a.start_date).toLocaleDateString('id-ID')}
                        </span>
                      )}
                      {a.end_date && (
                        <span>s/d {new Date(a.end_date).toLocaleDateString('id-ID')}</span>
                      )}
                      {a.needed_roles.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {a.needed_roles.join(', ')}
                        </span>
                      )}
                      {a.needed_count > 0 && (
                        <span>Dibutuhkan: {a.needed_count} orang</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Link
                      href={`/dashboard/assignments/${a.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Detail
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
