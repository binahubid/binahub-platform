'use client';

import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { CapabilityRadar, ProfileStrength, Avatar, ServiceError } from '../../components/ui';
import { ProtectedFileLink } from '../../components/ui/protected-file';
import { WorkspaceOverview, WorkspaceShortcuts } from '@/components/ui/workspace-overview';
import { ConsultantPortalEntry } from '@/components/consultant-team-context';
import { InstallAmsCard } from '@/components/notifications/device-settings';
import { assignmentStatusLabel, assignmentStatusTone, formatAssignmentDate, nextAssignmentTransition, type AssignmentWork } from '@/lib/assignment-display';
import { useAssignmentRefresh } from '@/lib/use-assignment-refresh';

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

type Assignment = AssignmentWork & {
  id: string;
  title: string;
  client_name?: string | null;
  status: string;
  my_status?: string | null;
  my_role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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
  created_at?: string;
  profile: ProfileData | null;
  assignments: Assignment[];
  assignments_unavailable: boolean;
  skills: Skill[];
  capability_scores: CapabilityData[];
  experiences?: Array<{ id: string }>;
  educations?: Array<{ id: string }>;
  certifications?: Array<{ id: string }>;
  portfolios?: Array<{ id: string }>;
  documents?: Array<{ id: string; type: string }>;
  availability: Availability | null;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}


export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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


  const fetchDashboard = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`${apiUrl}/api/associate/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success || !body?.data) {
        throw new Error(body?.error || `Server merespons HTTP ${response.status}`);
      }

      const associate = body.data;
      setData({
        status: associate.status || 'draft',
        created_at: associate.created_at,
        profile: associate.profile || null,
        assignments: associate.assignments || [],
        assignments_unavailable: Boolean(associate.assignments_unavailable),
        skills: associate.skills || [],
        capability_scores: associate.capability_scores || [],
        experiences: associate.experiences || [],
        educations: associate.educations || [],
        certifications: associate.certifications || [],
        portfolios: associate.portfolios || [],
        documents: associate.documents || [],
        availability: Array.isArray(associate.availability) ? associate.availability[0] ?? null : associate.availability ?? null,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Gagal terhubung ke server';
      setData(null);
      setLoadError(`Profil Anda tidak dapat dimuat. ${detail}`);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    if (user && accessToken) fetchDashboard();
  }, [user, accessToken, fetchDashboard]);

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
      const haystack = `${a.title} ${a.my_role} ${a.client_name || ''}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          type: 'Assignment',
          label: a.title,
          sublabel: a.my_role || a.client_name || 'Penugasan',
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

  const cvDoc = data?.documents?.find((d) => d.type === 'cv');
  const hasCV = !!cvDoc;
  const accountAge = data?.created_at ? Date.now() - new Date(data.created_at).getTime() : Infinity;
  const isNewDraft = data?.status === 'draft' && accountAge >= 0 && accountAge < 7 * 24 * 60 * 60_000;
  const needsCvOnboarding = isNewDraft && !hasCV && completionPercentage < 50;
  const hasExperience = !!(data?.experiences && data.experiences.length > 0);
  const hasEducation = !!(data?.educations && data.educations.length > 0);
  const hasSkills = !!(data?.skills && data.skills.length > 0);
  const hasCertifications = !!(data?.certifications && data.certifications.length > 0);
  const hasPortfolio = !!(data?.portfolios && data.portfolios.length > 0);

  const capabilityData: CapabilityData[] = data?.skills?.length
    ? data.skills.slice(0, 6).map((s) => {
        const levelMap: Record<string, number> = { beginner: 25, intermediate: 50, advanced: 75, expert: 95 };
        const prof = String(s.proficiency || '').toLowerCase();
        return {
          label: s.skill_name.length > 14 ? s.skill_name.slice(0, 14) + '…' : s.skill_name,
          score: levelMap[prof] || 50,
        };
      })
    : [];

  useAssignmentRefresh(nextAssignmentTransition(data?.assignments || []), fetchDashboard, Boolean(accessToken));
  const myAssignments = data?.assignments.filter((assignment) => assignment.my_status) || [];
  const inProgressAssignments = myAssignments.filter((assignment) => assignment.work_status === 'in_progress');
  const needsFollowUp = myAssignments.filter((assignment) => assignment.work_bucket === 'follow_up');
  const upcomingAssignments = myAssignments.filter((assignment) => assignment.work_bucket === 'active' && assignment.work_status !== 'in_progress');
  const recentAssignments = [...needsFollowUp, ...inProgressAssignments, ...upcomingAssignments].slice(0, 3);

  if (loading) {
    return (
      <div role="status" className="space-y-5">
        <span className="sr-only">Memuat beranda…</span>
        <div aria-hidden="true" className="h-14 w-40 rounded-2xl bg-slate-200/70" />
        <div aria-hidden="true" className="ams-overview-grid">
          <div className="h-56 rounded-3xl bg-slate-200/70" />
          <div className="h-28 rounded-3xl bg-slate-200/50 md:h-56" />
        </div>
        <div aria-hidden="true" className="ams-panel h-44" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <ServiceError
        title="Dashboard belum dapat dibuka"
        message={loadError || 'Data profil tidak tersedia. Silakan coba lagi.'}
        onRetry={fetchDashboard}
        retrying={loading}
        className="min-h-[420px]"
      />
    );
  }

  return (
    <div className="ams-dashboard space-y-5 relative">
      {/* Floating feedback toast */}
      {toast && (
        <div role="status" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex lg:bottom-5 items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold text-white bg-slate-900 border-slate-800">
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
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm text-slate-600">{getGreeting()},</p>
          <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {data.profile?.preferred_name || data.profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          {/* Search */}
          <div className="relative hidden lg:block" ref={searchDropdownRef}>
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
                aria-label="Cari penugasan atau keahlian"
                placeholder="Cari penugasan atau keahlian"
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
          <Link href="/dashboard/profile" aria-label="Buka profil saya" className="rounded-full ring-4 ring-white shadow-sm">
            <Avatar name={data.profile?.full_name} src={data.profile?.photo_url} accessToken={accessToken} size="lg" />
          </Link>
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
                  <h4 className="text-sm font-bold text-amber-900">Profil belum diajukan</h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Ajukan profil agar tim BinaHub dapat meninjaunya sebelum Anda menerima penugasan.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSubmitProfile}
                disabled={submitting}
                className="flex-shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 min-h-11"
              >
                {submitting ? 'Mengirim...' : 'Ajukan profil'}
              </button>
            </div>
          )}

          {data.status === 'pending_review' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#0B2C6B]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Profil sedang ditinjau</h4>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                  Tim BinaHub sedang meninjau profil Anda untuk penugasan.
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
                <h4 className="text-sm font-bold text-rose-900">Profil ditangguhkan</h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  Akun Anda saat ini ditangguhkan oleh tim administrator. Silakan hubungi pusat bantuan atau admin BinaHub untuk bantuan lebih lanjut.
                </p>
              </div>
            </div>
          )}
        </>
      )}
      <div className="ams-overview-grid">
        <WorkspaceOverview
          heading="Ruang kerja Anda"
          value={data.assignments_unavailable ? null : inProgressAssignments.length}
          label="penugasan berjalan"
          detail={data.assignments_unavailable ? 'Ringkasan penugasan belum dapat dimuat' : upcomingAssignments.length + ' mendatang · ' + needsFollowUp.length + ' perlu tindak lanjut'}
          href="/dashboard/assignments"
          action="Lihat penugasan"
          completion={completionPercentage}
          completionLabel="Profil terisi"
          completionHref="/dashboard/profile"
        />
        <WorkspaceShortcuts items={[
          { label: 'Dokumen', href: '/dashboard/profile?tab=documents', tone: 'blue', artwork: 'document' },
          { label: 'Ketersediaan', href: '/dashboard/profile?tab=availability', tone: 'teal', artwork: 'availability' },
          { label: 'Asesmen', tone: 'gold', artwork: 'assessment' },
          { label: 'Pengembangan', tone: 'violet', artwork: 'development' },
        ]} />
      </div>
      <ConsultantPortalEntry />

      <div className="ams-dashboard-grid">
      <section aria-labelledby="my-assignments-heading" className="ams-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-slate-100 px-4 py-2 sm:px-5">
          <h2 id="my-assignments-heading" className="text-base font-semibold text-slate-900">Penugasan saya</h2>
          <Link href="/dashboard/assignments" className="inline-flex min-h-11 items-center text-sm font-medium text-[#0B2C6B] hover:underline">
            Lihat semua
          </Link>
        </div>
        {recentAssignments.length ? (
          <ul className="divide-y divide-slate-100">
            {recentAssignments.map((assignment) => {
              const status = assignment.work_status || assignment.my_status || assignment.status;
              const date = status === 'scheduled' ? assignment.start_date : assignment.end_date || assignment.start_date;
              return (
                <li key={assignment.id} className="ams-assignment-row">
                  <Link href={`/dashboard/assignments/${assignment.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0B2C6B] sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className={'rounded-full px-2 py-1 font-medium ' + assignmentStatusTone(status)}>
                          {assignment.work_status_label || assignmentStatusLabel(status)}
                        </span>
                        {date && <time className="text-slate-600" dateTime={date}>{formatAssignmentDate(date)}</time>}
                      </div>
                      <p className="mt-2 break-words text-[15px] font-semibold leading-6 text-slate-900">{assignment.title}</p>
                      <p className="mt-0.5 break-words text-sm text-slate-600">{[assignment.my_role, assignment.client_name].filter(Boolean).join(' · ')}</p>
                    </div>
                    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">{data.assignments_unavailable ? 'Penugasan belum dapat dimuat. Coba buka daftar penugasan.' : 'Penugasan aktif dan tindak lanjut Anda akan muncul di sini.'}</p>
        )}
      </section>

      <section aria-labelledby="profile-summary-heading" className="ams-panel self-start px-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-3 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="profile-summary-heading" className="text-base font-semibold text-slate-900">Profil saya</h2>
            {(data?.profile?.headline || data?.profile?.roles?.length) && (
              <p className="mt-0.5 break-words text-sm text-slate-600">{data.profile.headline || data.profile.roles?.[0]}</p>
            )}
          </div>
          <Link href="/dashboard/profile" className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-[#0B2C6B] hover:underline">Ubah profil</Link>
        </div>
        {data?.availability?.status && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-slate-200 py-3 text-sm">
            <span className="font-medium text-slate-900">Ketersediaan</span>
            <span className="break-words text-slate-600">
              {data.availability.status === 'available' || data.availability.status === 'open'
                ? 'Tersedia'
                : data.availability.status === 'limited' || data.availability.status === 'busy'
                  ? 'Terbatas'
                  : 'Tidak tersedia'}
              {data.availability.work_locations?.length ? ` · ${data.availability.work_locations.join(', ')}` : ''}
            </span>
          </div>
        )}
        {completionPercentage < 100 && (
          <details className="border-t border-slate-200">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[#0B2C6B]">Lengkapi data profil</summary>
            <div className="pb-4">
              <ProfileStrength
                percentage={completionPercentage}
                hasCV={hasCV}
                hasExperience={hasExperience}
                hasSkills={hasSkills}
                hasCertifications={hasCertifications}
                hasPortfolio={hasPortfolio}
                hasEducation={hasEducation}
                hasPhoto={Boolean(data?.profile?.photo_url)}
                hasRoles={Boolean(data?.profile?.roles?.length)}
                hasAvailability={Boolean(data?.availability?.status)}
                hasFullName={Boolean(data?.profile?.full_name)}
              />
            </div>
          </details>
        )}
        {needsCvOnboarding && (
          <Link href="/dashboard/profile?tab=documents" className="flex min-h-11 items-center border-t border-slate-200 py-2 text-sm font-medium text-[#0B2C6B] hover:underline">
            Unggah CV
          </Link>
        )}
        {!needsCvOnboarding && cvDoc && completionPercentage < 100 && (
          <ProtectedFileLink
            href={`${apiUrl}/api/files/${cvDoc.id}/view`}
            accessToken={accessToken}
            onOpenError={(message) => setToast({ message, type: 'error' })}
            className="flex min-h-11 items-center border-t border-slate-200 py-2 text-sm font-medium text-[#0B2C6B] hover:underline"
          >
            Lihat CV
          </ProtectedFileLink>
        )}
      </section>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="ams-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <h2 className="text-base font-semibold text-slate-900">Kapabilitas</h2>
            <Link href="/dashboard/capability" className="inline-flex min-h-11 items-center text-sm font-medium text-[#0B2C6B] hover:underline">Lihat rincian</Link>
          </div>
          {capabilityData.length >= 3 ? (
            <>
              <CapabilityRadar data={capabilityData} size={240} />
              {data.skills.length > capabilityData.length && <p className="mt-2 text-xs text-slate-600">Menampilkan {capabilityData.length} dari {data.skills.length} keahlian.</p>}
            </>
          ) : data?.skills.length ? (
            <dl className="divide-y divide-slate-200">
              {data.skills.map((skill) => (
                <div key={skill.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-3 text-sm">
                  <dt className="break-words text-slate-900">{skill.skill_name}</dt>
                  <dd className="text-slate-600">
                    {({ beginner: 'Pemula', intermediate: 'Menengah', advanced: 'Mahir', expert: 'Ahli' } as Record<string, string>)[skill.proficiency || ''] || 'Tingkat belum diisi'}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="py-3 text-sm leading-6 text-slate-600">Tambahkan keahlian pada profil Anda untuk melihat ringkasannya.</p>
          )}
        </section>
        <section className="ams-panel self-start overflow-hidden" aria-label="Evaluasi">
          {[
            {href:'/dashboard/reviews',label:'Evaluasi saya'},
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 text-sm font-medium text-slate-900 last:border-b-0 hover:bg-slate-50 sm:px-5">
              {item.label}
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </section>
      </div>
      <InstallAmsCard />
    </div>
  );
}
