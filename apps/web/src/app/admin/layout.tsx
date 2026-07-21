'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ToastProvider } from '../../components/ui';
import { usePageVisibility } from '../../hooks/use-page-visibility';

const sidebarSections = [
  {
    label: '',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ],
  },
  {
    label: 'TALENT OPERATIONS',
    items: [
      { href: '/admin/associates', label: 'Associates', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { href: '/admin/assignments', label: 'Assignments', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { href: '/admin/reviews', label: 'Reviews', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
      { href: '/admin/assessments', label: 'Assessments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { href: '/admin/development-plans', label: 'Development Plans', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    ],
  },
  {
    label: 'INSIGHTS & REPORTS',
    items: [
      { href: '/admin/analytics', label: 'Capability Analytics', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
      { href: '/admin/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/admin/activity', label: 'Activity Log', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/admin/users', label: 'Users & Reviewers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    ],
  },
];

type SearchResult = {
  type: string;
  label: string;
  sublabel: string;
  href: string;
};

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
  reference_id?: string;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.app_metadata?.role === 'admin';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const { isVisible, justBecameVisible } = usePageVisibility();

  // Fetch notifications
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
    } catch { /* ignore */ }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchNotifications();
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchNotifications]);

  useEffect(() => {
    if (isAdmin && isVisible && justBecameVisible > 0) {
      fetchNotifications();
    }
  }, [isAdmin, isVisible, justBecameVisible, fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleNotifBellClick = useCallback(() => {
    setNotifDropdownOpen((prev) => !prev);
  }, []);

  const handleNotifMarkRead = useCallback(async (id: string) => {
    if (accessToken) {
      try {
        const res = await fetch(`${apiUrl}/api/admin/notifications/${id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          fetchNotifications();
        }
      } catch { /* ignore */ }
    }
  }, [accessToken, apiUrl, fetchNotifications]);

  const handleNotifMarkAllRead = useCallback(async () => {
    if (accessToken) {
      const unread = notifications.filter((n) => !n.read);
      for (const n of unread) {
        await fetch(`${apiUrl}/api/admin/notifications/${n.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {});
      }
      fetchNotifications();
    }
  }, [accessToken, apiUrl, notifications, fetchNotifications]);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    if (notifDropdownOpen) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [notifDropdownOpen]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        searchRef.current?.blur();
        setSearchQuery('');
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults: SearchResult[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q.length < 2) return [];
    return [
      { type: 'Associates', label: 'Cari associate', sublabel: `Filter: "${searchQuery}"`, href: `/admin/associates?search=${encodeURIComponent(searchQuery)}` },
      { type: 'Reviews', label: 'Review pending', sublabel: 'Lihat associate yang perlu direview', href: '/admin/reviews' },
      { type: 'Assignments', label: 'Kelola assignment', sublabel: 'Buat dan kelola penugasan', href: '/admin/assignments' },
      { type: 'Reports', label: 'Laporan & insight', sublabel: 'Statistik dan analitik', href: '/admin/reports' },
    ];
  }, [searchQuery]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, router, isAdmin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = fullName || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const role = (user?.app_metadata?.role as string) || 'admin';

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
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
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const notifTypeConfig: Record<string, { label: string; bg: string; color: string }> = {
    accepted: { label: 'Diterima', bg: 'bg-emerald-50', color: 'text-emerald-700' },
    declined: { label: 'Ditolak', bg: 'bg-red-50', color: 'text-red-700' },
    applied: { label: 'Mendaftar', bg: 'bg-blue-50', color: 'text-blue-700' },
    completed: { label: 'Laporan', bg: 'bg-indigo-50', color: 'text-indigo-700' },
    withdrawn: { label: 'Mundur', bg: 'bg-amber-50', color: 'text-amber-700' },
    reviewed: { label: 'Direview', bg: 'bg-emerald-50', color: 'text-emerald-700' },
    revision_requested: { label: 'Revisi', bg: 'bg-yellow-50', color: 'text-yellow-700' },
    invitation: { label: 'Undangan', bg: 'bg-purple-50', color: 'text-purple-700' },
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#F5F7FA]">
        {/* Sidebar — Desktop */}
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-[#0B2C6B] lg:flex">
          <div className="flex h-16 items-center gap-3 px-6">
            <Image src="/logo.png" alt="BinaHub" width={28} height={28} className="h-7 w-auto" priority />
            <div>
              <span className="text-base font-semibold text-white">BinaHub AMS</span>
              <p className="text-[10px] text-white/50">Associate Management System</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {sidebarSections.map((section, idx) => (
              <div key={section.label || `s-${idx}`} className="mb-4">
                {section.label && (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">{section.label}</p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                          active ? 'bg-white/15 text-white font-semibold ring-1 ring-inset ring-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                        {item.label}
                        {item.href === '/admin/notifications' && unreadCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mx-3 mb-3 border-t border-white/10 pt-3 space-y-1">
            <Link
              href="/admin/notifications"
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive('/admin/notifications')
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Notifikasi</span>
              {unreadCount > 0 && (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/admin/settings"
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive('/admin/settings')
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>

            <a
              href="https://wa.me/6281383521750"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pusat Bantuan</span>
            </a>
          </div>

          <div className="border-t border-white/10 px-6 py-3">
            <p className="text-[10px] text-white/30">© {new Date().getFullYear()} BinaHub. All rights reserved.</p>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col bg-[#0B2C6B]">
              <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="BinaHub" width={24} height={24} className="h-6 w-auto" priority />
                  <span className="text-base font-semibold text-white">BinaHub AMS</span>
                </div>
                <button onClick={() => setMobileSidebarOpen(false)} className="text-white/70 hover:text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {sidebarSections.map((section, idx) => (
                  <div key={section.label || `s-${idx}`} className="mb-4">
                    {section.label && (
                      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">{section.label}</p>
                    )}
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                              active ? 'bg-white/15 text-white font-semibold ring-1 ring-inset ring-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            {item.label}
                            {item.href === '/admin/notifications' && unreadCount > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 pl-0 lg:pl-64">
          {/* Top Header */}
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="relative hidden sm:block" ref={searchContainerRef}>
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Cari associate, assignment, atau capability..."
                  className="w-72 lg:w-96 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-12 text-sm text-slate-900 outline-none transition-colors focus:border-[#0B2C6B] focus:bg-white focus:ring-1 focus:ring-[#0B2C6B]/20"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">⌘K</kbd>

                {searchFocused && searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-slate-500">Tidak ada hasil untuk &quot;{searchQuery}&quot;</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {searchResults.map((r, i) => (
                          <Link
                            key={`${r.type}-${i}`}
                            href={r.href}
                            onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B2C6B]/10 text-xs font-bold text-[#0B2C6B]">
                              {r.type === 'Associates' ? '👤' : r.type === 'Reviews' ? '⭐' : r.type === 'Assignments' ? '📋' : '📊'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">{r.label}</p>
                              <p className="text-[11px] text-slate-500">{r.type} · {r.sublabel}</p>
                            </div>
                            <svg className="h-4 w-4 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Notification Dropdown + User */}
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Notification Bell + Dropdown */}
              <div className="relative" ref={notifDropdownRef}>
                <button
                  onClick={handleNotifBellClick}
                  className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="Notifikasi"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <h3 className="text-sm font-semibold text-slate-900">Notifikasi</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleNotifMarkAllRead}
                          className="text-[11px] font-medium text-[#0B2C6B] hover:underline"
                        >
                          Tandai semua sudah dibaca
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <svg className="mx-auto h-10 w-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <p className="mt-2 text-sm text-slate-500">Belum ada notifikasi</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => {
                          const isRead = n.read || false;
                          const config = notifTypeConfig[n.type] || { label: 'Notifikasi', bg: 'bg-slate-50', color: 'text-slate-700' };
                          const targetLink = n.link || (n.reference_id ? `/admin/assignments/${n.reference_id}` : '#');
                          return (
                            <div
                              key={n.id}
                              onClick={() => { handleNotifMarkRead(n.id); setNotifDropdownOpen(false); if (targetLink !== '#') router.push(targetLink); }}
                              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-50 last:border-0 ${
                                isRead ? 'opacity-60' : ''
                              }`}
                            >
                              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${config.bg} ${config.color}`}>
                                {config.label.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-xs font-semibold ${isRead ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</p>
                                  {!isRead && <div className="h-1.5 w-1.5 rounded-full bg-[#0B2C6B] flex-shrink-0" />}
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{n.message}</p>
                                <p className="mt-1 text-[10px] text-slate-300">{getTimeAgo(n.created_at)}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="border-t border-slate-100 px-4 py-2.5">
                        <Link
                          href="/admin/notifications"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="block text-center text-[11px] font-medium text-[#0B2C6B] hover:underline"
                        >
                          Lihat Semua Notifikasi →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 border-l border-slate-200 pl-3 lg:pl-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B2C6B] text-xs font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{role}</p>
                </div>
                <button
                  onClick={signOut}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Keluar"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
