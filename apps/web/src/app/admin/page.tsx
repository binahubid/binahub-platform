'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

type Stats = {
  total: number;
  pending_review: number;
  active: number;
  draft: number;
  new_this_week: number;
  incomplete_profiles: number;
  total_documents: number;
  cv_uploaded_today: number;
};

type PendingAssociate = {
  id: string;
  email: string;
  status: string;
  profile?: { full_name: string; headline?: string } | null;
  created_at: string;
};

type Activity = {
  icon: string;
  iconBg: string;
  iconColor: string;
  text: string;
  time: string;
  id: string;
};

type Capability = {
  label: string;
  value: number;
};

export default function AdminDashboard() {
  const { user, accessToken } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0, pending_review: 0, active: 0, draft: 0,
    new_this_week: 0, incomplete_profiles: 0,
    total_documents: 0, cv_uploaded_today: 0,
  });
  const [pending, setPending] = useState<PendingAssociate[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    if (!user || !accessToken) return;
    Promise.allSettled([
      fetch(`${apiUrl}/api/admin/stats`, { headers }).then((r) => r.json()),
      fetch(`${apiUrl}/api/admin/associates?status=pending_review&limit=5`, { headers }).then((r) => r.json()),
      fetch(`${apiUrl}/api/admin/activities?limit=5`, { headers }).then((r) => r.json()),
      fetch(`${apiUrl}/api/admin/capabilities`, { headers }).then((r) => r.json()),
    ])
      .then(([statsResult, pendingResult, activitiesResult, capResult]) => {
        if (statsResult.status === 'fulfilled' && statsResult.value.success) setStats(statsResult.value.data);
        if (pendingResult.status === 'fulfilled' && pendingResult.value.success) setPending(pendingResult.value.data || []);
        if (activitiesResult.status === 'fulfilled' && activitiesResult.value.success) setActivities(activitiesResult.value.data || []);
        if (capResult.status === 'fulfilled' && capResult.value.success) setCapabilities(capResult.value.data || []);
        setLoading(false);
      });
  }, [user, accessToken, apiUrl]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat pagi';
    if (h < 17) return 'Selamat siang';
    return 'Selamat malam';
  })();

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    || user?.email?.split('@')[0];
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const maxCap = capabilities.length > 0 ? Math.max(...capabilities.map((c) => c.value)) : 1;

  const completionPct = stats.total > 0
    ? Math.round(((stats.total - stats.incomplete_profiles) / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D9A441]">Talent Operations</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Berikut ringkasan talent operations BinaHub hari ini.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {today}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatBox
          label="Associate Aktif"
          value={stats.active.toLocaleString('id-ID')}
          sub={`${stats.total} total`}
          icon="users"
          iconBg="bg-[#0B2C6B]/10"
          iconColor="text-[#0B2C6B]"
        />
        <StatBox
          label="Pending Review"
          value={stats.pending_review.toLocaleString('id-ID')}
          sub="Menunggu review"
          icon="clock"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatBox
          label="Profile Lengkap"
          value={`${completionPct}%`}
          sub={`${stats.incomplete_profiles} belum lengkap`}
          icon="check"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatBox
          label="CV Diupload"
          value={stats.total_documents.toLocaleString('id-ID')}
          sub={`${stats.cv_uploaded_today} hari ini`}
          icon="upload"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatBox
          label="Baru Minggu Ini"
          value={stats.new_this_week.toLocaleString('id-ID')}
          sub="Registrasi baru"
          icon="new"
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Middle Section: 3 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending Review Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Pending Review</h2>
              {stats.pending_review > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                  {stats.pending_review}
                </span>
              )}
            </div>
            <Link href="/admin/reviews" className="flex items-center gap-1 text-xs font-medium text-[#0B2C6B] hover:underline">
              Lihat semua
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : pending.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-900">Tidak ada yang perlu direview</p>
              <p className="mt-1 text-xs text-slate-500">Semua profil sudah ditinjau</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Associate</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Role Utama</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dijual</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/admin/associates/${a.id}`}>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B2C6B] text-[10px] font-semibold text-white">
                            {(a.profile?.full_name || a.email).substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{a.profile?.full_name || a.email}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{a.profile?.headline || '-'}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-500">
                        {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-700">PENDING</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Aktivitas Terbaru</h2>
            <Link href="/admin/activity" className="flex items-center gap-1 text-xs font-medium text-[#0B2C6B] hover:underline">
              Lihat semua
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : activities.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">Belum ada aktivitas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${act.iconBg}`}>
                    <ActivityIcon type={act.icon} className={`h-4 w-4 ${act.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">{act.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Capability Chart + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Capability Overview */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-900">Capability Overview</h2>
          </div>
          {capabilities.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center rounded-lg bg-slate-50">
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="mt-2 text-sm text-slate-500">Belum ada data skill</p>
                <p className="mt-1 text-xs text-slate-400">Data akan muncul setelah associate mengisi profil</p>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-3" style={{ height: 200 }}>
              {capabilities.map((cap) => (
                <div key={cap.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-700">{cap.value}</span>
                  <div className="w-full rounded-t bg-[#0B2C6B]" style={{ height: `${(cap.value / maxCap) * 140}px` }} />
                  <span className="text-[9px] font-medium text-slate-500 text-center leading-tight">{cap.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickAction icon="user-add" label="Tambah Associate Baru" href="/admin/associates" />
            <QuickAction icon="assignment" label="Buat Assignment Baru" href="/admin/assignments" />
            <QuickAction icon="import" label="Import Associates (CSV)" href="/admin/associates" />
            <QuickAction icon="report" label="Generate Report" href="/admin/reports" />
            <QuickAction icon="reviewer" label="Kelola Reviewer" href="/admin/users" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, icon, iconBg, iconColor }: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-105`}>
          <StatIcon type={icon} className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
      <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function StatIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, string> = {
    users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    new: 'M12 4v16m8-8H4',
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type] || icons.users} />
    </svg>
  );
}

function ActivityIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, string> = {
    upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    check: 'M5 13l4 4L19 7',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    activity: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type] || icons.activity} />
    </svg>
  );
}

function QuickAction({ icon, label, href }: { icon: string; label: string; href: string }) {
  const icons: Record<string, string> = {
    'user-add': 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    assignment: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    import: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    report: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    reviewer: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  };
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#0B2C6B]/30 hover:bg-slate-50"
    >
      <svg className="h-5 w-5 text-[#0B2C6B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon] || icons.assignment} />
      </svg>
      {label}
    </Link>
  );
}
