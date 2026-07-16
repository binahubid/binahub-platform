'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Notification = {
  id: string;
  type: 'review' | 'assignment' | 'reminder' | 'approval' | 'system' | 'invitation';
  title: string;
  message: string;
  created_at: string;
  invited_at?: string;
  link?: string;
  assignment_id?: string;
  read?: boolean;
};

const typeConfig = {
  review: { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', bg: 'bg-blue-50', color: 'text-blue-500' },
  assignment: { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', bg: 'bg-amber-50', color: 'text-amber-500' },
  invitation: { icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', bg: 'bg-indigo-50', color: 'text-indigo-500' },
  reminder: { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-purple-50', color: 'text-purple-500' },
  approval: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-emerald-50', color: 'text-emerald-500' },
  system: { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-slate-100', color: 'text-slate-500' },
};

export default function NotificationsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/notifications`, {
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

  const unreadCount = useMemo(() => {
    return notifications.filter((n: any) => !n.read).length;
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n: any) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const handleMarkRead = async (id: string) => {
    if (id !== 'welcome-notification' && accessToken) {
      try {
        const res = await fetch(`${apiUrl}/api/associate/notifications/${id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          // Re-fetch count for header and refresh page notifications
          fetchNotifications();
          window.dispatchEvent(new Event('update-notif-count'));
        }
      } catch { /* ignore */ }
    } else {
      // For welcome-notification or system notifications, update UI locally
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const handleNotifClick = async (notification: Notification) => {
    await handleMarkRead(notification.id);
    const link = getNotificationLink(notification);
    if (link) router.push(link);
  };

  const handleMarkAllRead = async () => {
    if (!accessToken) return;
    const unreadNotifs = notifications.filter((n: any) => !n.read && n.id !== 'welcome-notification');
    for (const notif of unreadNotifs) {
      await fetch(`${apiUrl}/api/associate/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    fetchNotifications();
    window.dispatchEvent(new Event('update-notif-count'));
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
    return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.link) return notification.link;
    if (notification.type === 'invitation' && notification.assignment_id) {
      return `/dashboard/assignments/${notification.assignment_id}`;
    }
    return undefined;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifikasi</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#0B2C6B] hover:bg-[#0B2C6B]/5 transition-colors"
          >
            Tandai semua sudah dibaca
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-[#0B2C6B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === 'unread' ? 'bg-[#0B2C6B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <svg className="h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {filter === 'unread' ? 'Tidak Ada Notifikasi Belum Dibaca' : 'Belum Ada Notifikasi'}
            </h2>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
              {filter === 'unread'
                ? 'Semua notifikasi sudah dibaca. Periksa kembali nanti untuk notifikasi baru.'
                : 'Notifikasi mengenai undangan assignment, review, dan lainnya akan muncul di sini.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const config = typeConfig[notification.type] || typeConfig.system;
            const isRead = notification.read || false;
            return (
              <div
                key={notification.id}
                onClick={() => handleNotifClick(notification)}
                className={`flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                  isRead ? 'border-slate-200 opacity-60' : 'border-[#0B2C6B]/20 bg-[#0B2C6B]/[0.02]'
                }`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                  <svg className={`h-5 w-5 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                      {notification.title}
                    </h3>
                    {!isRead && (
                      <div className="h-2 w-2 rounded-full bg-[#0B2C6B]" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{notification.message}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">{getTimeAgo(notification.invited_at || notification.created_at)}</span>
                    {getNotificationLink(notification) && (
                      <Link
                        href={getNotificationLink(notification)!}
                        className="text-[11px] font-medium text-[#0B2C6B] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Lihat →
                      </Link>
                    )}
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
