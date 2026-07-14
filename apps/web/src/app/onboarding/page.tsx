'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { StepUploadCV } from './components/step-upload-cv';
import { StepReviewProfile } from './components/step-review-profile';
import { StepSelectRoles } from './components/step-select-roles';
import { StepAvailability } from './components/step-availability';
import { StepHistory } from './components/step-history';
import { StepComplete } from './components/step-complete';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileDraft = {
  full_name: string;
  preferred_name: string;
  headline: string;
  bio: string;
  phone: string;
  city: string;
  timezone: string;
  nationality: string;
  date_of_birth: string;
  gender: string;
  linkedin: string;
  website: string;
  photo_url: string;
};

const EMPTY_DRAFT: ProfileDraft = {
  full_name: '',
  preferred_name: '',
  headline: '',
  bio: '',
  phone: '',
  city: '',
  timezone: '',
  nationality: '',
  date_of_birth: '',
  gender: '',
  linkedin: '',
  website: '',
  photo_url: '',
};

type AvailabilityForm = {
  status: string;
  travel_ready: boolean;
  max_hours_per_week: string;
  notes: string;
};

const EMPTY_AVAILABILITY: AvailabilityForm = {
  status: 'open',
  travel_ready: false,
  max_hours_per_week: '',
  notes: '',
};

type AI_Skill = {
  name: string;
  category: string;
  proficiency: string;
};

type AI_Experience = {
  organization: string;
  position: string;
  industry?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
};

type AI_Education = {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
};

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'upload',
    label: 'Upload CV',
    description: 'Biarkan sistem mendeteksi profil Anda',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    id: 'review',
    label: 'Data Diri',
    description: 'Tinjau & lengkapi informasi dasar',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'roles',
    label: 'Peran & Keahlian',
    description: 'Peran utama & keahlian spesifik',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'availability',
    label: 'Ketersediaan',
    description: 'Atur jadwal & kolaborasi Anda',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'Pengalaman & Pendidikan',
    description: 'Riwayat profesional Anda',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'done',
    label: 'Selesai',
    description: 'Profil Anda siap!',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [currentStep, setCurrentStep] = useState(0);
  const [associateId, setAssociateId] = useState('');

  // Ref to prevent overwriting user input with backend fetch
  const nameInputtedRef = useRef(false);

  // CV & Auto-fill state
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [existingCV, setExistingCV] = useState<{ id: string; name: string } | null>(null);
  const [existingCVParsedData, setExistingCVParsedData] = useState<Record<string, any> | null>(null);
  const [aiFilledFields, setAiFilledFields] = useState<Set<keyof ProfileDraft>>(new Set());

  // Profile data drafts
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedExpertises, setSelectedExpertises] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityForm>(EMPTY_AVAILABILITY);

  // Raw list states for interactive step review
  const [skillsList, setSkillsList] = useState<AI_Skill[]>([]);
  const [experiencesList, setExperiencesList] = useState<AI_Experience[]>([]);
  const [educationsList, setEducationsList] = useState<AI_Education[]>([]);
  const [languagesList, setLanguagesList] = useState<any[]>([]);
  const [certificationsList, setCertificationsList] = useState<any[]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  // ─── Fetch associate ID ──────────────────────────────────────────────────────

  const fetchAssociateId = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        setAssociateId(json.data.id);
        
        // Detect existing CV document
        if (json.data.documents && json.data.documents.length > 0) {
          const cvDoc = json.data.documents.find((d: any) => d.type === 'cv');
          if (cvDoc) {
            setExistingCV({ id: cvDoc.id, name: cvDoc.file_name || cvDoc.name });
            if (cvDoc.parsed_data) {
              setExistingCVParsedData(cvDoc.parsed_data);
            }
          }
        }
        
        // Only set name from database if the user has not started inputting/parsing
        if (!nameInputtedRef.current) {
          if (json.data.profile?.full_name && !json.data.profile.full_name.includes('@')) {
            setDraft((d) => ({ ...d, full_name: json.data.profile.full_name || '' }));
          } else if (user?.user_metadata?.full_name) {
            setDraft((d) => ({ ...d, full_name: user.user_metadata.full_name || '' }));
          }
        }
      }
    } catch {
      // ignore
    }
  }, [accessToken, apiUrl, user]);

  useEffect(() => {
    fetchAssociateId();
  }, [fetchAssociateId]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleCVDone = (fileId: string, parsedData: Record<string, any> | null) => {
    setUploadedFileId(fileId);

    const dataToUse = parsedData || existingCVParsedData;

    if (dataToUse) {
      nameInputtedRef.current = true; // Mark as user data inputted
      const filled = new Set<keyof ProfileDraft>();
      const update: Partial<ProfileDraft> = {};

      const setVal = <K extends keyof ProfileDraft>(key: K, val: string | null | undefined) => {
        if (val) { (update as any)[key] = val; filled.add(key); }
      };

      setVal('full_name', dataToUse.fullName);
      setVal('preferred_name', dataToUse.preferredName);
      setVal('headline', dataToUse.headline);
      setVal('bio', dataToUse.bio);
      setVal('phone', dataToUse.phone);
      setVal('city', dataToUse.location);
      setVal('nationality', dataToUse.nationality);
      setVal('date_of_birth', dataToUse.dateOfBirth);
      setVal('gender', dataToUse.gender);
      setVal('linkedin', dataToUse.linkedIn);
      setVal('website', dataToUse.website);

      setDraft((d) => ({ ...d, ...update }));
      setAiFilledFields(filled);

      // Populate interactive lists
      if (dataToUse.skills) {
        setSkillsList(dataToUse.skills.map((sk: any) => ({
          name: sk.name,
          category: sk.category || 'other',
          proficiency: sk.proficiency || 'intermediate'
        })));
      }
      if (dataToUse.experience) {
        setExperiencesList(dataToUse.experience.map((exp: any) => ({
          organization: exp.company,
          position: exp.position,
          industry: exp.industry,
          description: exp.description,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: !exp.endDate
        })));
      }
      if (dataToUse.education) {
        setEducationsList(dataToUse.education.map((edu: any) => ({
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy,
          startYear: edu.startYear,
          endYear: edu.endYear
        })));
      }
      if (dataToUse.languages) {
        setLanguagesList(dataToUse.languages);
      }
      if (dataToUse.certifications) {
        setCertificationsList(dataToUse.certifications);
      }
    }

    setCurrentStep(1);
  };

  const handleSkipCV = () => {
    setCurrentStep(1);
  };

  const handleDraftChange = (updated: Partial<ProfileDraft>) => {
    if (updated.full_name !== undefined) {
      nameInputtedRef.current = true;
    }
    setDraft((d) => ({ ...d, ...updated }));
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleExpertiseToggle = (exp: string) => {
    setSelectedExpertises((prev) =>
      prev.includes(exp) ? prev.filter((e) => e !== exp) : [...prev, exp]
    );
  };

  // ─── Save & Next ─────────────────────────────────────────────────────────────

  const handleNext = async () => {
    setError('');

    if (currentStep === 1) {
      // Save profile data & photo
      if (!draft.full_name.trim()) {
        setError('Nama lengkap wajib diisi.');
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`${apiUrl}/api/associate/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            fullName: draft.full_name,
            preferredName: draft.preferred_name || undefined,
            headline: draft.headline,
            bio: draft.bio,
            phone: draft.phone,
            city: draft.city,
            timezone: draft.timezone || undefined,
            nationality: draft.nationality,
            dateOfBirth: draft.date_of_birth || undefined,
            gender: draft.gender || undefined,
            photoUrl: draft.photo_url || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'Gagal menyimpan profil');
          return;
        }

        // Save social links
        if (draft.linkedin) {
          await fetch(`${apiUrl}/api/associate/social-links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ platform: 'linkedin', url: draft.linkedin, isPrimary: true }),
          }).catch(() => {});
        }
        if (draft.website) {
          await fetch(`${apiUrl}/api/associate/social-links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ platform: 'website', url: draft.website, isPrimary: false }),
          }).catch(() => {});
        }

        setCurrentStep(2);
      } catch {
        setError('Gagal menghubungi server');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (currentStep === 2) {
      // Save roles, expertises & verified skills list to avoid redundancy
      setSaving(true);
      try {
        await fetch(`${apiUrl}/api/associate/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            roles: selectedRoles,
            expertises: selectedExpertises,
          }),
        });

        // Save skills list
        if (skillsList.length > 0) {
          for (const sk of skillsList) {
            await fetch(`${apiUrl}/api/associate/skills`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                skillName: sk.name,
                category: sk.category,
                proficiency: sk.proficiency,
              }),
            }).catch(() => {});
          }
        }

        setCurrentStep(3);
      } catch {
        setError('Gagal menyimpan peran & keahlian');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (currentStep === 3) {
      // Save Availability
      setSaving(true);
      try {
        await fetch(`${apiUrl}/api/associate/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            status: availability.status,
            travel_ready: availability.travel_ready,
            max_hours_per_week: availability.max_hours_per_week ? parseInt(availability.max_hours_per_week) : null,
            notes: availability.notes || '',
          }),
        });
        setCurrentStep(4);
      } catch {
        setError('Gagal menyimpan status ketersediaan');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (currentStep === 4) {
      // Save history lists: experiences, educations, languages, certifications
      setSaving(true);
      try {
        if (experiencesList.length > 0) {
          for (const exp of experiencesList) {
            await fetch(`${apiUrl}/api/associate/experiences`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                organization: exp.organization,
                position: exp.position,
                industry: exp.industry || undefined,
                description: exp.description || '',
                startDate: exp.startDate || new Date().toISOString().substring(0, 7),
                endDate: exp.endDate || undefined,
                isCurrent: exp.isCurrent,
              }),
            }).catch(() => {});
          }
        }

        if (educationsList.length > 0) {
          for (const edu of educationsList) {
            await fetch(`${apiUrl}/api/associate/educations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                institution: edu.institution,
                degree: edu.degree,
                fieldOfStudy: edu.fieldOfStudy || '',
                startYear: edu.startYear || undefined,
                endYear: edu.endYear || undefined,
              }),
            }).catch(() => {});
          }
        }

        if (languagesList.length > 0) {
          for (const lang of languagesList) {
            await fetch(`${apiUrl}/api/associate/languages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                language: lang.language,
                proficiency: lang.proficiency || 'conversational',
              }),
            }).catch(() => {});
          }
        }

        if (certificationsList.length > 0) {
          for (const cert of certificationsList) {
            await fetch(`${apiUrl}/api/associate/certifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                name: cert.name,
                issuer: cert.issuer,
                issueDate: cert.issueDate || undefined,
                expiryDate: cert.expiryDate || undefined,
              }),
            }).catch(() => {});
          }
        }

        setCurrentStep(5);
      } catch {
        setError('Gagal menyimpan riwayat profesional');
      } finally {
        setSaving(false);
      }
      return;
    }

    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const stepLabels = STEPS.map((s) => s.label);
  const isDoneStep = currentStep === 5;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL (Static & sticky, full height connection line) ── */}
      <aside className="hidden lg:flex w-64 xl:w-72 flex-col bg-[#0B2C6B] px-6 py-8 flex-shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <Image src="/logo.png" alt="BinaHub" width={32} height={32} className="rounded-md" priority />
          <span className="text-base font-bold text-white">BinaHub AMS</span>
        </div>

        {/* Steps */}
        <nav className="flex-1 relative flex flex-col justify-between max-h-[420px]">
          {/* Vertical Step Connection Line */}
          <div className="absolute left-[15px] top-[16px] bottom-[16px] w-[2px] bg-white/20 z-0" />
          <div
            className="absolute left-[15px] top-[16px] w-[2px] bg-[#D9A441] z-0 transition-all duration-500"
            style={{
              height: `${(currentStep / (STEPS.length - 1)) * 100}%`,
              maxHeight: '100%'
            }}
          />

          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            const isFuture = idx > currentStep;

            return (
              <div key={step.id} className="flex items-start gap-4 z-10 py-1.5">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#D9A441] border-[#D9A441]'
                      : isActive
                      ? 'bg-white border-white'
                      : 'bg-[#0B2C6B] border-white/30'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className={isActive ? 'text-[#0B2C6B]' : 'text-white/30'}>{step.icon}</div>
                  )}
                </div>

                <div className="pt-0.5">
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      isActive ? 'text-white' : isCompleted ? 'text-[#D9A441]' : isFuture ? 'text-white/40' : 'text-white'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-[11px] mt-0.5 transition-colors ${
                      isActive ? 'text-white/70' : isCompleted ? 'text-[#D9A441]/70' : 'text-white/30'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="flex-1 flex flex-col bg-slate-100 overflow-y-auto">
        {/* Mobile step indicator */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-[#0B2C6B]' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Langkah {currentStep + 1} dari {STEPS.length} — <span className="font-medium text-slate-700">{stepLabels[currentStep]}</span>
          </p>
        </div>

        {/* Card content */}
        <div className="flex-1 flex items-start justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-xl">
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              {!isDoneStep && (
                <div className="px-6 pt-6 pb-5 border-b border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#D9A441] mb-1">
                    Langkah {currentStep + 1} dari {STEPS.length}
                  </p>
                  <h1 className="text-xl font-bold text-slate-900">{STEPS[currentStep].label}</h1>
                  <p className="mt-0.5 text-sm text-slate-500">{STEPS[currentStep].description}</p>
                </div>
              )}

              <div className={`${isDoneStep ? '' : 'px-6 py-5'}`}>
                {error && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}

                {currentStep === 0 && (
                  <StepUploadCV
                    associateId={associateId}
                    apiUrl={apiUrl}
                    accessToken={accessToken || ''}
                    onDone={handleCVDone}
                    onSkip={handleSkipCV}
                    onDeleteOldCV={() => {
                      setExistingCV(null);
                      setExistingCVParsedData(null);
                    }}
                    existingCV={existingCV}
                  />
                )}
                {currentStep === 1 && (
                  <StepReviewProfile
                    draft={draft}
                    aiFilledFields={aiFilledFields}
                    onChange={handleDraftChange}
                    associateId={associateId}
                    apiUrl={apiUrl}
                    accessToken={accessToken || ''}
                  />
                )}
                {currentStep === 2 && (
                  <StepSelectRoles
                    selectedRoles={selectedRoles}
                    selectedExpertises={selectedExpertises}
                    skillsList={skillsList}
                    onRoleToggle={handleRoleToggle}
                    onExpertiseToggle={handleExpertiseToggle}
                    onRemoveSkill={(name) => setSkillsList(skillsList.filter((s) => s.name !== name))}
                    onAddSkill={(sk) => setSkillsList([...skillsList, sk])}
                  />
                )}
                {currentStep === 3 && (
                  <StepAvailability
                    form={availability}
                    onChange={(updated) => setAvailability({ ...availability, ...updated })}
                  />
                )}
                {currentStep === 4 && (
                  <StepHistory
                    experiences={experiencesList}
                    educations={educationsList}
                    onChangeExperiences={setExperiencesList}
                    onChangeEducations={setEducationsList}
                  />
                )}
                {currentStep === 5 && (
                  <div className="px-6 py-6">
                    <StepComplete name={draft.full_name} />
                  </div>
                )}
              </div>

              {!isDoneStep && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  {currentStep > 0 ? (
                    <button
                      onClick={() => { setError(''); setCurrentStep((s) => s - 1); }}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Kembali
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep > 0 && (
                    <button
                      onClick={handleNext}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all disabled:opacity-60"
                    >
                      {saving ? 'Menyimpan...' : currentStep === 4 ? 'Selesaikan Profil' : 'Selanjutnya'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
