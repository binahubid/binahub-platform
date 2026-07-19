'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Avatar, Tabs } from '../../../components/ui';
import { useSearchParams } from 'next/navigation';
import { StepIndicator, StepProfile, StepExperience, StepSkills, StepDocuments, StepAvailability, StepCertifications, StepPortfolio } from './components';
import { ProfileView } from './components/profile-view';
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
  { label: 'Sertifikasi', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z' },
  { label: 'Portofolio', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
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

  const getPhotoUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const url = `${apiUrl}/api/files/view-path?path=${encodeURIComponent(path)}`;
    return accessToken ? `${url}&token=${accessToken}` : url;
  };
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
  const [parsedCVData, setParsedCVData] = useState<Record<string, any> | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [importing, setImporting] = useState(false);

  const [submitting, setSubmitting] = useState(false);

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
        showToastNotification('Profil berhasil dikirim untuk review!', 'success');
        // Update local status state
        setProfileData((prev) => prev ? { ...prev, status: 'pending_review' } : null);
      } else {
        showToastNotification(json.error || 'Gagal mengirim profil', 'error');
      }
    } catch {
      showToastNotification('Gagal menghubungi server', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
      const presignRes = await fetch(`${apiUrl}/api/files/presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          fileName: `photo-${Date.now()}.jpg`,
          fileType: file.type,
          fileSize: file.size,
          ownerId: profileData?.id || user?.id,
          ownerType: 'associate',
          category: 'avatar'
        }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error('Gagal presign');
      await fetch(presignData.data.presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      const res = await fetch(`${apiUrl}/api/associate/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ photoUrl: presignData.data.path }),
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
        setParsedCVData(json.data);
        setShowPreviewModal(true);
        showToastNotification('CV berhasil dianalisis! Silakan review hasil di bawah.', 'success');
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

  const handleConfirmImport = () => {
    setShowOverwriteConfirm(true);
  };

  const executeImport = async () => {
    if (!parsedCVData || !accessToken) return;
    setImporting(true);
    setShowOverwriteConfirm(false);
    try {
      const parsed = parsedCVData;

      // Map parsed CV data payload to match backend schema format
      const payload = {
        profile: {
          fullName: parsed.fullName,
          phone: parsed.phone,
          city: parsed.location,
          headline: parsed.headline,
          bio: parsed.bio,
          nationality: parsed.nationality,
          dateOfBirth: parsed.dateOfBirth,
          gender: parsed.gender
        },
        experiences: (parsed.experience || []).map((exp: any) => ({
          organization: exp.company,
          position: exp.position,
          description: exp.description || '',
          startDate: exp.startDate || new Date().toISOString().substring(0, 7),
          endDate: exp.endDate || null,
          isCurrent: !exp.endDate
        })),
        educations: (parsed.education || []).map((edu: any) => ({
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy || '',
          startYear: edu.startYear || new Date().getFullYear() - 4,
          endYear: edu.endYear || new Date().getFullYear()
        })),
        skills: (parsed.skills || []).map((sk: any) => ({
          skillName: sk.name,
          category: sk.category || 'technical',
          proficiency: sk.proficiency || 'intermediate',
          yearsExperience: sk.yearsExperience || null
        })),
        languages: (parsed.languages || []).map((lang: any) => ({
          language: lang.language,
          proficiency: lang.proficiency || 'conversational'
        })),
        certifications: (parsed.certifications || []).map((cert: any) => ({
          name: cert.name,
          issuer: cert.issuer,
          issueDate: cert.issueDate || null,
          expiryDate: cert.expiryDate || null
        }))
      };

      // Perform a single transactional API request to import everything
      const res = await fetch(`${apiUrl}/api/associate/import-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Gagal menyimpan data impor CV');
      }

      await fetchProfile();
      setShowPreviewModal(false);
      setParsedCVData(null);
      showToastNotification('Profil berhasil diperbarui dengan data CV yang baru!', 'success');
    } catch (e: any) {
      console.error('Import error:', e);
      showToastNotification(e.message || 'Gagal mengimpor data dari CV', 'error');
    } finally {
      setImporting(false);
    }
  };

  // ============================================
  // COMPLETENESS
  // ============================================

  const completeness = (() => {
    if (!profileData) return 0;
    let filled = 0;
    const total = 10;
    if (profileData.profile?.full_name) filled++;
    if (profileData.documents && profileData.documents.length > 0) filled++;
    if (profileData.experiences && profileData.experiences.length > 0) filled++;
    if (profileData.educations && profileData.educations.length > 0) filled++;
    if (profileData.skills && profileData.skills.length > 0) filled++;
    if (profileData.profile?.expertises && profileData.profile.expertises.length > 0) filled++;
    if (profileData.profile?.photo_url) filled++;
    if (profileData.availability && profileData.availability.status) filled++;
    if (profileData.certifications && profileData.certifications.length > 0) filled++;
    if (profileData.portfolios && profileData.portfolios.length > 0) filled++;
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
      <div className="min-h-[calc(100vh-8rem)] space-y-6">
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 pr-2 sm:pr-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Perbarui Profil Anda</h1>
            <p className="text-xs text-slate-500 mt-0.5">Lengkapi data diri Anda langkah demi langkah secara profesional</p>
          </div>
          <button
            onClick={() => setIsEditing(false)}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-[#0B2C6B]/30 hover:bg-[#0B2C6B]/5 hover:text-[#0B2C6B] transition-all duration-300"
          >
            <svg className="h-4 w-4 text-slate-400 group-hover:text-[#0B2C6B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Lihat Profil
          </button>
        </div>

        {/* 2-Column Editing Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Sidebar Step Navigator */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4 px-1.5">Progress Pengisian</p>
              
              <div className="relative pl-3 space-y-5 border-l border-slate-150">
                {STEPS.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isCompleted = idx < currentStep;
                  return (
                    <button
                      key={step.label}
                      onClick={() => setCurrentStep(idx)}
                      className="group flex flex-col text-left focus:outline-none w-full"
                    >
                      <div className="relative flex items-center gap-3">
                        {/* Node point */}
                        <div className={`absolute -left-[17px] h-2.5 w-2.5 rounded-full border-2 transition-all ${
                          isActive 
                            ? 'bg-[#0B2C6B] border-white ring-4 ring-[#0B2C6B]/15 scale-110' 
                            : isCompleted 
                            ? 'bg-emerald-500 border-white' 
                            : 'bg-slate-350 border-white group-hover:bg-slate-400'
                        }`} />
                        <span className={`text-xs font-bold transition-colors ${
                          isActive ? 'text-[#0B2C6B]' : isCompleted ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700'
                        }`}>
                          Langkah {idx + 1}
                        </span>
                      </div>
                      <span className={`text-[11px] font-medium pl-6 mt-0.5 transition-colors ${
                        isActive ? 'text-[#0B2C6B] font-semibold' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Progress Bar Mini inside Sidebar */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5 px-1.5">
                  <span>KELENGKAPAN</span>
                  <span className="text-[#D9A441]">{completeness}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mx-1.5">
                  <div className="h-full bg-[#D9A441] rounded-full transition-all duration-300" style={{ width: `${completeness}%` }} />
                </div>
              </div>

            </div>
          </div>

          {/* Form Editor Card */}
          <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {currentStep === 0 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Unggah Dokumen CV</h2>
                <p className="text-xs text-slate-500 mb-6">Unggah dokumen resume/CV Anda untuk melengkapi data secara otomatis</p>
                <StepDocuments associateId={profileData?.id || ''} documents={profileData?.documents || []} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} onParseCV={handleParseCV} parsingCV={parsingCV} />
              </div>
            )}
            
            {currentStep === 1 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Data Diri & Profil</h2>
                <p className="text-xs text-slate-500 mb-6">Tinjau atau sesuaikan informasi biodata pribadi Anda</p>
                {editProfile && <StepProfile profile={editProfile} saving={saving} onUpdate={(data) => setEditProfile(editProfile ? { ...editProfile, ...data } : null)} onSave={handleSaveProfile} />}
              </div>
            )}
            
            {currentStep === 2 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Riwayat Pengalaman Kerja</h2>
                <p className="text-xs text-slate-500 mb-6">Tambahkan riwayat profesional yang pernah Anda lalui</p>
                <StepExperience experiences={profileData?.experiences || []} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} />
              </div>
            )}
            
            {currentStep === 3 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Kompetensi & Bahasa</h2>
                <p className="text-xs text-slate-500 mb-6">Lengkapi kemampuan teknis dan penguasaan bahasa Anda</p>
                <StepSkills skills={profileData?.skills || []} languages={profileData?.languages || []} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} />
              </div>
            )}
            
            {currentStep === 4 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Sertifikasi & Kredensial</h2>
                <p className="text-xs text-slate-500 mb-6">Tambahkan sertifikat profesional yang mendukung keahlian Anda</p>
                <StepCertifications certifications={profileData?.certifications || []} associateId={profileData?.id || ''} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} showToast={showToastNotification} />
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Portofolio & Hasil Karya</h2>
                <p className="text-xs text-slate-500 mb-6">Tambahkan link portofolio hasil karya terbaik Anda</p>
                <StepPortfolio portfolios={profileData?.portfolios || []} associateId={profileData?.id || ''} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} showToast={showToastNotification} />
              </div>
            )}

            {currentStep === 6 && (
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Ketersediaan Kolaborasi</h2>
                <p className="text-xs text-slate-500 mb-6">Tentukan status ketersediaan Anda untuk proyek mendatang</p>
                <StepAvailability availability={profileData?.availability || null} apiUrl={apiUrl} accessToken={accessToken || ''} onRefresh={fetchProfile} />
              </div>
            )}

            {/* Form Nav Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Sebelumnya
              </button>
              <div className="text-xs text-slate-400 font-medium">Langkah {currentStep + 1} dari {STEPS.length}</div>
              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={() => { if (currentStep === 1) handleSaveProfile(); else setCurrentStep(currentStep + 1); }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all"
                >
                  Selanjutnya
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => { showToastNotification('Profil sudah disimpan dengan lengkap!', 'success'); setIsEditing(false); }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700 transition-all"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Selesai
                </button>
              )}
            </div>
          </div>

        </div>

        {/* AI Preview Modal */}
        {showPreviewModal && parsedCVData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowPreviewModal(false); setParsedCVData(null); }}>
            <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#1440a0]">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Hasil Analisis AI</h3>
                    <p className="text-xs text-slate-500">Review data yang ditemukan dari CV Anda sebelum mengimpor</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 space-y-5">
                {/* Profile Info */}
                {(parsedCVData.fullName || parsedCVData.phone || parsedCVData.location || parsedCVData.headline) && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Data Profil</h4>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                      {parsedCVData.fullName && <p className="text-sm text-slate-700"><span className="font-medium text-slate-500">Nama:</span> {parsedCVData.fullName}</p>}
                      {parsedCVData.phone && <p className="text-sm text-slate-700"><span className="font-medium text-slate-500">Telepon:</span> {parsedCVData.phone}</p>}
                      {parsedCVData.location && <p className="text-sm text-slate-700"><span className="font-medium text-slate-500">Lokasi:</span> {parsedCVData.location}</p>}
                      {parsedCVData.headline && <p className="text-sm text-slate-700"><span className="font-medium text-slate-500">Headline:</span> {parsedCVData.headline}</p>}
                      {parsedCVData.bio && <p className="text-sm text-slate-700"><span className="font-medium text-slate-500">Bio:</span> {parsedCVData.bio}</p>}
                    </div>
                  </div>
                )}

                {/* Experiences */}
                {parsedCVData.experience && parsedCVData.experience.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Pengalaman Kerja ({parsedCVData.experience.length})</h4>
                    <div className="space-y-2">
                      {parsedCVData.experience.map((exp: any, i: number) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-900">{exp.position}</p>
                          <p className="text-xs text-[#0B2C6B] font-medium">{exp.company}</p>
                          {(exp.startDate || exp.endDate) && <p className="text-[10px] text-slate-400 mt-1">{exp.startDate || '?'} — {exp.endDate || 'Sekarang'}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {parsedCVData.education && parsedCVData.education.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Pendidikan ({parsedCVData.education.length})</h4>
                    <div className="space-y-2">
                      {parsedCVData.education.map((edu: any, i: number) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-900">{edu.degree} — {edu.fieldOfStudy || ''}</p>
                          <p className="text-xs text-[#0B2C6B] font-medium">{edu.institution}</p>
                          {(edu.startYear || edu.endYear) && <p className="text-[10px] text-slate-400 mt-1">{edu.startYear || '?'} — {edu.endYear || 'Sekarang'}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {parsedCVData.skills && parsedCVData.skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Keahlian ({parsedCVData.skills.length})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedCVData.skills.map((sk: any, i: number) => (
                        <span key={i} className="rounded-lg bg-[#0B2C6B]/10 px-2.5 py-1 text-xs font-medium text-[#0B2C6B]">{sk.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {parsedCVData.languages && parsedCVData.languages.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Bahasa ({parsedCVData.languages.length})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedCVData.languages.map((lang: any, i: number) => (
                        <span key={i} className="rounded-lg bg-[#D9A441]/10 px-2.5 py-1 text-xs font-medium text-[#D9A441]">{lang.language} ({lang.proficiency || '-'})</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!parsedCVData.fullName && !parsedCVData.experience?.length && !parsedCVData.education?.length && !parsedCVData.skills?.length && !parsedCVData.languages?.length && (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="mt-2 text-sm text-slate-500">AI tidak menemukan data terstruktur dari CV ini.</p>
                    <p className="text-xs text-slate-400">Coba upload CV dalam format PDF dengan teks yang jelas.</p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex items-center justify-between">
                <button
                  onClick={() => { setShowPreviewModal(false); setParsedCVData(null); }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Mengimpor...</>
                  ) : (
                    <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Import Semua ke Profil</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overwrite Confirmation Modal */}
        {showOverwriteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-100 m-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100 mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-center text-slate-900 mb-1.5">Timpa Data Profil?</h3>
              <p className="text-xs text-center text-slate-500 mb-5 leading-relaxed">
                Tindakan ini akan <span className="font-semibold text-red-600">menghapus dan mengganti</span> data riwayat kerja, pendidikan, keahlian, dan bahasa Anda yang sudah ada dengan data hasil analisis CV yang baru.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={executeImport}
                  className="flex-1 rounded-xl bg-amber-500 text-white py-2.5 text-xs font-semibold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/10"
                >
                  Ya, Timpa Data
                </button>
                <button
                  onClick={() => setShowOverwriteConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-650 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
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

      {profileData && (
        <ProfileView
          data={profileData}
          completionPercentage={completeness}
          onEdit={() => setIsEditing(true)}
          onSubmit={handleSubmitProfile}
          submitting={submitting}
        />
      )}
    </div>
  );
}
