'use client';

import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { CapabilityRadar, ProfileStrength, Avatar } from '../../components/ui';
import { OnboardingChecklist } from '../../components/onboarding/checklist';

type ProfileData = {
  full_name: string;
  preferred_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  timezone?: string | null;
  nationality?: string | null;
  photo_url?: string | null;
  email?: string | null;
  roles?: string[];
  expertises?: string[];
};

type Availability = {
  status?: string;
  work_locations?: string[];
  travel_ready?: boolean;
  preferred_engagements?: string[];
  max_hours_per_week?: number | null;
  available_from?: string | null;
  notes?: string | null;
};

type Assignment = {
  id: string;
  project_name: string;
  role: string;
  client?: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'planned';
  deadline: string;
  start_date?: string;
  reviewer?: string;
  reviewer_avatar?: string;
  progress?: number;
};

type Skill = {
  id: string;
  skill_name: string;
  proficiency?: string;
  category?: string;
  years_experience?: number;
};

type CapabilityData = {
  label: string;
  score: number;
};

type DashboardData = {
  status: string;
  profile: ProfileData | null;
  assignments: Assignment[];
  skills: Skill[];
  capability_scores: CapabilityData[];
  experiences?: Array<{ id: string }>;
  educations?: Array<{ id: string }>;
  certifications?: Array<{ id: string }>;
  portfolios?: Array<{ id: string }>;
  documents?: Array<{ id: string; type: string }>;
  availability: Availability | null;
};

const getPhotoUrl = (path: string | null | undefined, token?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = `${apiUrl}/api/files/view-path?path=${encodeURIComponent(path)}`;
  return token ? `${url}&token=${token}` : url;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getInitials(name?: string) {
  if (!name) return 'A';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  in_progress: { label: 'IN PROGRESS', bg: 'bg-blue-50', text: 'text-blue-700' },
  planned: { label: 'PLANNED', bg: 'bg-amber-50', text: 'text-amber-700' },
  upcoming: { label: 'UPCOMING', bg: 'bg-slate-100', text: 'text-slate-600' },
  completed: { label: 'COMPLETED', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifPopover, setShowNotifPopover] = useState<boolean>(false);
  const notifPopoverRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/notifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data || []);
          const unread = (json.data || []).filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [accessToken, apiUrl]);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmitProfile = async () => {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/associate/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setToast({ message: 'Profil berhasil dikirim untuk review!', type: 'success' });
        // Update local status state
        setData((prev) => prev ? { ...prev, status: 'pending_review' } : null);
      } else {
        setToast({ message: json.error || 'Gagal mengirim profil', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal menghubungi server', type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifPopoverRef.current && !notifPopoverRef.current.contains(e.target as Node)) {
        setShowNotifPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAsRead = async (notifId: string) => {
    if (!accessToken) return;
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const res = await fetch(`${apiUrl}/api/associate/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        window.dispatchEvent(new Event('update-notif-count'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user || !accessToken) return;
    fetch(`${apiUrl}/api/associate/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success && d.data) {
          const associate = d.data;
          setData({
            status: associate.status || 'draft',
            profile: associate.profile || null,
            assignments: associate.assignments || [],
            skills: associate.skills || [],
            capability_scores: associate.capability_scores || [],
            experiences: associate.experiences || [],
            educations: associate.educations || [],
            certifications: associate.certifications || [],
            portfolios: associate.portfolios || [],
            documents: associate.documents || [],
            availability: associate.availability || null,
          });
        }
      })
      .catch(() => { console.error('Gagal memuat data profil'); })
      .finally(() => setLoading(false));
  }, [user, accessToken, apiUrl]);

  // ⌘K / Ctrl+K shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        searchRef.current?.blur();
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  type SearchResult = { type: string; label: string; sublabel: string; href: string };

  const searchResults: SearchResult[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || !data) return [];
    const results: SearchResult[] = [];

    // Search assignments
    (data.assignments || []).forEach((a) => {
      const haystack = `${a.project_name} ${a.role} ${a.client || ''}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          type: 'Assignment',
          label: a.project_name,
          sublabel: a.role,
          href: `/dashboard/assignments/${a.id}`,
        });
      }
    });

    // Search skills
    (data.skills || []).forEach((s) => {
      if (s.skill_name.toLowerCase().includes(q)) {
        results.push({
          type: 'Skill',
          label: s.skill_name,
          sublabel: s.category || 'Skill',
          href: '/dashboard/profile?tab=skills',
        });
      }
    });

    // Search expertises
    (data.profile?.expertises || []).forEach((e) => {
      if (e.toLowerCase().includes(q)) {
        results.push({
          type: 'Keahlian',
          label: e,
          sublabel: 'Expertise',
          href: '/dashboard/profile?tab=profile',
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, data]);

  const PROFILE_RING_RADIUS = 56;
  const PROFILE_RING_CIRC = 2 * Math.PI * PROFILE_RING_RADIUS;

  const completionPercentage = (() => {
    if (!data) return 0;
    let filled = 0;
    const total = 10;
    if (data.profile?.full_name) filled++;
    if (data.documents && data.documents.length > 0) filled++;
    if (data.experiences && data.experiences.length > 0) filled++;
    if (data.educations && data.educations.length > 0) filled++;
    if (data.skills && data.skills.length > 0) filled++;
    if (data.profile?.expertises && data.profile.expertises.length > 0) filled++;
    if (data.profile?.photo_url) filled++;
    if (data.availability && (Array.isArray(data.availability) ? data.availability[0]?.status : data.availability?.status)) filled++;
    if (data.certifications && data.certifications.length > 0) filled++;
    if (data.portfolios && data.portfolios.length > 0) filled++;
    return Math.round((filled / total) * 100);
  })();

  const capabilityScore = (() => {
    if (!data?.skills || data.skills.length === 0) return 0;
    const levelMap: Record<string, number> = { beginner: 25, intermediate: 50, advanced: 75, expert: 95 };
    let total = 0;
    for (const s of data.skills) {
      const prof = String(s.proficiency || '').toLowerCase();
      const lvl = levelMap[prof] || 50;
      total += lvl;
    }
    return Math.round(total / data.skills.length);
  })();

  const cvDoc = data?.documents?.find((d) => d.type === 'cv');
  const hasCV = !!cvDoc;
  const hasExperience = !!(data?.experiences && data.experiences.length > 0);
  const hasEducation = !!(data?.educations && data.educations.length > 0);
  const hasSkills = !!(data?.skills && data.skills.length > 0);
  const hasCertifications = !!(data?.certifications && data.certifications.length > 0);
  const hasPortfolio = !!(data?.portfolios && data.portfolios.length > 0);

  // Notification count = incomplete profile items
  const notificationCount = (() => {
    if (!data) return 0;
    let count = 0;
    if (!data.profile?.full_name) count++;
    if (!data.profile?.photo_url) count++;
    if (!hasCV) count++;
    if (!hasExperience) count++;
    if (!hasEducation) count++;
    if (!hasSkills) count++;
    if (!hasCertifications) count++;
    if (!hasPortfolio) count++;
    return count;
  })();

  const capabilityData: CapabilityData[] = data?.skills?.length
    ? data.skills.map((s) => {
        const levelMap: Record<string, number> = { beginner: 25, intermediate: 50, advanced: 75, expert: 95 };
        const prof = String(s.proficiency || '').toLowerCase();
        return {
          label: s.skill_name.length > 14 ? s.skill_name.slice(0, 14) + '…' : s.skill_name,
          score: levelMap[prof] || 50,
        };
      })
    : [];

  const inProgressAssignments = data?.assignments.filter((a) => a.status === 'in_progress') || [];
  const otherAssignments = data?.assignments.filter((a) => a.status !== 'in_progress').slice(0, 2) || [];

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
    <div className="space-y-6 relative">
      {/* Floating feedback toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold text-white bg-slate-900 border-slate-800">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
            {toast.type === 'success' ? (
              <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="h-3 w-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {getGreeting()}, {data?.profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-sm text-slate-500">Berikut perkembangan aktivitas Anda hari ini.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className={`relative hidden sm:block transition-all`} ref={searchDropdownRef}>
            <div className={`relative ${searchFocused ? 'w-80' : 'w-64'} transition-all`}>
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Cari sesuatu..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-12 text-sm text-slate-900 outline-none transition-colors focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B]/20"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                ⌘K
              </kbd>
            </div>
            {/* Search Results Dropdown */}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-slate-500">Tidak ada hasil untuk &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <Link
                        key={`${r.type}-${i}`}
                        href={r.href}
                        onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B2C6B]/10">
                          {r.type === 'Assignment' ? (
                            <svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          ) : r.type === 'Skill' ? (
                            <svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          ) : (
                            <svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          )}
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
          {/* Notifications Popover */}
          <div className="relative" ref={notifPopoverRef}>
            <button
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifPopover && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-900">Notifikasi ({unreadCount})</span>
                  <Link 
                    href="/dashboard/notifications" 
                    onClick={() => setShowNotifPopover(false)}
                    className="text-[10px] font-bold text-[#0B2C6B] hover:underline"
                  >
                    Lihat Semua
                  </Link>
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">
                      Tidak ada notifikasi baru
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkAsRead(notif.id)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${!notif.read ? 'bg-[#0B2C6B]' : 'bg-transparent'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${!notif.read ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{notif.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                          <p className="text-[9px] text-slate-400 mt-1">
                            {new Date(notif.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {/* User */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-[#0B2C6B] flex items-center justify-center">
              {data?.profile?.photo_url ? (
                <img src={getPhotoUrl(data.profile.photo_url, accessToken)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                  {getInitials(data?.profile?.full_name || user?.email)}
                </div>
              )}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-slate-900">{data?.profile?.full_name || user?.email}</p>
              <p className="text-[11px] text-slate-400">Associate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Status Profil */}
      {data && (
        <>
          {data.status === 'draft' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Profil Berstatus Draft</h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Profil Anda saat ini berstatus Draft dan belum dapat diajukan ke assignment. Silakan kirimkan profil Anda untuk direview oleh admin.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSubmitProfile}
                disabled={submitting}
                className="flex-shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow transition-colors disabled:opacity-50 animate-pulse hover:animate-none"
              >
                {submitting ? 'Mengirim...' : 'Kirim Profil untuk Review'}
              </button>
            </div>
          )}

          {data.status === 'pending_review' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#0B2C6B]">
                <svg className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Profil Sedang Ditinjau (Under Review)</h4>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                  Terima kasih! Profil Anda saat ini sedang ditinjau oleh tim Reviewer BinaHub. Kami akan segera memproses akun Anda untuk penempatan tugas.
                </p>
              </div>
            </div>
          )}

          {data.status === 'suspended' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-900">Profil Ditangguhkan (Suspended)</h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  Akun Anda saat ini ditangguhkan oleh tim administrator. Silakan hubungi pusat bantuan atau admin BinaHub untuk bantuan lebih lanjut.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Profile Hero & Completion Banner */}
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#0B2C6B] via-[#1440a0] to-[#1e3a8a] p-6 sm:p-8 shadow-lg text-white">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left/Middle: Profile Block (2 cols on large screens) */}
          <div className="lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-8">
            {/* Avatar Photo Widget */}
            <div className="relative flex-shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white/30 shadow-lg sm:h-24 sm:w-24 bg-slate-100 flex items-center justify-center">
                {data?.profile?.photo_url ? (
                  <img src={getPhotoUrl(data.profile.photo_url, accessToken)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Avatar name={data?.profile?.full_name} size="xl" className="h-full w-full" />
                )}
              </div>
            </div>

            {/* Name & Info */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold sm:text-2xl truncate">
                {data?.profile?.full_name || 'Lengkapi Profil Anda'}
              </h1>

              {/* Badge Status Verifikasi Profil */}
              <div className="mt-2 flex flex-wrap gap-2">
                {data?.status === 'draft' && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/25 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-200 uppercase tracking-wide">
                    Status: Draft
                  </span>
                )}
                {data?.status === 'pending_review' && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/25 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-200 uppercase tracking-wide animate-pulse">
                    Status: Under Review
                  </span>
                )}
                {data?.status === 'active' && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/25 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200 uppercase tracking-wide">
                    Status: Active
                  </span>
                )}
                {data?.status === 'suspended' && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-500/25 border border-rose-400/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-200 uppercase tracking-wide">
                    Status: Suspended
                  </span>
                )}
              </div>
              
              <div className="mt-4 flex flex-col gap-3">
                {/* Bidang */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Bidang</span>
                  <div className="flex flex-wrap gap-1.5">
                    {data?.profile?.roles && data.profile.roles.length > 0 ? (
                      data.profile.roles.map((role) => (
                        <span key={role} className="rounded-md bg-white/25 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-white/50 italic">Belum diisi</span>
                    )}
                  </div>
                </div>

                {/* Keahlian */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Keahlian</span>
                  <div className="flex flex-wrap gap-1.5">
                    {data?.profile?.expertises && data.profile.expertises.length > 0 ? (
                      data.profile.expertises.map((exp) => (
                        <span key={exp} className="rounded-md bg-black/25 border border-white/5 px-2.5 py-0.5 text-xs text-white/95">
                          {exp}
                        </span>
                      ))
                    ) : data?.skills && data.skills.length > 0 ? (
                      data.skills.map((sk) => (
                        <span key={sk.id} className="rounded-md bg-black/25 border border-white/5 px-2.5 py-0.5 text-xs text-white/95">
                          {sk.skill_name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-white/50 italic">Belum diisi</span>
                    )}
                  </div>
                </div>

                {/* Availability */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Status</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = data?.availability?.status || 'open';
                      const isAvailable = status === 'open' || status === 'available';
                      const isBusy = status === 'busy' || status === 'limited';
                      
                      let badgeClass = 'bg-rose-500/20 border-rose-400/30 text-rose-100';
                      let dotClass = 'bg-rose-400';
                      let text = 'Not Available';
                      
                      if (isAvailable) {
                        badgeClass = 'bg-green-500/20 border-green-400/30 text-green-100';
                        dotClass = 'bg-green-400';
                        text = 'Available';
                      } else if (isBusy) {
                        badgeClass = 'bg-yellow-500/20 border-yellow-400/30 text-yellow-100';
                        dotClass = 'bg-yellow-400';
                        text = 'Limited / Busy';
                      }
                      
                      return (
                        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${badgeClass}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                          {text}
                        </div>
                      );
                    })()}
                    {data?.availability?.work_locations && data.availability.work_locations.length > 0 && (
                      <span className="text-xs text-white/80 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        {data.availability.work_locations.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Profile Completion & Next Step */}
          <div className="flex flex-col sm:flex-row lg:flex-col justify-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 flex-shrink-0">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeDasharray={`${(completionPercentage / 100) * PROFILE_RING_CIRC} ${PROFILE_RING_CIRC}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{completionPercentage}%</span>
                </div>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Kelengkapan Profil</h2>
                <p className="text-xs text-white/70 mt-0.5">Lengkapi profil Anda untuk penugasan proyek.</p>
                <Link
                  href="/dashboard/profile"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline"
                >
                  Ubah Profil ➔
                </Link>
              </div>
            </div>

            {/* Quick Upload CV Action - only show if no CV yet */}
            {!hasCV && (
              <div className="flex-1 flex items-center justify-between gap-4 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">Unggah CV Anda</h3>
                  <p className="text-[10px] text-white/70 truncate">Sistem akan mengisi profil secara otomatis</p>
                </div>
                <Link
                  href="/dashboard/profile?tab=documents"
                  className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#0B2C6B] hover:bg-white/90 transition-colors"
                >
                  Unggah CV
                </Link>
              </div>
            )}
            {hasCV && (
              <div className="flex-1 flex items-center justify-between gap-3 rounded-xl bg-emerald-500/15 border border-emerald-400/20 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <svg className="h-4 w-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-emerald-100 truncate">CV Terunggah</h3>
                    <p className="text-[10px] text-emerald-200/70 truncate">Profil terisi otomatis dari CV</p>
                  </div>
                </div>
                {cvDoc && (
                  <a
                    href={`${apiUrl}/api/files/${cvDoc.id}/view${accessToken ? `?token=${accessToken}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:text-white transition-colors"
                  >
                    Lihat CV
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CV Upload Banner - Prominent when no CV */}
      {!hasCV && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-[#0B2C6B]/30 bg-gradient-to-r from-[#0B2C6B]/5 to-[#D9A441]/5 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] shadow-lg shadow-[#0B2C6B]/25 flex-shrink-0">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-slate-900">Langkah Pertama: Unggah CV Anda</h3>
              <p className="text-sm text-slate-500 mt-1">
                Sistem akan menganalisis CV Anda dan mengisi profil secara otomatis secara aman dan instan.
              </p>
            </div>
            <Link
              href="/dashboard/profile?tab=documents"
              className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Unggah CV
            </Link>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kelengkapan Profil</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xl font-bold text-[#0B2C6B]">{completionPercentage}%</span>
            <div className="h-10 w-10">
              <svg className="h-10 w-10 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="#0B2C6B" strokeWidth="4" strokeDasharray={`${(completionPercentage / 100) * 125.66} 125.66`} strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Tingkatkan & update progres Anda!</p>
        </div>

        <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status Visibilitas</p>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">{completionPercentage >= 50 ? 'Publik' : 'Privat'}</p>
          <p className="text-[11px] text-slate-400">{completionPercentage >= 50 ? 'Dapat dilihat reviewer' : 'Hanya terlihat oleh Anda'}</p>
          <Link href="/dashboard/profile" className="mt-1 inline-block text-[11px] font-bold text-[#0B2C6B] hover:underline">Ubah</Link>
        </div>


        <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Skor Kapabilitas</p>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">{capabilityScore > 0 ? capabilityScore : '--'}</p>
          <p className="text-[11px] text-slate-400">{capabilityScore > 0 ? 'Berdasarkan keahlian Anda' : 'Tambah keahlian untuk melihat skor'}</p>
        </div>

        <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Availability</p>
          </div>
          <p className={`mt-2 text-lg font-bold ${
            (data?.availability?.status || 'open') === 'open' 
              ? 'text-emerald-600' 
              : (data?.availability?.status || 'open') === 'busy' 
              ? 'text-amber-600' 
              : 'text-slate-400'
          }`}>
            {(data?.availability?.status || 'open') === 'open' 
              ? 'Available' 
              : (data?.availability?.status || 'open') === 'busy' 
              ? 'Busy' 
              : 'Not Available'}
          </p>
          <p className="text-[11px] text-slate-400">Status Ketersediaan Anda</p>
          <Link href="/dashboard/profile" className="mt-1 inline-block text-[11px] font-bold text-[#0B2C6B] hover:underline">Ubah Status</Link>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* My Assignments */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Proyek Saya</h2>
              <Link href="/dashboard/assignments" className="flex items-center gap-1 text-xs font-medium text-[#0B2C6B] hover:underline">
                Lihat semua proyek
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {data?.assignments.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-slate-900">Belum ada proyek ditugaskan</p>
                <p className="mt-1 text-xs text-slate-500">Lengkapi profil Anda agar sistem dapat mencocokkan proyek</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {inProgressAssignments.map((assignment) => {
                  const config = statusConfig[assignment.status] || statusConfig.upcoming;
                  return (
                    <div key={assignment.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{assignment.project_name}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {assignment.role}
                          </span>
                          {assignment.client && (
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {assignment.client}
                            </span>
                          )}
                        </div>
                        {assignment.status === 'in_progress' && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: `${assignment.progress || 0}%` }} />
                            </div>
                            <span className="text-[11px] font-medium text-slate-500">{assignment.progress || 0}%</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-900">
                          {assignment.status === 'in_progress' ? 'Batas Waktu' : 'Tanggal Mulai'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(assignment.status === 'in_progress' ? assignment.deadline : assignment.start_date || assignment.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {assignment.reviewer && (
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <div className="h-6 w-6 overflow-hidden rounded-full bg-slate-200">
                              {assignment.reviewer_avatar ? (
                                <img src={getPhotoUrl(assignment.reviewer_avatar)} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[8px] font-semibold text-slate-500">
                                  {getInitials(assignment.reviewer)}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{assignment.reviewer}</span>
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/assignments/${assignment.id}`}
                        className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A255A] transition-colors"
                      >
                        Lanjutkan Pekerjaan
                      </Link>
                    </div>
                  );
                })}

                {otherAssignments.map((assignment) => {
                  const config = statusConfig[assignment.status] || statusConfig.upcoming;
                  return (
                    <div key={assignment.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{assignment.project_name}</p>
                        <p className="text-xs text-slate-500">{assignment.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-900">Tanggal Mulai</p>
                        <p className="text-xs text-slate-500">
                          {new Date(assignment.start_date || assignment.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/assignments/${assignment.id}`}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Lihat
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Capability Snapshot */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Ringkasan Kapabilitas</h2>
              </div>
              <CapabilityRadar data={capabilityData} size={240} />
            </div>

            {/* Rekomendasi Sistem */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Rekomendasi Sistem</h2>
                <span className="rounded-full bg-[#0B2C6B]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0B2C6B]">Baru</span>
              </div>
              
              {!hasCV ? (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Halo {data?.profile?.full_name?.split(' ')[0] || 'Associate'},</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Berdasarkan profil Anda, kami menyarankan untuk mengunggah CV agar sistem AI dapat melengkapi profil Anda secara otomatis.
                  </p>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">Potensi Dampak</p>
                    <p className="text-sm font-bold text-[#0B2C6B]">+40% Kelengkapan Profil</p>
                  </div>
                  <Link
                    href="/dashboard/profile?tab=documents"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Unggah CV Anda
                  </Link>
                </div>
              ) : !hasCertifications ? (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Halo {data?.profile?.full_name?.split(' ')[0] || 'Associate'},</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Berdasarkan profil Anda, kami menyarankan untuk menambahkan sertifikasi profesional guna meningkatkan visibilitas Anda kepada reviewer.
                  </p>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">Potensi Dampak</p>
                    <p className="text-sm font-bold text-emerald-600">+20% Visibilitas Profil</p>
                  </div>
                  <Link
                    href="/dashboard/profile?tab=certifications"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Tambah Sertifikasi
                  </Link>
                </div>
              ) : !hasPortfolio ? (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Halo {data?.profile?.full_name?.split(' ')[0] || 'Associate'},</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Berdasarkan profil Anda, kami menyarankan untuk menambahkan portofolio hasil proyek untuk memperkuat bukti kompetensi kerja Anda.
                  </p>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">Potensi Dampak</p>
                    <p className="text-sm font-bold text-emerald-600">+15% Ketertarikan Reviewer</p>
                  </div>
                  <Link
                    href="/dashboard/profile?tab=portfolio"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Tambah Portofolio
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Halo {data?.profile?.full_name?.split(' ')[0] || 'Associate'},</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Luar biasa! Profil Anda saat ini sudah sangat lengkap dan siap untuk mendapatkan penugasan proyek dari tim admin BinaHub.
                  </p>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">Status Profil</p>
                    <p className="text-sm font-bold text-emerald-600">100% Siap Penugasan</p>
                  </div>
                  <Link
                    href="/dashboard/assignments"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Lihat Proyek Aktif
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
 
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Onboarding Checklist */}
          <OnboardingChecklist 
            hasCV={hasCV}
            hasProfile={!!data?.profile?.full_name}
            hasCapability={capabilityScore > 0}
          />
 
          {/* Profile Strength */}
          <div id="profile-strength">
            <ProfileStrength
              percentage={completionPercentage}
              hasCV={hasCV}
              hasExperience={hasExperience}
              hasSkills={hasSkills}
              hasCertifications={hasCertifications}
              hasPortfolio={hasPortfolio}
              hasEducation={hasEducation}
              hasPhoto={!!data?.profile?.photo_url}
              hasRoles={!!(data?.profile?.roles && data.profile.roles.length > 0)}
              hasAvailability={!!(data?.availability && (Array.isArray(data.availability) ? data.availability[0]?.status : data.availability?.status))}
              hasFullName={!!data?.profile?.full_name}
            />
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Aktivitas Terbaru</h3>
              <Link href="/dashboard/notifications" className="text-xs font-medium text-[#0B2C6B] hover:underline">Lihat semua</Link>
            </div>
            <div className="space-y-4">
              {!hasCV && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">Unggah CV Anda</p>
                    <p className="text-[11px] text-slate-500">Profil akan terisi otomatis dari CV</p>
                  </div>
                  <Link href="/dashboard/profile?tab=documents" className="text-[10px] font-semibold text-[#0B2C6B] hover:underline">Unggah</Link>
                </div>
              )}
              {!data?.profile?.full_name && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">Lengkapi nama Anda</p>
                    <p className="text-[11px] text-slate-500">Isi nama lengkap di profil</p>
                  </div>
                  <Link href="/dashboard/profile?tab=profile" className="text-[10px] font-semibold text-[#0B2C6B] hover:underline">Isi</Link>
                </div>
              )}
              {!hasExperience && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">Tambah pengalaman kerja</p>
                    <p className="text-[11px] text-slate-500">Riwayat karir meningkatkan visibilitas</p>
                  </div>
                  <Link href="/dashboard/profile?tab=experience" className="text-[10px] font-semibold text-[#0B2C6B] hover:underline">Tambah</Link>
                </div>
              )}
              {hasCV && hasExperience && data?.profile?.full_name && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">Profil sudah lengkap!</p>
                    <p className="text-[11px] text-slate-500">Terus perbarui untuk mendapat match terbaik</p>
                  </div>
                  <span className="text-[10px] text-slate-400">✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
