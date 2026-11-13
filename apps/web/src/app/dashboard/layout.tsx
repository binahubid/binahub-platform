'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { OnboardingProvider } from '../../components/onboarding/context';
import { OnboardingModal } from '../../components/onboarding/onboarding-modal';
import { ToastProvider } from '../../components/ui';
import { AppBootLogo } from '@/components/ui/app-boot-logo';
import { useAmsNotifications } from '@/components/notifications/provider';
import { ConsultantTeamProvider, ConsultantPortalEntry } from '@/components/consultant-team-context';

const sidebarSections = [
  {
    label: '',
    items: [
      { href: '/dashboard', label: 'Beranda', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ],
  },
  {
    label: 'Pekerjaan',
    items: [
      { href: '/dashboard/assignments', label: 'Penugasan', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { href: '/dashboard/reviews', label: 'Evaluasi', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/dashboard/profile', label: 'Profil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', id: 'sidebar-profile' },
    ],
  },
];

const bottomNavItems = [
  { href: '/dashboard', label: 'Beranda', icon: 'home' },
  { href: '/dashboard/assignments', label: 'Penugasan', icon: 'assignments' },
  { href: '/dashboard/profile', label: 'Profil', icon: 'profile' },
  { href: '/dashboard/notifications', label: 'Notifikasi', icon: 'notifications' },
];

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { unread: notifCount } = useAmsNotifications();
  const role = user?.app_metadata?.role;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (!loading && user && role === 'admin') {
      router.replace('/admin');
    } else if (!loading && user && role === 'reviewer') {
      router.replace('/admin/reviews');
    }
  }, [user, loading, role, router]);

  if (loading) return <AppBootLogo />;

  if (!user || role === 'admin' || role === 'reviewer') return null;

  const initials = user.email?.substring(0, 2).toUpperCase() || 'A';

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="ams-workspace flex min-h-screen bg-slate-50">
      <a href="#ams-main-content" className="ams-skip-link">Lewati ke konten utama</a>
      {/* Sidebar — Desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <Image src="/logo.png" alt="BinaHub" width={28} height={28} className="h-7 w-auto" priority />
          <span className="text-base font-semibold text-[#0B2C6B]">BinaHub</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sidebarSections.map((section, idx) => (
            <div key={section.label || `section-${idx}`} className="mb-4">
              {section.label && (
                <p className="mb-2 px-3 text-xs font-medium text-slate-600">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    id={(item as any).id}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-[#0B2C6B]/10 text-[#0B2C6B] font-semibold ring-1 ring-inset ring-[#0B2C6B]/10'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                    {item.href === '/dashboard/notifications' && notifCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {notifCount > 99 ? '99+' : notifCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <ConsultantPortalEntry navigation />
        <div className="mx-3 mb-3 border-t border-slate-100 pt-3 space-y-1">
          <Link
            href="/dashboard/notifications"
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              isActive('/dashboard/notifications')
                ? 'bg-[#0B2C6B]/10 text-[#0B2C6B] font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Notifikasi</span>
            {notifCount > 0 && (
              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white">
                {notifCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              isActive('/dashboard/settings')
                ? 'bg-[#0B2C6B]/10 text-[#0B2C6B] font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Pengaturan</span>
          </Link>

          <a
            href="https://wa.me/6281383521750"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <svg className="h-4 w-4 text-[#0B2C6B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pusat Bantuan</span>
          </a>

          <Link
            href="/skk"
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              pathname === '/skk'
                ? 'bg-[#0B2C6B]/10 text-[#0B2C6B] font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Syarat & Ketentuan</span>
          </Link>
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B2C6B] text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
              <p className="text-xs text-slate-600">Associate</p>
            </div>
            <button type="button" aria-label="Keluar" onClick={signOut} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600" title="Keluar">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <header className="ams-mobile-header fixed inset-x-0 top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Image src="/full-logo.png" alt="BinaHub" width={100} height={28} className="h-auto w-[100px]" priority />
        <Link
          href={isActive('/dashboard/notifications') ? '/dashboard/settings#notifikasi-hp' : '/dashboard/settings'}
          aria-current={isActive('/dashboard/settings') ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold ${isActive('/dashboard/settings') ? 'bg-blue-50 text-[#0B2C6B]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Pengaturan
        </Link>
      </header>

      <nav aria-label="Navigasi utama" className="ams-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] lg:hidden">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          const count = item.href === '/dashboard/notifications' ? notifCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 ${active ? 'font-semibold text-[#0B2C6B]' : 'font-medium text-slate-600 hover:text-[#0B2C6B]'}`}
            >
              <span className="relative grid h-8 w-12 place-items-center rounded-full">
                <Image src={'/workspace-icons/' + item.icon + '.webp'} alt="" width={33} height={33} className="ams-tab-art" unoptimized />
                {count > 0 && (
                  <span aria-hidden="true" className="absolute -top-1 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span className="text-[11px]">{item.label}</span>
              {count > 0 && <span className="sr-only">, {count} belum dibaca</span>}
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main id="ams-main-content" tabIndex={-1} className="min-w-0 flex-1 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0 lg:pl-60">
        <div className="ams-content mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </div>
      </main>

      {/* Onboarding Modal */}
      <OnboardingModal />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <OnboardingProvider>
        <ConsultantTeamProvider><DashboardLayoutInner>{children}</DashboardLayoutInner></ConsultantTeamProvider>
      </OnboardingProvider>
    </ToastProvider>
  );
}
