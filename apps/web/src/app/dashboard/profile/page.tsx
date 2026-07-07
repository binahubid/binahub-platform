'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Avatar, Tabs } from '../../../components/ui';
import { useSearchParams } from 'next/navigation';
import { StepIndicator, StepProfile, StepExperience, StepSkills, StepDocuments, StepAvailability } from './components';
import type { ProfileData, Experience, Document, Skill, Language, Availability, AssociateData } from './types';

// ============================================
// HELPER COMPONENTS
// ============================================

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B2C6B]/5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
        <svg className="h-7 w-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

// ============================================
// STEP DEFINITIONS
// ============================================

const STEPS = [
  { label: 'Dokumen', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Profil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'Pengalaman', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { label: 'Keahlian', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { label: 'Ketersediaan', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProfilePage() {
  const { accessToken, user } = useAuth();
  const searchParams = useSearchParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Data state
  const [profileData, setProfileData] = useState<AssociateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [viewTab, setViewTab] = useState('profile');

  // Step state (edit mode)
  const tabParam = searchParams.get('tab');
  const editParam = searchParams.get('edit');
  const [currentStep, setCurrentStep] = useState(0);

  // Profile editing state
  const [editProfile, setEditProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // AI parsing state
  const [parsingCV, setParsingCV] = useState(false);

  const showToastNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Auto-enter edit mode
  useEffect(() => {
    if (editParam === 'true' || tabParam === 'documents') {
      setIsEditing(true);
      if (tabParam === 'documents') setCurrentStep(0);
    }
  }, [editParam, tabParam]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchProfile = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setProfileData(json.data);
        if (json.data.profile) {
          setEditProfile(json.data.profile);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ============================================
  // PROFILE SAVE
  // ============================================

  const handleSaveProfile = async () => {
    if (!editProfile || !accessToken) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editProfile.full_name !== undefined) payload.fullName = editProfile.full_name;
      if (editProfile.preferred_name !== undefined) payload.preferredName = editProfile.preferred_name;
      if (editProfile.headline !== undefined) payload.headline = editProfile.headline;
      if (editProfile.bio !== undefined) payload.bio = editProfile.bio;
      if (editProfile.phone !== undefined) payload.phone = editProfile.phone;
      if (editProfile.city !== undefined) payload.city = editProfile.city;
      if (editProfile.timezone !== undefined) payload.timezone = editProfile.timezone;
      if (editProfile.nationality !== undefined) payload.nationality = editProfile.nationality;
      if (editProfile.date_of_birth !== undefined) payload.dateOfBirth = editProfile.date_of_birth;
      if (editProfile.gender !== undefined) payload.gender = editProfile.gender;
      if (editProfile.roles !== undefined) payload.roles = editProfile.roles;
      if (editProfile.expertises !== undefined) payload.expertises = editProfile.expertises;

      const res = await fetch(`${apiUrl}/api/associate/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        await fetchProfile();
        showToastNotification('Profil berhasil disimpan!', 'success');
        if (currentStep < STEPS.length - 1) {
          setTimeout(() => setCurrentStep(currentStep + 1), 500);
        }
      } else {
        showToastNotification(result?.error || 'Gagal menyimpan profil', 'error');
      }
    } catch (e) {
      showToastNotification('Gagal menyimpan profil', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // PHOTO UPLOAD
  // ============================================

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToastNotification('Ukuran foto maksimal 5MB', 'error');
      return;
    }
    try {
      const presignRes = await fetch(`${apiUrl}/api/files/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileName: `photo-${Date.now()}.jpg`, fileType: file.type, fileSize: file.size }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error('Gagal presign');
      await fetch(presignData.data.presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      const res = await fetch(`${apiUrl}/api/associate/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ photoUrl: presignData.data.storagePath }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchProfile();
        showToastNotification('Foto profil berhasil diupdate', 'success');
      }
    } catch (err) {
      showToastNotification('Gagal upload foto', 'error');
    }
  };

  // ============================================
  // AI CV PARSING
  // ============================================

  const handleParseCV = async (documentId?: string) => {
    if (!accessToken) return;
    const cvDoc = profileData?.documents.find((d) => d.type === 'cv');
    const docId = documentId || cvDoc?.id;
    if (!docId) return;
    setParsingCV(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${apiUrl}/api/ai/parse-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ document_id: docId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (json.success && json.data) {
        const parsed = json.data;
        if (parsed.name && editProfile) {
          setEditProfile({ ...editProfile, full_name: parsed.name });
        }
        await fetchProfile();
        showToastNotification('CV berhasil dianalisis oleh AI', 'success');
      } else {
        showToastNotification(json.error || 'Gagal menganalisis CV', 'error');
      }
    } catch (e) {
      const isTimeout = e instanceof DOMException && e.name === 'AbortError';
      showToastNotification(isTimeout ? 'AI timeout — silakan coba lagi.' : 'Gagal menganalisis CV', isTimeout ? 'warning' : 'error');
    } finally {
      setParsingCV(false);
    }
  };

  // ============================================
  // COMPLETENESS
  // ============================================

  const completeness = (() => {
    if (!profileData?.profile) return 0;
    const p = profileData.profile;
    let filled = 0;
    let total = 8;
    if (p.full_name) filled++;
    if (p.headline) filled++;
    if (p.bio) filled++;
    if (p.phone) filled++;
    if (p.city) filled++;
    if (p.nationality) filled++;
    if (profileData.documents.some((d) => d.type === 'cv')) filled++;
    if (profileData.skills.length > 0) filled++;
    return Math.round((filled / total) * 100);
  })();

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">Memuat profil...</p>
        </div>
      </div>
    );
  }

  const p = profileData?.profile;
  const skills = profileData?.skills || [];
  const availability = profileData?.availability;

  // ============================================
  // EDIT MODE (Step-by-Step)
  // ============================================

  if (isEditing) {
    return (
      <div className="min-h-[calc(100vh-8rem)]">
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 animate-bounce flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg border text-xs font-semibold text-white bg-slate-900 border-slate-800">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
              {toast.type === 'success' ? (
                <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : toast.type === 'warning' ? (
                <svg className="h-3 w-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              ) : (
                <svg className="h-3 w-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/50 hover:text-white"><svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Edit Profil</h1>
            <p className="text-sm text-slate-500">Lengkapi profil Anda</p>
          </div>
          <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Lihat Profil
          </button>
        </div>

        {/* Profile Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2C6B] via-[#1440a0] to-[#1e3a8a] p-6 sm:p-8 shadow-lg mb-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tNC04aDJ2MmgtMnptMCA0aDJ2MmgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group">
              <Avatar src={p?.photo_url} name={p?.full_name || user?.email} size="lg" className="ring-2 ring-white/20" />
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D9A441]">Talent Profile</p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl truncate">{p?.full_name || 'Tambahkan Nama'}</h1>
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Bidang</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p?.roles && p.roles.length > 0 ? p.roles.map((role) => <span key={role} className="rounded-md bg-white/20 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">{role}</span>) : <span className="text-xs text-white/50 italic">Belum diisi</span>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Keahlian</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p?.expertises && p.expertises.length > 0 ? p.expertises.map((exp) => <span key={exp} className="rounded-md bg-black/20 border border-white/5 px-2.5 py-0.5 text-xs text-white/90">{exp}</span>) : skills.length > 0 ? skills.map((sk) => <span key={sk.id} className="rounded-md bg-black/20 border border-white/5 px-2.5 py-0.5 text-xs text-white/90">{sk.skill_name}</span>) : <span className="text-xs text-white/50 italic">Belum diisi</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative mt-5 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-white/70">Kelengkapan Profil</span>
              <span className="text-xs font-bold text-white">{completeness}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-[#D9A441] transition-all duration-500" style={{ width: `${completeness}%` }} />
            </div>
          </div>
        </div>

        <StepIndicator currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {currentStep === 0 && <div><h2 className="text-base font-bold text-slate-900 mb-1">Upload CV Anda</h2><p className="text-xs text-slate-500 mb-6">Langkah pertama — CV akan dianalisis AI untuk mengisi profil otomatis</p><StepDocuments documents={profileData?.documents || []} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} onParseCV={handleParseCV} parsingCV={parsingCV} /></div>}
          {currentStep === 1 && <div><h2 className="text-base font-bold text-slate-900 mb-1">Data Diri & Profil</h2><p className="text-xs text-slate-500 mb-6">Isi atau perbaiki informasi Anda</p>{editProfile && <StepProfile profile={editProfile} saving={saving} onUpdate={(data) => setEditProfile(editProfile ? { ...editProfile, ...data } : null)} onSave={handleSaveProfile} />}</div>}
          {currentStep === 2 && <div><h2 className="text-base font-bold text-slate-900 mb-1">Pengalaman Kerja</h2><p className="text-xs text-slate-500 mb-6">Tambahkan riwayat pekerjaan Anda</p><StepExperience experiences={profileData?.experiences || []} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} /></div>}
          {currentStep === 3 && <div><h2 className="text-base font-bold text-slate-900 mb-1">Keahlian & Bahasa</h2><p className="text-xs text-slate-500 mb-6">Tambahkan skill dan bahasa yang Anda kuasai</p><StepSkills skills={profileData?.skills || []} languages={profileData?.languages || []} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} /></div>}
          {currentStep === 4 && <div><h2 className="text-base font-bold text-slate-900 mb-1">Ketersediaan</h2><p className="text-xs text-slate-500 mb-6">Atur ketersediaan Anda untuk proyek</p><StepAvailability availability={profileData?.availability || null} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} /></div>}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Sebelumnya</button>
            <div className="text-xs text-slate-400">{currentStep + 1} / {STEPS.length}</div>
            {currentStep < STEPS.length - 1 ? (
              <button onClick={() => { if (currentStep === 0) handleSaveProfile(); else setCurrentStep(currentStep + 1); }} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all">Selanjutnya<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            ) : (
              <button onClick={() => showToastNotification('Profil sudah lengkap!', 'success')} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700 transition-all"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Selesai</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // VIEW MODE (Original Tab Style)
  // ============================================

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg border text-xs font-semibold text-white bg-slate-900 border-slate-800">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
            {toast.type === 'success' ? <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="h-3 w-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
          </div>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/50 hover:text-white"><svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {/* Hero Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0B2C6B] via-[#1440a0] to-[#1e3a8a] p-6 sm:p-8 shadow-lg mb-6 text-white">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-4 border-white/30 shadow-lg bg-slate-100 flex items-center justify-center">
              {p?.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : <Avatar name={p?.full_name} size="xl" className="h-full w-full" />}
            </div>
            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D9A441]">Talent Profile</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl truncate">{p?.full_name || 'Lengkapi Profile Anda'}</h1>
            
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Bidang</span>
                <div className="flex flex-wrap gap-1.5">
                  {p?.roles && p.roles.length > 0 ? p.roles.map((role) => <span key={role} className="rounded-md bg-white/20 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">{role}</span>) : <span className="text-xs text-white/50 italic">Belum diisi</span>}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Keahlian</span>
                <div className="flex flex-wrap gap-1.5">
                  {p?.expertises && p.expertises.length > 0 ? p.expertises.map((exp) => <span key={exp} className="rounded-md bg-black/20 border border-white/5 px-2.5 py-0.5 text-xs text-white/90">{exp}</span>) : skills.length > 0 ? skills.map((sk) => <span key={sk.id} className="rounded-md bg-black/20 border border-white/5 px-2.5 py-0.5 text-xs text-white/90">{sk.skill_name}</span>) : <span className="text-xs text-white/50 italic">Belum diisi</span>}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Status</span>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${availability?.status === 'open' ? 'bg-green-500/20 border-green-400/30 text-green-100' : availability?.status === 'busy' ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-100' : 'bg-white/10 border-white/10 text-white/60'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${availability?.status === 'open' ? 'bg-green-400' : availability?.status === 'busy' ? 'bg-yellow-400' : 'bg-white/40'}`}></div>
                    {availability?.status === 'open' ? 'Available' : availability?.status === 'busy' ? 'Busy' : 'Not Set'}
                  </div>
                  {availability?.work_locations && availability.work_locations.length > 0 && <span className="text-xs text-white/80 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>{availability.work_locations.join(', ')}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            {profileData?.status && (
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wide ${profileData.status === 'active' ? 'bg-green-500/20 text-green-100 border border-green-400/30' : profileData.status === 'pending_review' ? 'bg-amber-500/20 text-amber-100 border border-amber-400/30' : 'bg-white/10 text-white/60 border border-white/10'}`}>
                {profileData.status === 'active' ? 'APPROVED' : profileData.status === 'pending_review' ? 'PENDING REVIEW' : 'DRAFT'}
              </span>
            )}
            <button onClick={() => setIsEditing(true)} className="rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c89438] transition-colors">Edit Profile</button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-white/70">Kelengkapan Profil</span>
            <span className="text-xs font-bold text-white">{completeness}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-[#D9A441] transition-all duration-500" style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </div>

      {/* Tab Panel */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={[{ id: 'profile', label: 'Profil' }, { id: 'experience', label: 'Pengalaman' }, { id: 'skills', label: 'Keahlian' }, { id: 'availability', label: 'Ketersediaan' }, { id: 'documents', label: 'Dokumen' }]} activeTab={viewTab} onChange={setViewTab} className="px-6 pt-4 border-b border-slate-100" />
        <div className="p-6">
          {/* PROFIL TAB */}
          {viewTab === 'profile' && (
            <div className="space-y-8">
              <div>
                <SectionHeader title="Identitas" description="Informasi dasar yang menggambarkan siapa Anda" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {p?.phone && <InfoCard label="WhatsApp" value={p.phone} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} />}
                  {p?.city && <InfoCard label="Domisili" value={p.city} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />}
                  {p?.nationality && <InfoCard label="Kewarganegaraan" value={p.nationality} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />}
                  {p?.date_of_birth && <InfoCard label="Tanggal Lahir" value={p.date_of_birth} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />}
                  {p?.gender && <InfoCard label="Jenis Kelamin" value={p.gender} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />}
                  {p?.timezone && <InfoCard label="Timezone" value={p.timezone} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />}
                </div>
              </div>
              <hr className="border-slate-100" />
              <div>
                <SectionHeader title="Identitas Profesional" description="Peran penugasan dan keahlian utama Anda" />
                <div className="space-y-6">
                  {p?.bio && <div><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Tentang Saya</h4><p className="text-sm text-slate-600 leading-relaxed">{p.bio}</p></div>}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Bidang Penugasan</h4>
                    {p?.roles && p.roles.length > 0 ? <div className="flex flex-wrap gap-2">{p.roles.map((r) => <span key={r} className="rounded-full bg-[#0B2C6B] px-3 py-1 text-xs font-semibold text-white">{r}</span>)}</div> : <p className="text-xs text-slate-400 italic">Belum ada bidang penugasan dipilih</p>}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Keahlian Utama</h4>
                    {p?.expertises && p.expertises.length > 0 ? <div className="flex flex-wrap gap-2">{p.expertises.map((e) => <span key={e} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{e}</span>)}</div> : skills.length > 0 ? <div className="flex flex-wrap gap-2">{skills.map((sk) => <span key={sk.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{sk.skill_name}</span>)}</div> : <p className="text-xs text-slate-400 italic">Belum ada keahlian dipilih</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PENGALAMAN TAB */}
          {viewTab === 'experience' && (
            <div>{profileData?.experiences.length === 0 ? <EmptyState text="Belum ada pengalaman kerja" /> : <div className="space-y-4">{profileData?.experiences.map((exp) => <div key={exp.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">{exp.position}</p><p className="text-xs text-[#0B2C6B] font-semibold">{exp.organization}</p><p className="text-[10px] text-slate-400 mt-1">{exp.start_date} – {exp.is_current ? 'Sekarang' : exp.end_date}</p>{exp.description && <p className="text-xs text-slate-500 mt-2">{exp.description}</p>}</div>)}</div>}</div>
          )}

          {/* KEAHLIAN TAB */}
          {viewTab === 'skills' && (
            <div className="space-y-6">
              <div><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Keahlian</h4>{profileData?.skills.length === 0 ? <p className="text-sm text-slate-500">Belum ada keahlian.</p> : <div className="flex flex-wrap gap-2">{profileData?.skills.map((s) => <span key={s.id} className="rounded-full bg-[#0B2C6B]/10 px-3 py-1 text-xs font-semibold text-[#0B2C6B]">{s.skill_name} {s.proficiency && `(${s.proficiency})`}</span>)}</div>}</div>
              <div><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Bahasa</h4>{profileData?.languages.length === 0 ? <p className="text-sm text-slate-500">Belum ada bahasa.</p> : <div className="flex flex-wrap gap-2">{profileData?.languages.map((l) => <span key={l.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{l.language} ({l.proficiency})</span>)}</div>}</div>
            </div>
          )}

          {/* KETERSEDIAAN TAB */}
          {viewTab === 'availability' && (
            <div>{!profileData?.availability ? <EmptyState text="Belum ada ketersediaan" /> : <div className="space-y-4"><div className="flex items-center gap-3"><div className={`h-3 w-3 rounded-full ${profileData.availability.status === 'open' ? 'bg-emerald-500' : profileData.availability.status === 'busy' ? 'bg-amber-500' : 'bg-red-500'}`} /><span className="text-sm font-medium text-slate-700">{profileData.availability.status === 'open' ? 'Open for Opportunities' : profileData.availability.status === 'busy' ? 'Busy' : 'Not Available'}</span></div>{profileData.availability.work_locations && profileData.availability.work_locations.length > 0 && <div><p className="text-xs font-semibold text-slate-400 mb-1">Lokasi Kerja</p><div className="flex flex-wrap gap-2">{profileData.availability.work_locations.map((l) => <span key={l} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{l}</span>)}</div></div>}</div>}</div>
          )}

          {/* DOKUMEN TAB */}
          {viewTab === 'documents' && (
            <div>{profileData?.documents.length === 0 ? <EmptyState text="Belum ada dokumen" /> : <div className="space-y-3">{profileData?.documents.filter(d => d.type === 'cv').map((doc) => <div key={doc.id} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"><svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-sm font-semibold text-slate-900">{doc.file_name}</p><p className="text-xs text-slate-500">CV – {new Date(doc.created_at).toLocaleDateString('id-ID')}</p></div></div></div>)}</div>}</div>
          )}
        </div>
      </div>
    </div>
  );
}
