'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Avatar, Tabs } from '../../../components/ui';
import { useSearchParams } from 'next/navigation';

// ============================================
// TYPES
// ============================================

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
  date_of_birth?: string | null;
  gender?: string | null;
  roles?: string[];
  expertises?: string[];
};

type Experience = {
  id: string;
  organization: string;
  position: string;
  industry?: string | null;
  description?: string | null;
  achievement?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
};

type Education = {
  id: string;
  institution: string;
  degree: string;
  field_of_study?: string | null;
  start_year?: number | null;
  end_year?: number | null;
};

type Certification = {
  id: string;
  name: string;
  issuer: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_url?: string | null;
};

type Skill = {
  id: string;
  skill_name: string;
  proficiency?: string | null;
  category?: string | null;
  years_experience?: number | null;
};

type Document = {
  id: string;
  type: string;
  name: string;
  created_at: string;
};

type Portfolio = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  client_name?: string | null;
  project_url?: string | null;
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

type Language = {
  id: string;
  language: string;
  proficiency: string;
};

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  is_primary?: boolean;
};

type EmergencyContact = {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
};

type AssociateData = {
  id: string;
  status: string;
  profile: ProfileData | null;
  experiences: Experience[];
  educations: Education[];
  certifications: Certification[];
  skills: Skill[];
  languages: Language[];
  documents: Document[];
  portfolios: Portfolio[];
  availability: Availability | null;
  socialLinks: SocialLink[];
  emergencyContact: EmergencyContact | null;
};

// ============================================
// CONSTANTS (UPDATED ROLES)
// ============================================

const ROLES = [
  'Assessor',
  'Facilitator',
  'Trainer',
  'Project Manager',
  'Coach',
  'TourGuide',
  'Event Organizer',
  'Consultant',
  'Speaker'
];

const EXPERTISES_PRESETS = [
  'Leadership & Management', 'Human Resources', 'Organizational Development',
  'Digital Transformation', 'Change Management', 'Communication & Presentation',
  'Sales & Marketing', 'Finance & Accounting', 'Project Management',
  'ESG & Sustainability', 'Customer Experience', 'Innovation & Design Thinking',
  'Agile & Scrum', 'Data & Analytics', 'Entrepreneurship',
  'Soft Skills', 'Compliance & Legal', 'Operations & Supply Chain',
  'Tour Planning', 'Event Management', 'Public Speaking', 'Learning & Development',
];

const WORK_LOCATIONS = ['Remote', 'Onsite', 'Hybrid'];
const ENGAGEMENT_TYPES = ['Training', 'Consulting', 'Assessment', 'Coaching', 'Facilitation', 'Speaking', 'Research', 'Mentoring'];
const TIMEZONES = ['Asia/Jakarta (WIB)', 'Asia/Makassar (WITA)', 'Asia/Jayapura (WIT)', 'Asia/Singapore', 'Asia/Bangkok'];
const PORTFOLIO_CATEGORIES = ['Case Study', 'Presentation', 'Workshop Module', 'Research Paper', 'Video', 'Publication', 'Proposal', 'Training Material', 'Other'];

// ============================================
// HELPER COMPONENTS
// ============================================

function BadgeSelector({
  options, selected, onChange, label
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  label: string;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
              selected.includes(opt)
                ? 'bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] text-white border-[#0B2C6B] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#0B2C6B]/40 hover:text-[#0B2C6B]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function FormInput({
  label, value, onChange, placeholder, type = 'text'
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/20 focus:border-[#0B2C6B]"
      />
    </div>
  );
}

function FormTextarea({
  label, value, onChange, placeholder, rows = 4
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/20 focus:border-[#0B2C6B]"
      />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
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
      <p className="text-sm font-medium text-slate-400">{text}</p>
    </div>
  );
}

function ToggleChip({
  label, active, onClick
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
        active
          ? 'bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] text-white border-[#0B2C6B] shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:border-[#0B2C6B]/40'
      }`}
    >
      {label}
    </button>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function OriginalProfilePage() {
  const { user, accessToken } = useAuth();
  const searchParams = useSearchParams();

  const [data, setData] = useState<AssociateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [parsingCV, setParsingCV] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToastNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Forms state
  const [newExp, setNewExp] = useState({ organization: '', position: '', industry: '', startDate: '', endDate: '', isCurrent: false, description: '', achievement: '' });
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' });
  const [newPortfolio, setNewPortfolio] = useState({ title: '', clientName: '', category: 'Other', projectUrl: '', description: '' });
  const [newSkill, setNewSkill] = useState({ skillName: '', category: 'technical', proficiency: 'beginner', yearsExperience: '' });
  const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'fluent' });
  const [newSocialLink, setNewSocialLink] = useState({ platform: 'linkedin', url: '' });
  const [emergencyContact, setEmergencyContact] = useState({ name: '', relationship: '', phone: '', email: '' });
  const [editingExp, setEditingExp] = useState<string | null>(null);
  const [editExpData, setEditExpData] = useState({ organization: '', position: '', industry: '', startDate: '', endDate: '', isCurrent: false, description: '', achievement: '' });
  const [editingEdu, setEditingEdu] = useState<string | null>(null);
  const [editEduData, setEditEduData] = useState({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' });

  // Expertise Custom Search Dropdown
  const [searchExpertise, setSearchExpertise] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchProfile = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json?.success && json?.data) setData(json.data);
    } catch { console.error('Gagal memuat profil'); } finally { setLoading(false); }
  }, [user, accessToken, apiUrl]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const p = data?.profile;
  const experiences = data?.experiences || [];
  const educations = data?.educations || [];
  const certifications = data?.certifications || [];
  const skills = data?.skills || [];
  const languages = data?.languages || [];
  const documents = data?.documents || [];
  const portfolios = data?.portfolios || [];
  const availability = data?.availability;
  const socialLinks = data?.socialLinks || [];
  const emergencyData = data?.emergencyContact;
  const cvDoc = documents.find((d) => d.type === 'cv');

  // Initialize emergency contact form from data
  useEffect(() => {
    if (emergencyData) {
      setEmergencyContact({
        name: emergencyData.name || '',
        relationship: emergencyData.relationship || '',
        phone: emergencyData.phone || '',
        email: emergencyData.email || '',
      });
    }
  }, [emergencyData]);
  
  const completeness = (() => {
    if (!data) return 0;
    let filled = 0;
    const total = 8;
    if (data.profile?.full_name) filled++;
    if (data.documents && data.documents.length > 0) filled++;
    if (data.experiences && data.experiences.length > 0) filled++;
    if (data.educations && data.educations.length > 0) filled++;
    if (data.skills && data.skills.length > 0) filled++;
    if (data.profile?.expertises && data.profile.expertises.length > 0) filled++;
    if (data.portfolios && data.portfolios.length > 0) filled++;
    if (data.profile?.photo_url) filled++;
    return Math.round((filled / total) * 100);
  })();

  const tabs = [
    { id: 'profile', label: 'Profil' },
    { id: 'experience', label: 'Pengalaman' },
    { id: 'skills', label: 'Keahlian' },
    { id: 'availability', label: 'Ketersediaan' },
    { id: 'documents', label: 'Dokumen' },
  ];

  const handleStartEdit = () => {
    setEditProfile(p ? { ...p } : { full_name: '', roles: [], expertises: [] });
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditProfile(null);
    setSaveError(null);
  };

  const handleSaveProfile = async () => {
    if (!editProfile || !accessToken) return;
    setSaving(true);
    setSaveError(null);
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
        setIsEditing(false);
        setEditProfile(null);
      } else {
        console.error('Gagal menyimpan profil. Detail:', result);
        setSaveError(result?.error || 'Gagal menyimpan profil');
      }
    } catch {
      setSaveError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  // Add Experience
  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.organization || !newExp.position || !newExp.startDate || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/experiences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          organization: newExp.organization,
          position: newExp.position,
          industry: newExp.industry || 'Umum',
          startDate: newExp.startDate,
          endDate: newExp.isCurrent ? undefined : newExp.endDate || undefined,
          isCurrent: newExp.isCurrent,
          description: newExp.description,
          achievement: newExp.achievement
        }),
      });
      if (res.ok) {
        setNewExp({ organization: '', position: '', industry: '', startDate: '', endDate: '', isCurrent: false, description: '', achievement: '' });
        await fetchProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Experience
  const handleDeleteExperience = async (expId: string) => {
    if (!accessToken) return;
    try {
      await fetch(`${apiUrl}/api/associate/experiences/${expId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  // Add Education
  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdu.institution || !newEdu.degree || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/educations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          institution: newEdu.institution,
          degree: newEdu.degree,
          fieldOfStudy: newEdu.fieldOfStudy || null,
          startYear: newEdu.startYear ? parseInt(newEdu.startYear, 10) : null,
          endYear: newEdu.endYear ? parseInt(newEdu.endYear, 10) : null,
        }),
      });
      if (res.ok) {
        setNewEdu({ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' });
        await fetchProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Education
  const handleDeleteEducation = async (eduId: string) => {
    if (!accessToken) return;
    setConfirmDialog({
      title: 'Hapus Pendidikan',
      message: 'Hapus data pendidikan ini?',
      confirmLabel: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await fetch(`${apiUrl}/api/associate/educations/${eduId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          await fetchProfile();
          showToastNotification('Pendidikan berhasil dihapus', 'success');
        } catch (e) {
          console.error(e);
          showToastNotification('Gagal menghapus pendidikan', 'error');
        }
      },
    });
  };

  // Edit Education
  const handleStartEditEdu = (edu: Education) => {
    setEditingEdu(edu.id);
    setEditEduData({
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.field_of_study || '',
      startYear: edu.start_year?.toString() || '',
      endYear: edu.end_year?.toString() || '',
    });
  };

  const handleSaveEditEdu = async () => {
    if (!editingEdu || !accessToken) return;
    try {
      await fetch(`${apiUrl}/api/associate/educations/${editingEdu}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          institution: editEduData.institution,
          degree: editEduData.degree,
          fieldOfStudy: editEduData.fieldOfStudy || null,
          startYear: editEduData.startYear ? parseInt(editEduData.startYear, 10) : null,
          endYear: editEduData.endYear ? parseInt(editEduData.endYear, 10) : null,
        }),
      });
      setEditingEdu(null);
      await fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  // Edit Experience
  const handleStartEditExp = (exp: Experience) => {
    setEditingExp(exp.id);
    setEditExpData({
      organization: exp.organization,
      position: exp.position,
      industry: exp.industry || '',
      startDate: exp.start_date,
      endDate: exp.end_date || '',
      isCurrent: exp.is_current || false,
      description: exp.description || '',
      achievement: exp.achievement || '',
    });
  };

  const handleSaveEditExp = async () => {
    if (!editingExp || !accessToken) return;
    try {
      await fetch(`${apiUrl}/api/associate/experiences/${editingExp}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          organization: editExpData.organization,
          position: editExpData.position,
          industry: editExpData.industry || null,
          startDate: editExpData.startDate,
          endDate: editExpData.isCurrent ? undefined : editExpData.endDate || undefined,
          isCurrent: editExpData.isCurrent,
          description: editExpData.description,
          achievement: editExpData.achievement,
        }),
      });
      setEditingExp(null);
      await fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  // Add Skill
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.skillName || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          skillName: newSkill.skillName,
          category: newSkill.category,
          proficiency: newSkill.proficiency,
          yearsExperience: newSkill.yearsExperience ? parseInt(newSkill.yearsExperience, 10) : undefined,
        }),
      });
      if (res.ok) {
        setNewSkill({ skillName: '', category: 'technical', proficiency: 'beginner', yearsExperience: '' });
        await fetchProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Skill
  const handleDeleteSkill = async (skillId: string) => {
    if (!accessToken) return;
    setConfirmDialog({
      title: 'Hapus Skill',
      message: 'Hapus skill ini dari profil?',
      confirmLabel: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await fetch(`${apiUrl}/api/associate/skills/${skillId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          await fetchProfile();
          showToastNotification('Skill berhasil dihapus', 'success');
        } catch (e) {
          console.error(e);
          showToastNotification('Gagal menghapus skill', 'error');
        }
      },
    });
  };

  // Add Language
  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLanguage.language || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/languages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ language: newLanguage.language, proficiency: newLanguage.proficiency }),
      });
      if (res.ok) {
        setNewLanguage({ language: '', proficiency: 'fluent' });
        await fetchProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Language
  const handleDeleteLanguage = async (langId: string) => {
    if (!accessToken) return;
    setConfirmDialog({
      title: 'Hapus Bahasa',
      message: 'Hapus bahasa ini dari profil?',
      confirmLabel: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await fetch(`${apiUrl}/api/associate/languages/${langId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          await fetchProfile();
          showToastNotification('Bahasa berhasil dihapus', 'success');
        } catch (e) {
          console.error(e);
          showToastNotification('Gagal menghapus bahasa', 'error');
        }
      },
    });
  };

  // Add Social Link
  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSocialLink.url || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ platform: newSocialLink.platform, url: newSocialLink.url }),
      });
      if (res.ok) {
        setNewSocialLink({ platform: 'linkedin', url: '' });
        await fetchProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Social Link
  const handleDeleteSocialLink = async (linkId: string) => {
    if (!accessToken) return;
    try {
      await fetch(`${apiUrl}/api/associate/social-links/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  // Save Emergency Contact
  const handleSaveEmergencyContact = async () => {
    if (!accessToken || !emergencyContact.name || !emergencyContact.phone) return;
    try {
      await fetch(`${apiUrl}/api/associate/emergency-contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: emergencyContact.name,
          relationship: emergencyContact.relationship,
          phone: emergencyContact.phone,
          email: emergencyContact.email || null,
        }),
      });
      await fetchProfile();
      showToastNotification('Kontak darurat tersimpan', 'success');
    } catch (e) {
      console.error(e);
      showToastNotification('Gagal menyimpan', 'error');
    }
  };

  // Add Portfolio
  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolio.title || !accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/portfolios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title: newPortfolio.title,
          clientName: newPortfolio.clientName,
          category: newPortfolio.category,
          projectUrl: newPortfolio.projectUrl || undefined,
          description: newPortfolio.description
        }),
      });
      if (res.ok) {
        setNewPortfolio({ title: '', clientName: '', category: 'Other', projectUrl: '', description: '' });
        await fetchProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Portfolio
  const handleDeletePortfolio = async (portId: string) => {
    if (!accessToken) return;
    try {
      await fetch(`${apiUrl}/api/associate/portfolios/${portId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  // CV Upload + Auto-parse
  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!accessToken) return;
    setConfirmDialog({
      title: 'Hapus Dokumen',
      message: `Hapus dokumen "${docName}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`${apiUrl}/api/files/${docId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const json = await res.json();
          if (json.success) {
            showToastNotification('Dokumen berhasil dihapus', 'success');
            await fetchProfile();
          } else {
            showToastNotification(json.error || 'Gagal menghapus dokumen', 'error');
          }
        } catch (e) {
          showToastNotification('Gagal menghapus dokumen', 'error');
        }
      },
    });
  };

  const handleCVUpload = async (file: File) => {
    if (!accessToken || !data?.id) return;

    // Confirm if replacing existing CV
    const oldCv = documents.find((d) => d.type === 'cv');
    if (oldCv) {
      await new Promise<void>((resolve) => {
        setConfirmDialog({
          title: 'Ganti CV',
          message: 'CV lama akan diganti dengan CV baru. Data dari CV lama akan digantikan oleh hasil parse CV baru. Lanjutkan?',
          confirmLabel: 'Ya, Ganti CV',
          confirmVariant: 'primary',
          onConfirm: () => { setConfirmDialog(null); resolve(); },
        });
      });
    }

    setUploadingCV(true);
    try {
      // Delete old CV if exists
      if (oldCv) {
        try {
          await fetch(`${apiUrl}/api/files/${oldCv.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch (e) {
          console.warn('Failed to delete old CV, proceeding with upload:', e);
        }
      }

      const res = await fetch(`${apiUrl}/api/files/associate/${data.id}/cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      const json = await res.json();
      if (json.success && json.data?.presignedUrl) {
        const uploadRes = await fetch(json.data.presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!uploadRes.ok) {
          console.error('CV upload to storage failed:', uploadRes.status, await uploadRes.text());
          showToastNotification('Gagal mengunggah file CV ke storage', 'error');
          setUploadingCV(false);
          return;
        }
        await fetchProfile();

        // Auto-trigger AI parsing after upload
        setParsingCV(true);
        try {
          const updatedData = data;
          const newDocs = updatedData?.documents || documents;
          const newCvDoc = newDocs.find((d) => d.type === 'cv') || { id: json.data.fileId };
          if (newCvDoc?.id) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            
            const parseRes = await fetch(`${apiUrl}/api/ai/parse-cv`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ document_id: newCvDoc.id }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const parseJson = await parseRes.json();
            if (parseJson.success && parseJson.data) {
              console.log('AI Parsing Debug Data:', parseJson.debug);
              const parsed = parseJson.data;
              
              // === 1. Update Profile (only send fields with actual values) ===
              const profilePayload: Record<string, unknown> = {};
              if (parsed.fullName) profilePayload.fullName = parsed.fullName;
              if (parsed.headline) profilePayload.headline = parsed.headline;
              if (parsed.bio || parsed.summary) profilePayload.bio = parsed.bio || parsed.summary;
              if (parsed.phone) profilePayload.phone = parsed.phone;
              if (parsed.location || parsed.city) {
                const rawCity = parsed.location || parsed.city;
                profilePayload.city = rawCity.length > 100 ? rawCity.substring(0, 100) : rawCity;
              }

              console.log('Profile payload from CV:', profilePayload, '| Parsed fields from AI:', { fullName: parsed.fullName, headline: parsed.headline, bio: parsed.bio, phone: parsed.phone, location: parsed.location, city: parsed.city });

              if (Object.keys(profilePayload).length > 0) {
                const profileRes = await fetch(`${apiUrl}/api/associate/profile`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                  body: JSON.stringify(profilePayload),
                });
                const profileResult = await profileRes.json().catch(() => null);
                if (!profileRes.ok) {
                  console.error('Profile update failed:', profileResult);
                } else {
                  console.log('Profile update success!');
                }
              } else {
                console.warn('Profile payload is EMPTY - AI did not return name/phone/city/etc.');
              }

              // === 2. Save Experiences (skip duplicates) ===
              const experiencesToSave = parsed.experience || parsed.workExperiences || [];
              if (Array.isArray(experiencesToSave)) {
                for (const exp of experiencesToSave) {
                  const org = exp.company || exp.organization || 'Organisasi';
                  const pos = exp.position || exp.role || 'Peran/Jabatan';
                  const isDuplicate = experiences.some(
                    (existing) => existing.organization.toLowerCase() === org.toLowerCase() && existing.position.toLowerCase() === pos.toLowerCase()
                  );
                  if (!isDuplicate) {
                    await fetch(`${apiUrl}/api/associate/experiences`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({
                        organization: org,
                        position: pos,
                        industry: exp.industry || 'Umum',
                        startDate: exp.startDate || '2020-01',
                        endDate: exp.endDate || undefined,
                        isCurrent: !exp.endDate,
                        description: exp.description || ''
                      }),
                    });
                  }
                }
              }

              // === 3. Save Education (skip duplicates) ===
              const educationsToSave = parsed.education || [];
              if (Array.isArray(educationsToSave)) {
                for (const edu of educationsToSave) {
                  if (!edu.institution || !edu.degree) continue;
                  const isDuplicate = educations.some(
                    (existing) => existing.institution?.toLowerCase() === edu.institution?.toLowerCase() && existing.degree?.toLowerCase() === edu.degree?.toLowerCase()
                  );
                  if (!isDuplicate) {
                    await fetch(`${apiUrl}/api/associate/educations`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({
                        institution: edu.institution,
                        degree: edu.degree,
                        fieldOfStudy: edu.fieldOfStudy || undefined,
                        startYear: edu.startYear || undefined,
                        endYear: edu.endYear || undefined,
                      }),
                    });
                  }
                }
              }

              // === 4. Save Skills (skip duplicates) ===
              const skillsToSave = parsed.skills || [];
              if (Array.isArray(skillsToSave)) {
                for (const skill of skillsToSave) {
                  if (!skill.name) continue;
                  const isDuplicate = skills.some(
                    (existing) => existing.skill_name?.toLowerCase() === skill.name?.toLowerCase()
                  );
                  if (!isDuplicate) {
                    const validCategories = ['technical', 'soft_skill', 'industry', 'other'];
                    const validProficiencies = ['beginner', 'intermediate', 'advanced', 'expert'];
                    await fetch(`${apiUrl}/api/associate/skills`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({
                        skillName: skill.name,
                        category: validCategories.includes(skill.category) ? skill.category : 'other',
                        proficiency: validProficiencies.includes(skill.proficiency) ? skill.proficiency : 'intermediate',
                        yearsExperience: skill.yearsExperience || undefined,
                      }),
                    });
                  }
                }
              }

              // === 5. Save Certifications (skip duplicates) ===
              const certsToSave = parsed.certifications || [];
              if (Array.isArray(certsToSave)) {
                for (const cert of certsToSave) {
                  if (!cert.name || !cert.issuer) continue;
                  const isDuplicate = certifications.some(
                    (existing) => existing.name?.toLowerCase() === cert.name?.toLowerCase()
                  );
                  if (!isDuplicate) {
                    await fetch(`${apiUrl}/api/associate/certifications`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({
                        name: cert.name,
                        issuer: cert.issuer,
                        issueDate: cert.issueDate || undefined,
                        expiryDate: cert.expiryDate || undefined,
                      }),
                    });
                  }
                }
              }

              // === 6. Save Languages (skip duplicates) ===
              const langsToSave = parsed.languages || [];
              if (Array.isArray(langsToSave)) {
                for (const lang of langsToSave) {
                  if (!lang.language) continue;
                  const isDuplicate = languages.some(
                    (existing) => existing.language?.toLowerCase() === lang.language?.toLowerCase()
                  );
                  if (!isDuplicate) {
                    const validProf = ['basic', 'conversational', 'fluent', 'native'];
                    await fetch(`${apiUrl}/api/associate/languages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({
                        language: lang.language,
                        proficiency: validProf.includes(lang.proficiency) ? lang.proficiency : 'fluent',
                      }),
                    });
                  }
                }
              }

              await fetchProfile();
              showToastNotification('Unggah & Autofill CV berhasil!', 'success');
            } else {
              showToastNotification(parseJson.error || 'Gagal memproses autofill CV', 'error');
            }
          }
        } catch (parseErr) {
          console.error('Auto-parse CV failed:', parseErr);
          const isTimeout = parseErr instanceof DOMException && parseErr.name === 'AbortError';
          showToastNotification(
            isTimeout
              ? 'CV berhasil diupload. AI timeout — silakan isi profil manual atau coba Re-parse CV.'
              : 'CV berhasil diupload. Gagal memproses AI — silakan isi profil manual.',
            isTimeout ? 'warning' : 'error'
          );
        } finally {
          setParsingCV(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingCV(false);
    }
  };

  // Photo Upload
  const handlePhotoUpload = async (file: File) => {
    if (!accessToken || !data?.id) return;
    setUploadingPhoto(true);
    try {
      // Step 1: Get presigned upload URL (category must be 'avatar')
      const res = await fetch(`${apiUrl}/api/files/presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          ownerId: data.id,
          ownerType: 'associate',
          category: 'avatar'
        }),
      });
      const json = await res.json();
      if (!json.success || !json.data?.presignedUrl) {
        showToastNotification(json.error || 'Gagal mendapatkan URL upload', 'error');
        return;
      }

      // Step 2: Upload file directly to Supabase Storage
      const uploadRes = await fetch(json.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        showToastNotification('Gagal mengupload foto ke storage', 'error');
        return;
      }

      // Step 3: Register file record in database
      const regRes = await fetch(`${apiUrl}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          ownerId: data.id,
          ownerType: 'associate',
          category: 'avatar',
          path: json.data.path,
          originalName: file.name,
          mime: file.type,
          size: file.size,
          visibility: 'public'
        })
      });
      const regJson = await regRes.json();
      if (!regJson.success) {
        showToastNotification(regJson.error || 'Gagal mendaftarkan file', 'error');
        return;
      }

      // Step 4: Update profile with public photo URL (using view endpoint as redirect)
      const photoUrlPath = `${apiUrl}/api/files/${regJson.data.id}/view`;
      const profileRes = await fetch(`${apiUrl}/api/associate/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ photoUrl: photoUrlPath }),
      });
      const profileJson = await profileRes.json();
      if (profileJson.success) {
        await fetchProfile();
        showToastNotification('Foto profil berhasil diperbarui!', 'success');
      } else {
        showToastNotification(profileJson.error || 'Gagal menyimpan foto ke profil', 'error');
      }
    } catch (e) {
      console.error('Photo upload error:', e);
      showToastNotification('Terjadi kesalahan saat upload foto', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Parse CV & Autofill
  const handleParseCV = async () => {
    if (!cvDoc || !accessToken) return;
    setParsingCV(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const res = await fetch(`${apiUrl}/api/ai/parse-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ document_id: cvDoc.id }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (json.success && json.data) {
        console.log('AI Parsing Debug Data:', json.debug);
        const parsed = json.data;
        
        // === 1. Update Profile (only send fields with actual values) ===
        const profilePayload: Record<string, unknown> = {};
        if (parsed.fullName) profilePayload.fullName = parsed.fullName;
        if (parsed.headline) profilePayload.headline = parsed.headline;
        if (parsed.bio || parsed.summary) profilePayload.bio = parsed.bio || parsed.summary;
        if (parsed.phone) profilePayload.phone = parsed.phone;
        if (parsed.location || parsed.city) {
          const rawCity = parsed.location || parsed.city;
          profilePayload.city = rawCity.length > 100 ? rawCity.substring(0, 100) : rawCity;
        }

        console.log('Manual Parse Profile Payload from CV:', profilePayload);

        if (Object.keys(profilePayload).length > 0) {
          const profileRes = await fetch(`${apiUrl}/api/associate/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(profilePayload),
          });
          const profileResult = await profileRes.json().catch(() => null);
          if (!profileRes.ok) {
            console.error('Profile update failed:', profileResult);
          } else {
            console.log('Profile update success!');
          }
        } else {
          console.warn('Profile payload is EMPTY - AI did not return name/phone/city/etc.');
        }

        // === 2. Save Experiences (skip duplicates) ===
        const experiencesToSave = parsed.experience || parsed.workExperiences || [];
        if (Array.isArray(experiencesToSave)) {
          for (const exp of experiencesToSave) {
            const org = exp.company || exp.organization || 'Organisasi';
            const pos = exp.position || exp.role || 'Peran/Jabatan';
            const isDuplicate = experiences.some(
              (existing) => existing.organization.toLowerCase() === org.toLowerCase() && existing.position.toLowerCase() === pos.toLowerCase()
            );
            if (!isDuplicate) {
              await fetch(`${apiUrl}/api/associate/experiences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                  organization: org,
                  position: pos,
                  industry: exp.industry || 'Umum',
                  startDate: exp.startDate || '2020-01',
                  endDate: exp.endDate || undefined,
                  isCurrent: !exp.endDate,
                  description: exp.description || ''
                }),
              });
            }
          }
        }

        // === 3. Save Education (skip duplicates) ===
        const educationsToSave = parsed.education || [];
        if (Array.isArray(educationsToSave)) {
          for (const edu of educationsToSave) {
            if (!edu.institution || !edu.degree) continue;
            const isDuplicate = educations.some(
              (existing) => existing.institution?.toLowerCase() === edu.institution?.toLowerCase() && existing.degree?.toLowerCase() === edu.degree?.toLowerCase()
            );
            if (!isDuplicate) {
              await fetch(`${apiUrl}/api/associate/educations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                  institution: edu.institution,
                  degree: edu.degree,
                  fieldOfStudy: edu.fieldOfStudy || undefined,
                  startYear: edu.startYear || undefined,
                  endYear: edu.endYear || undefined,
                }),
              });
            }
          }
        }

        // === 4. Save Skills (skip duplicates) ===
        const skillsToSave = parsed.skills || [];
        if (Array.isArray(skillsToSave)) {
          for (const skill of skillsToSave) {
            if (!skill.name) continue;
            const isDuplicate = skills.some(
              (existing) => existing.skill_name?.toLowerCase() === skill.name?.toLowerCase()
            );
            if (!isDuplicate) {
              const validCategories = ['technical', 'soft_skill', 'industry', 'other'];
              const validProficiencies = ['beginner', 'intermediate', 'advanced', 'expert'];
              await fetch(`${apiUrl}/api/associate/skills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                  skillName: skill.name,
                  category: validCategories.includes(skill.category) ? skill.category : 'other',
                  proficiency: validProficiencies.includes(skill.proficiency) ? skill.proficiency : 'intermediate',
                  yearsExperience: skill.yearsExperience || undefined,
                }),
              });
            }
          }
        }

        // === 5. Save Certifications (skip duplicates) ===
        const certsToSave = parsed.certifications || [];
        if (Array.isArray(certsToSave)) {
          for (const cert of certsToSave) {
            if (!cert.name || !cert.issuer) continue;
            const isDuplicate = certifications.some(
              (existing) => existing.name?.toLowerCase() === cert.name?.toLowerCase()
            );
            if (!isDuplicate) {
              await fetch(`${apiUrl}/api/associate/certifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                  name: cert.name,
                  issuer: cert.issuer,
                  issueDate: cert.issueDate || undefined,
                  expiryDate: cert.expiryDate || undefined,
                }),
              });
            }
          }
        }

        // === 6. Save Languages (skip duplicates) ===
        const langsToSave = parsed.languages || [];
        if (Array.isArray(langsToSave)) {
          for (const lang of langsToSave) {
            if (!lang.language) continue;
            const isDuplicate = languages.some(
              (existing) => existing.language?.toLowerCase() === lang.language?.toLowerCase()
            );
            if (!isDuplicate) {
              const validProf = ['basic', 'conversational', 'fluent', 'native'];
              await fetch(`${apiUrl}/api/associate/languages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                  language: lang.language,
                  proficiency: validProf.includes(lang.proficiency) ? lang.proficiency : 'fluent',
                }),
              });
            }
          }
        }

        await fetchProfile();
        showToastNotification('Autofill profile dari CV berhasil!', 'success');
      } else {
        showToastNotification(json.error || 'Gagal memproses autofill CV', 'error');
      }
    } catch (e) {
      console.error(e);
      const isTimeout = e instanceof DOMException && e.name === 'AbortError';
      showToastNotification(
        isTimeout
          ? 'AI timeout — silakan coba Re-parse CV lagi.'
          : 'Gagal memproses autofill CV',
        isTimeout ? 'warning' : 'error'
      );
    } finally {
      setParsingCV(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    if (!editProfile) return;
    const cur = editProfile.roles || [];
    const next = cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role];
    setEditProfile({ ...editProfile, roles: next, headline: next.join(' & ') });
  };

  const handleSubmitForReview = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        await fetchProfile();
        showToastNotification('Profil berhasil dikirim untuk review!', 'success');
      } else {
        showToastNotification(json.error || 'Gagal mengirim profil', 'error');
      }
    } catch {
      showToastNotification('Gagal mengirim profil', 'error');
    }
  };

  const handleAddExpertise = (expName: string) => {
    if (!editProfile || !expName.trim()) return;
    const cur = editProfile.expertises || [];
    if (cur.includes(expName.trim())) return;
    setEditProfile({ ...editProfile, expertises: [...cur, expName.trim()] });
    setSearchExpertise('');
    setDropdownOpen(false);
  };

  const handleRemoveExpertise = (expName: string) => {
    if (!editProfile) return;
    setEditProfile({ ...editProfile, expertises: (editProfile.expertises || []).filter((e) => e !== expName) });
  };

  const filteredPresets = EXPERTISES_PRESETS.filter(
    (item) => item.toLowerCase().includes(searchExpertise.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-8">
      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto">
              {confirmDialog.confirmVariant === 'danger' ? (
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-500 text-center mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => confirmDialog.onConfirm()}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-sm ${
                  confirmDialog.confirmVariant === 'danger'
                    ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/25'
                    : 'bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] hover:from-[#0A255A] hover:to-[#071A33] shadow-[#0B2C6B]/25'
                }`}
              >
                {confirmDialog.confirmLabel || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg border text-xs font-semibold text-white bg-slate-900 border-slate-800 transition-all duration-300">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
            {toast.type === 'success' ? (
              <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : toast.type === 'warning' ? (
              <svg className="h-3 w-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="h-3 w-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/50 hover:text-white">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Profile Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2C6B] via-[#1440a0] to-[#1e3a8a] p-6 sm:p-8 shadow-lg mb-6 text-white">
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar Photo Widget */}
              <div className="relative flex-shrink-0 group cursor-pointer">
                <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white/30 shadow-lg sm:h-24 sm:w-24 bg-slate-100 flex items-center justify-center">
                  {uploadingPhoto ? (
                    <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                      <svg className="h-5 w-5 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-[8px] font-semibold text-slate-500">Uploading...</span>
                    </div>
                  ) : p?.photo_url ? (
                    <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Avatar name={p?.full_name} size="xl" className="h-full w-full" />
                  )}
                  {!uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-bold text-white transition-opacity rounded-full">
                      Ubah Foto
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                  }}
                />
              </div>

              {/* Name & Info */}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D9A441]">Talent Profile</p>
                <h1 className="mt-1 text-xl font-bold sm:text-2xl truncate">
                  {p?.full_name || 'Lengkapi Profile Anda'}
                </h1>
                
                <div className="mt-4 flex flex-col gap-3">
                  {/* Bidang */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-20 flex-shrink-0">Bidang</span>
                    <div className="flex flex-wrap gap-1.5">
                      {p?.roles && p.roles.length > 0 ? (
                        p.roles.map((role) => (
                          <span key={role} className="rounded-md bg-white/20 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
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
                      {p?.expertises && p.expertises.length > 0 ? (
                        p.expertises.map((exp) => (
                          <span key={exp} className="rounded-md bg-black/20 border border-white/5 px-2.5 py-0.5 text-xs text-white/90">
                            {exp}
                          </span>
                        ))
                      ) : skills && skills.length > 0 ? (
                        skills.map((sk) => (
                          <span key={sk.id} className="rounded-md bg-black/20 border border-white/5 px-2.5 py-0.5 text-xs text-white/90">
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
                      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${availability?.status === 'available' ? 'bg-green-500/20 border-green-400/30 text-green-100' : 'bg-yellow-500/20 border-yellow-400/30 text-yellow-100'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${availability?.status === 'available' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        {availability?.status === 'available' ? 'Available' : 'Not Available'}
                      </div>
                      {availability?.work_locations && availability.work_locations.length > 0 && (
                        <span className="text-xs text-white/80 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          {availability.work_locations.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              {/* Review Status Badge */}
              {data?.status && (
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wide ${
                  data.status === 'active' ? 'bg-green-500/20 text-green-100 border border-green-400/30' :
                  data.status === 'pending_review' ? 'bg-amber-500/20 text-amber-100 border border-amber-400/30' :
                  'bg-white/10 text-white/60 border border-white/10'
                }`}>
                  {data.status === 'active' ? 'APPROVED' :
                   data.status === 'pending_review' ? 'PENDING REVIEW' :
                   'DRAFT'}
                </span>
              )}
              {isEditing ? (
                <>
                  <button onClick={handleCancelEdit} className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors">
                    Batal
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#0B2C6B] shadow-sm transition-all hover:bg-white/90 hover:shadow disabled:opacity-50 disabled:shadow-none">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleStartEdit} className="rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c89438] transition-colors">
                    Edit Profile
                  </button>
                  {data?.status === 'draft' && (
                    <button onClick={handleSubmitForReview} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors">
                      Submit for Review
                    </button>
                  )}
                </div>
              )}
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

        {/* Tab Panel */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-6 pt-4 border-b border-slate-100" />
          <div className="p-6">

            {/* ==================== TAB: PROFIL ==================== */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* -- Identitas -- */}
                <div>
                  <SectionHeader title="Identitas" description="Informasi dasar yang menggambarkan siapa Anda" />
                  {isEditing ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormInput label="Nama Lengkap *" value={editProfile?.full_name || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, full_name: v } : d)} placeholder="Nama sesuai KTP" />
                      <FormInput label="Nama Panggilan" value={editProfile?.preferred_name || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, preferred_name: v } : d)} placeholder="Nama yang biasa dipanggil" />
                      <FormInput label="Nomor WhatsApp" value={editProfile?.phone || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, phone: v } : d)} placeholder="+62 8xx xxxx xxxx" />
                      <FormInput label="Kota / Domisili" value={editProfile?.city || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, city: v } : d)} placeholder="Jakarta Selatan" />
                      <FormInput label="Kewarganegaraan" value={editProfile?.nationality || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, nationality: v } : d)} placeholder="Indonesia" />
                      <FormInput label="Tanggal Lahir" type="date" value={editProfile?.date_of_birth || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, date_of_birth: v } : d)} />
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Jenis Kelamin</label>
                        <select
                          value={editProfile?.gender || ''}
                          onChange={(e) => setEditProfile((d) => d ? { ...d, gender: e.target.value } : d)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/20"
                        >
                          <option value="">Pilih Jenis Kelamin</option>
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Timezone</label>
                        <select
                          value={editProfile?.timezone || ''}
                          onChange={(e) => setEditProfile((d) => d ? { ...d, timezone: e.target.value } : d)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          <option value="">Pilih timezone</option>
                          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {p?.email && <InfoCard label="Email" value={p.email} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />}
                      {p?.phone && <InfoCard label="WhatsApp" value={p.phone} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} />}
                      {p?.city && <InfoCard label="Domisili" value={p.city} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />}
                      {p?.nationality && <InfoCard label="Kewarganegaraan" value={p.nationality} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />}
                      {p?.date_of_birth && <InfoCard label="Tanggal Lahir" value={p.date_of_birth} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />}
                      {p?.gender && <InfoCard label="Jenis Kelamin" value={p.gender} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />}
                      {p?.timezone && <InfoCard label="Timezone" value={p.timezone} icon={<svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* -- Profesional -- */}
                <div>
                  <SectionHeader title="Identitas Profesional" description="Peran penugasan dan keahlian utama Anda" />
                  {isEditing ? (
                    <div className="space-y-5">
                      <FormInput label="Headline Profesional" value={editProfile?.headline || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, headline: v } : d)} placeholder="Trainer & Coach" />
                      <FormTextarea label="Tentang Saya" value={editProfile?.bio || ''} onChange={(v) => setEditProfile((d) => d ? { ...d, bio: v } : d)} placeholder="Ceritakan riwayat karir singkat Anda..." />
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-2">Bidang Penugasan (Roles)</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ROLES.map((role) => {
                            const active = (editProfile?.roles || []).includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleToggle(role)}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                                  active ? 'bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] text-white border-[#0B2C6B] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-2">Keahlian Utama</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(editProfile?.expertises || []).map((exp) => (
                            <span key={exp} className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700">
                              {exp}
                              <button type="button" onClick={() => handleRemoveExpertise(exp)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">×</button>
                            </span>
                          ))}
                        </div>
                        <div className="relative max-w-sm">
                          <input
                            type="text"
                            value={searchExpertise}
                            onFocus={() => setDropdownOpen(true)}
                            onChange={(e) => setSearchExpertise(e.target.value)}
                            placeholder="Cari keahlian atau ketik manual..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
                          />
                          {dropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-20 divide-y divide-slate-100">
                              {filteredPresets.map((preset) => (
                                <button key={preset} type="button" onClick={() => handleAddExpertise(preset)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">{preset}</button>
                              ))}
                              {searchExpertise.trim() && !EXPERTISES_PRESETS.includes(searchExpertise.trim()) && (
                                <button type="button" onClick={() => handleAddExpertise(searchExpertise)} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#0B2C6B] hover:bg-slate-50">
                                  Tambah &quot;{searchExpertise}&quot; (Kustom)
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(!p?.bio && (!p?.roles || p.roles.length === 0) && skills.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3"><svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                          <p className="text-sm font-medium text-slate-500 mb-3">Belum ada Bidang & Keahlian yang diatur</p>
                          <button type="button" onClick={handleStartEdit} className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#0A255A] transition-colors">Atur Sekarang</button>
                        </div>
                      ) : (
                        <>
                          {p?.bio && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Tentang Saya</h4>
                              <p className="text-sm text-slate-600 leading-relaxed">{p.bio}</p>
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Bidang Penugasan</h4>
                            {p?.roles && p.roles.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {p.roles.map((r) => <span key={r} className="rounded-full bg-[#0B2C6B] px-3 py-1 text-xs font-semibold text-white">{r}</span>)}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Belum ada bidang penugasan dipilih</p>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Keahlian Utama</h4>
                            {p?.expertises && p.expertises.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {p.expertises.map((e) => <span key={e} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{e}</span>)}
                              </div>
                            ) : skills.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {skills.map((sk) => <span key={sk.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{sk.skill_name}</span>)}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Belum ada keahlian dipilih</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB: PENGALAMAN ==================== */}
            {activeTab === 'experience' && (
              <div className="space-y-8">
                {/* -- Experience -- */}
                <div>
                  <SectionHeader title="Riwayat Pengalaman" description="Tampilkan pengalaman kerja dan proyek Anda" />
                  {isEditing && (
                  <form onSubmit={handleAddExperience} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Tambah Pengalaman</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="text" placeholder="Nama Perusahaan/Organisasi *" required value={newExp.organization} onChange={(e) => setNewExp({ ...newExp, organization: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="text" placeholder="Posisi/Jabatan *" required value={newExp.position} onChange={(e) => setNewExp({ ...newExp, position: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="text" placeholder="Industri (opsional)" value={newExp.industry} onChange={(e) => setNewExp({ ...newExp, industry: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Mulai (YYYY-MM) *" required value={newExp.startDate} onChange={(e) => setNewExp({ ...newExp, startDate: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                        <input type="text" placeholder="Selesai (YYYY-MM)" disabled={newExp.isCurrent} value={newExp.endDate} onChange={(e) => setNewExp({ ...newExp, endDate: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={newExp.isCurrent} onChange={(e) => setNewExp({ ...newExp, isCurrent: e.target.checked })} className="rounded" />
                      Masih menempati posisi ini
                    </label>
                    <textarea placeholder="Deskripsi pekerjaan (opsional)" rows={2} value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                    <textarea placeholder="Pencapaian / Hasil kerja (opsional)" rows={1} value={newExp.achievement} onChange={(e) => setNewExp({ ...newExp, achievement: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                    <button type="submit" className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold">Simpan Pengalaman</button>
                  </form>
                  )}

                  {experiences.length === 0 ? <EmptyState text="Belum ada pengalaman" /> : (
                    <div className="space-y-4">
                      {experiences.map((exp) => (
                        <div key={exp.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          {editingExp === exp.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <input type="text" placeholder="Organisasi" value={editExpData.organization} onChange={(e) => setEditExpData({ ...editExpData, organization: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                <input type="text" placeholder="Posisi" value={editExpData.position} onChange={(e) => setEditExpData({ ...editExpData, position: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                <input type="text" placeholder="Industri" value={editExpData.industry} onChange={(e) => setEditExpData({ ...editExpData, industry: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                <div className="grid grid-cols-2 gap-2">
                                  <input type="text" placeholder="Mulai (YYYY-MM)" value={editExpData.startDate} onChange={(e) => setEditExpData({ ...editExpData, startDate: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                  <input type="text" placeholder="Selesai" disabled={editExpData.isCurrent} value={editExpData.endDate} onChange={(e) => setEditExpData({ ...editExpData, endDate: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                </div>
                              </div>
                              <textarea placeholder="Deskripsi" rows={2} value={editExpData.description} onChange={(e) => setEditExpData({ ...editExpData, description: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                              <textarea placeholder="Pencapaian" rows={1} value={editExpData.achievement} onChange={(e) => setEditExpData({ ...editExpData, achievement: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                              <div className="flex gap-2">
                                <button onClick={handleSaveEditExp} className="rounded-lg bg-[#0B2C6B] text-white px-3 py-1.5 text-xs font-semibold">Simpan</button>
                                <button onClick={() => setEditingExp(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">Batal</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{exp.position}</p>
                                <p className="text-xs text-[#0B2C6B] font-semibold">{exp.organization}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{exp.start_date} – {exp.is_current ? 'Sekarang' : exp.end_date}</p>
                                {exp.description && <p className="text-xs text-slate-500 mt-2">{exp.description}</p>}
                              </div>
                              {isEditing && (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleStartEditExp(exp)} className="text-[#0B2C6B] hover:text-[#0A255A] text-xs font-semibold">Edit</button>
                                <button type="button" onClick={() => handleDeleteExperience(exp.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                              </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* -- Education -- */}
                <div>
                  <SectionHeader title="Riwayat Pendidikan" description="Kelola riwayat pendidikan formal Anda" />
                  {isEditing && (
                  <form onSubmit={handleAddEducation} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Tambah Riwayat Pendidikan</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="text" placeholder="Nama Instansi/Universitas *" required value={newEdu.institution} onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="text" placeholder="Gelar/Jenjang (S1, S2, dsb.) *" required value={newEdu.degree} onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="text" placeholder="Jurusan/Bidang Studi" value={newEdu.fieldOfStudy} onChange={(e) => setNewEdu({ ...newEdu, fieldOfStudy: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Tahun Masuk" value={newEdu.startYear} onChange={(e) => setNewEdu({ ...newEdu, startYear: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                        <input type="number" placeholder="Tahun Lulus" value={newEdu.endYear} onChange={(e) => setNewEdu({ ...newEdu, endYear: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      </div>
                    </div>
                    <button type="submit" className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold">Simpan Pendidikan</button>
                  </form>
                  )}

                  {educations.length === 0 ? <EmptyState text="Belum ada riwayat pendidikan" /> : (
                    <div className="space-y-4">
                      {educations.map((edu) => (
                        <div key={edu.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          {editingEdu === edu.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <input type="text" placeholder="Instansi" value={editEduData.institution} onChange={(e) => setEditEduData({ ...editEduData, institution: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                <input type="text" placeholder="Gelar" value={editEduData.degree} onChange={(e) => setEditEduData({ ...editEduData, degree: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                <input type="text" placeholder="Jurusan" value={editEduData.fieldOfStudy} onChange={(e) => setEditEduData({ ...editEduData, fieldOfStudy: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                <div className="grid grid-cols-2 gap-2">
                                  <input type="number" placeholder="Tahun Masuk" value={editEduData.startYear} onChange={(e) => setEditEduData({ ...editEduData, startYear: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                  <input type="number" placeholder="Tahun Lulus" value={editEduData.endYear} onChange={(e) => setEditEduData({ ...editEduData, endYear: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={handleSaveEditEdu} className="rounded-lg bg-[#0B2C6B] text-white px-3 py-1.5 text-xs font-semibold">Simpan</button>
                                <button onClick={() => setEditingEdu(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">Batal</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{edu.degree} {edu.field_of_study ? `– ${edu.field_of_study}` : ''}</p>
                                <p className="text-xs text-[#0B2C6B] font-semibold">{edu.institution}</p>
                                {(edu.start_year || edu.end_year) && (
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {edu.start_year || '?'} – {edu.end_year || 'Sekarang'}
                                  </p>
                                )}
                              </div>
                              {isEditing && (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleStartEditEdu(edu)} className="text-[#0B2C6B] hover:text-[#0A255A] text-xs font-semibold">Edit</button>
                                <button type="button" onClick={() => handleDeleteEducation(edu.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                              </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* -- Portfolio -- */}
                <div>
                  <SectionHeader title="Portofolio Karya" description="Studi kasus, slide modul pelatihan, dll." />
                  {isEditing && (
                  <form onSubmit={handleAddPortfolio} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Tambah Portofolio Karya</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="text" placeholder="Judul Portofolio *" required value={newPortfolio.title} onChange={(e) => setNewPortfolio({ ...newPortfolio, title: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="text" placeholder="Nama Klien" value={newPortfolio.clientName} onChange={(e) => setNewPortfolio({ ...newPortfolio, clientName: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <select value={newPortfolio.category} onChange={(e) => setNewPortfolio({ ...newPortfolio, category: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                        {PORTFOLIO_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <input type="url" placeholder="Link Projek (https://...)" value={newPortfolio.projectUrl} onChange={(e) => setNewPortfolio({ ...newPortfolio, projectUrl: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                    </div>
                    <textarea placeholder="Deskripsi singkat..." rows={2} value={newPortfolio.description} onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                    <button type="submit" className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold">Simpan Portofolio</button>
                  </form>
                  )}

                  {portfolios.length === 0 ? <EmptyState text="Belum ada portofolio" /> : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {portfolios.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col justify-between">
                          <div>
                            <span className="inline-block rounded bg-[#0B2C6B]/10 px-2 py-0.5 text-[9px] font-bold text-[#0B2C6B] mb-2">{item.category}</span>
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            {item.client_name && <p className="text-xs text-slate-400">Klien: {item.client_name}</p>}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            {item.project_url && <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#0B2C6B]">Detail →</a>}
                            {isEditing && (
                            <button onClick={() => handleDeletePortfolio(item.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB: KEAHLIAN ==================== */}
            {activeTab === 'skills' && (
              <div className="space-y-8">
                {/* -- Skills -- */}
                <div>
                  <SectionHeader title="Keahlian" description="Daftar keahlian dan level kemampuan Anda" />
                  {isEditing && (
                  <form onSubmit={handleAddSkill} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Tambah Keahlian</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="text" placeholder="Nama Keahlian *" required value={newSkill.skillName} onChange={(e) => setNewSkill({ ...newSkill, skillName: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <select value={newSkill.category} onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                        <option value="technical">Technical</option>
                        <option value="soft_skill">Soft Skill</option>
                        <option value="industry">Industry</option>
                        <option value="other">Other</option>
                      </select>
                      <select value={newSkill.proficiency} onChange={(e) => setNewSkill({ ...newSkill, proficiency: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                      <input type="number" placeholder="Tahun Pengalaman" min="0" max="100" value={newSkill.yearsExperience} onChange={(e) => setNewSkill({ ...newSkill, yearsExperience: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                    </div>
                    <button type="submit" className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold">Simpan Keahlian</button>
                  </form>
                  )}

                  {skills.length === 0 ? <EmptyState text="Belum ada keahlian" /> : (
                    <div className="space-y-2">
                      {skills.map((sk) => (
                        <div key={sk.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-900">{sk.skill_name}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{sk.category || 'Other'}</span>
                            <span className="rounded-full bg-[#0B2C6B]/10 px-2 py-0.5 text-[10px] font-bold text-[#0B2C6B]">{sk.proficiency || 'Beginner'}</span>
                            {sk.years_experience ? <span className="text-[10px] text-slate-400">{sk.years_experience}th</span> : null}
                          </div>
                          {isEditing && (
                          <button onClick={() => handleDeleteSkill(sk.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* -- Languages -- */}
                <div>
                  <SectionHeader title="Bahasa" description="Bahasa yang Anda kuasai" />
                  {isEditing && (
                  <form onSubmit={handleAddLanguage} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Tambah Bahasa</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="text" placeholder="Nama Bahasa *" required value={newLanguage.language} onChange={(e) => setNewLanguage({ ...newLanguage, language: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <select value={newLanguage.proficiency} onChange={(e) => setNewLanguage({ ...newLanguage, proficiency: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                        <option value="basic">Basic</option>
                        <option value="conversational">Conversational</option>
                        <option value="fluent">Fluent</option>
                        <option value="native">Native</option>
                      </select>
                    </div>
                    <button type="submit" className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold">Simpan Bahasa</button>
                  </form>
                  )}

                  {languages.length === 0 ? <EmptyState text="Belum ada bahasa" /> : (
                    <div className="space-y-2">
                      {languages.map((lang) => (
                        <div key={lang.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-900">{lang.language}</span>
                            <span className="rounded-full bg-[#0B2C6B]/10 px-2 py-0.5 text-[10px] font-bold text-[#0B2C6B] capitalize">{lang.proficiency}</span>
                          </div>
                          {isEditing && (
                          <button onClick={() => handleDeleteLanguage(lang.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB: KETERSEDIAAN ==================== */}
            {activeTab === 'availability' && (
              <div className="space-y-8">
                {/* -- Availability -- */}
                <div>
                  <SectionHeader title="Ketersediaan" description="Informasi status penugasan Anda" />
                  {isEditing ? (
                  <AvailabilityEditor availability={availability} accessToken={accessToken} apiUrl={apiUrl} onSaved={fetchProfile} />
                  ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    {availability ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">Status:</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${availability.status === 'available' ? 'bg-emerald-50 text-emerald-700' : availability.status === 'busy' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {availability.status === 'available' ? 'Tersedia' : availability.status === 'busy' ? 'Sibuk' : 'Tidak Tersedia'}
                          </span>
                        </div>
                        {availability.max_hours_per_week && <p className="text-xs text-slate-500">Max {availability.max_hours_per_week} jam/minggu</p>}
                        {availability.work_locations && availability.work_locations.length > 0 && (
                          <p className="text-xs text-slate-500">Lokasi: {availability.work_locations.join(', ')}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">Belum ada informasi ketersediaan</p>
                    )}
                  </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* -- Social Links -- */}
                <div>
                  <SectionHeader title="Social Links" description="Tautan media sosial dan profil profesional Anda" />
                  {isEditing && (
                  <form onSubmit={handleAddSocialLink} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Tambah Social Link</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <select value={newSocialLink.platform} onChange={(e) => setNewSocialLink({ ...newSocialLink, platform: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">Twitter</option>
                        <option value="github">GitHub</option>
                        <option value="website">Website</option>
                        <option value="other">Other</option>
                      </select>
                      <input type="url" placeholder="https://..." required value={newSocialLink.url} onChange={(e) => setNewSocialLink({ ...newSocialLink, url: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                    </div>
                    <button type="submit" className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold">Simpan Link</button>
                  </form>
                  )}

                  {socialLinks.length === 0 ? <EmptyState text="Belum ada social links" /> : (
                    <div className="space-y-2">
                      {socialLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">{link.platform}</span>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0B2C6B] hover:underline truncate max-w-[300px]">{link.url}</a>
                          </div>
                          {isEditing && (
                          <button onClick={() => handleDeleteSocialLink(link.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* -- Emergency Contact -- */}
                <div>
                  <SectionHeader title="Kontak Darurat" description="Orang yang dapat dihubungi dalam keadaan darurat" />
                  {isEditing ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="text" placeholder="Nama Lengkap *" value={emergencyContact.name} onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="text" placeholder="Hubungan (Orang Tua, Pasangan, dll.)" value={emergencyContact.relationship} onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="tel" placeholder="Nomor Telepon *" value={emergencyContact.phone} onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      <input type="email" placeholder="Email (opsional)" value={emergencyContact.email} onChange={(e) => setEmergencyContact({ ...emergencyContact, email: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                    </div>
                    <button onClick={handleSaveEmergencyContact} disabled={!emergencyContact.name || !emergencyContact.phone} className="rounded-lg bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold disabled:opacity-50">Simpan Kontak Darurat</button>
                  </div>
                  ) : emergencyData ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-600 mb-2">Kontak Saat Ini</p>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{emergencyData.name}</p>
                      <p className="text-xs text-slate-500">{emergencyData.relationship} • {emergencyData.phone}</p>
                      {emergencyData.email && <p className="text-xs text-slate-400">{emergencyData.email}</p>}
                    </div>
                  </div>
                  ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-400">Belum ada kontak darurat</p>
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB: DOKUMEN ==================== */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <SectionHeader title="Dokumen" description="Berkas CV utama Anda" />
                <div id="upload-cv-area" className="rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">CV / Resume Berkas</h4>
                      <p className="text-xs text-slate-400 mt-0.5">PDF atau Word, maks 10MB. Profil akan terisi otomatis setelah upload.</p>
                    </div>
                    {isEditing && (
                    <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition-all ${(uploadingCV || parsingCV) ? 'bg-slate-400' : 'bg-[#0B2C6B] hover:bg-[#0A255A]'}`}>
                      {uploadingCV ? 'Mengupload...' : parsingCV ? 'AI Mengisi Profil...' : cvDoc ? 'Ganti CV' : 'Upload CV'}
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploadingCV || parsingCV} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCVUpload(f); }} />
                    </label>
                    )}
                  </div>

                  {parsingCV && (
                    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      <div>
                        <p className="text-xs font-semibold text-blue-800">AI sedang mengekstrak data dari CV Anda...</p>
                        <p className="text-[10px] text-blue-600">Nama, riwayat kerja, kota, dan bio akan terisi otomatis</p>
                      </div>
                    </div>
                  )}

                  {cvDoc ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="h-8 w-8 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{cvDoc.name}</p>
                            <p className="text-[10px] text-slate-400">Diupload {new Date(cvDoc.created_at).toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => window.open(`${apiUrl}/api/files/${cvDoc.id}/view`, '_blank')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Unduh</button>
                          <button onClick={() => handleDeleteDocument(cvDoc.id, cvDoc.name)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">Hapus</button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Re-parse CV dengan AI</p>
                          <p className="text-[10px] text-slate-400">Perbarui data profil dari CV yang sudah diupload</p>
                        </div>
                        {isEditing && (
                        <button onClick={handleParseCV} disabled={parsingCV} className="rounded-lg bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 text-xs font-semibold disabled:opacity-50">
                          {parsingCV ? 'Mengekstrak...' : 'Re-parse CV'}
                        </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center bg-white">
                      <p className="text-xs text-slate-400">Belum ada CV terunggah</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// AVAILABILITY EDITOR
// ============================================
function AvailabilityEditor({
  availability, accessToken, apiUrl, onSaved
}: {
  availability: Availability | null | undefined;
  accessToken: string | null;
  apiUrl: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(availability?.status || 'available');
  const [workLocs, setWorkLocs] = useState<string[]>(availability?.work_locations || []);
  const [travel, setTravel] = useState(availability?.travel_ready || false);
  const [engagements, setEngagements] = useState<string[]>(availability?.preferred_engagements || []);
  const [maxHours, setMaxHours] = useState(availability?.max_hours_per_week?.toString() || '');
  const [notes, setNotes] = useState(availability?.notes || '');
  const [saving, setSaving] = useState(false);

  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/associate/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status, workLocations: workLocs, travelReady: travel, preferredEngagements: engagements, maxHoursPerWeek: maxHours ? parseInt(maxHours) : null, notes }),
      });
      if (res.ok) onSaved();
      else console.error('Gagal menyimpan ketersediaan');
    } catch { console.error('Gagal menyimpan ketersediaan'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-2">Status Ketersediaan</label>
        <div className="flex gap-2">
          {[
            { val: 'available', label: '🟢 Tersedia', cls: 'border-emerald-500 bg-emerald-500 text-white' },
            { val: 'limited', label: '🟡 Terbatas', cls: 'border-amber-400 bg-amber-400 text-white' },
            { val: 'unavailable', label: '🔴 Tidak Tersedia', cls: 'border-red-500 bg-red-500 text-white' },
          ].map(({ val, label, cls }) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatus(val)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold border transition-all ${
                status === val ? cls : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-2">Lokasi Kerja</label>
        <div className="flex gap-2">
          {WORK_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => toggleArr(workLocs, loc, setWorkLocs)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold border transition-all ${
                workLocs.includes(loc) ? 'bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] text-white border-[#0B2C6B] shadow-sm' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">Siap Perjalanan Dinas</p>
          <p className="text-[10px] text-slate-400">Bersedia ditugaskan ke luar kota</p>
        </div>
        <input type="checkbox" checked={travel} onChange={(e) => setTravel(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#0B2C6B]" />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-2">Preferensi Penugasan</label>
        <div className="flex flex-wrap gap-1.5">
          {ENGAGEMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleArr(engagements, type, setEngagements)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                engagements.includes(type) ? 'bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] text-white border-[#0B2C6B] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-2">Maks Jam/Minggu</label>
        <input
          type="number"
          min="0"
          max="80"
          placeholder="Contoh: 40"
          value={maxHours}
          onChange={(e) => setMaxHours(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/20"
        />
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-[#0B2C6B] text-white px-5 py-2.5 text-xs font-semibold">
        {saving ? 'Menyimpan...' : 'Simpan Ketersediaan'}
      </button>
    </div>
  );
}

