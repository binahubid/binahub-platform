'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';

type AdminNotification = {
  id: string;
  type: 'accepted' | 'declined' | 'applied';
  title: string;
  message: string;
  assignment_id: string;
  assignment_title: string;
  associate_id: string;
  associate_name: string;
  status: string;
  created_at: string;
};

const typeConfig = {
  accepted: { label: 'Diterima', bg: 'bg-emerald-50', color: 'text-emerald-700', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  declined: { label: 'Ditolak', bg: 'bg-red-50', color: 'text-red-700', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  applied: { label: 'Mendaftar', bg: 'bg-blue-50', color: 'text-blue-700', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
};

export default function AdminNotificationsPage() {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'accepted' | 'declined' | 'applied'>('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setNotifications(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);
  const counts = {
    all: notifications.length,
    accepted: notifications.filter((n) => n.type === 'accepted').length,
    declined: notifications.filter((n) => n.type === 'declined').length,
    applied: notifications.filter((n) => n.type === 'applied').length,
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m lalu`;
    if (diffHours < 24) return `${diffHours}j lalu`;
    if (diffDays < 7) return `${diffDays}h lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
        <h1 className="text-2xl font-bold text-slate-900">Notifikasi</h1>
        <p className="mt-1 text-sm text-slate-500">Respon associate terhadap undangan assignment</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'applied', 'accepted', 'declined'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-[#0B2C6B] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'Semua' : f === 'applied' ? 'Mendaftar' : f === 'accepted' ? 'Diterima' : 'Ditolak'}
            {' '}({counts[f]})
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <svg className="h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Belum Ada Notifikasi</h2>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
              Notifikasi akan muncul ketika associate menerima, menolak, atau mendaftar ke assignment.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const config = typeConfig[notification.type];
            return (
              <div
                key={notification.id}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                  <svg className={`h-5 w-5 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{notification.message}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">{getTimeAgo(notification.created_at)}</span>
                    <Link
                      href={`/admin/assignments/${notification.assignment_id}`}
                      className="text-[11px] font-medium text-[#0B2C6B] hover:underline"
                    >
                      Lihat Assignment →
                    </Link>
                    <Link
                      href={`/admin/associates/${notification.associate_id}`}
                      className="text-[11px] font-medium text-slate-500 hover:underline"
                    >
                      Lihat Profil
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
