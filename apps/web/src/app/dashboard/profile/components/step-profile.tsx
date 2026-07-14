'use client';

import { useState } from 'react';
import { ProfileData } from '../types';

type StepProfileProps = {
  profile: ProfileData;
  saving: boolean;
  onUpdate: (data: Partial<ProfileData>) => void;
  onSave: () => void;
};

const roleOptions = [
  'Trainer', 'Facilitator', 'Coach', 'Mentor', 'Consultant', 'Assessor', 'Speaker', 'Game Master',
];

const expertiseOptions = [
  'Leadership Development', 'Organizational Development', 'Learning & Development',
  'Change Management', 'Team Building & Teamwork', 'Communication & Interpersonal Skills',
  'Soft Skills Training', 'Culture Transformation', 'Design Thinking & Innovation',
];

// Helper: Custom Select Component for Upward Dropdown in Edit Mode
function CustomSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  icon: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-20'}`}>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {icon}
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-left transition-all focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {selectedOption?.label || label}
        </span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 bottom-full mb-1.5 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-xs text-left transition-colors ${
                  value === opt.value
                    ? 'bg-[#0B2C6B]/5 text-[#0B2C6B] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const GENDER_OPTIONS = [
  { value: '', label: 'Pilih gender' },
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
  { value: 'other', label: 'Lainnya' },
];

const TIMEZONE_OPTIONS = [
  { value: '', label: 'Pilih zona waktu' },
  { value: 'Asia/Jakarta', label: 'WIB — Jakarta, Bandung, Surabaya' },
  { value: 'Asia/Makassar', label: 'WITA — Makassar, Bali, Lombok' },
  { value: 'Asia/Jayapura', label: 'WIT — Jayapura, Ambon' },
  { value: 'Asia/Singapore', label: 'SGT — Singapore' },
  { value: 'Asia/Kuala_Lumpur', label: 'MYT — Kuala Lumpur' },
];

export function StepProfile({ profile, saving, onUpdate, onSave }: StepProfileProps) {
  const handleRoleToggle = (role: string) => {
    const cur = profile.roles || [];
    const next = cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role];
    onUpdate({ roles: next, headline: next.join(' & ') });
  };

  const handleExpertiseToggle = (exp: string) => {
    const cur = profile.expertises || [];
    const next = cur.includes(exp) ? cur.filter((e) => e !== exp) : [...cur, exp];
    onUpdate({ expertises: next });
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Nama Lengkap *
          </label>
          <input
            type="text"
            value={profile.full_name || ''}
            onChange={(e) => onUpdate({ full_name: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
            placeholder="Masukkan nama lengkap"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Nama Panggilan
          </label>
          <input
            type="text"
            value={profile.preferred_name || ''}
            onChange={(e) => onUpdate({ preferred_name: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
            placeholder="Masukkan nama panggilan"
          />
        </div>
      </div>

      {/* Headline / Title */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Headline Profesional
        </label>
        <input
          type="text"
          value={profile.headline || ''}
          onChange={(e) => onUpdate({ headline: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder="Contoh: Senior Facilitator & Leadership Specialist"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Bio / Ringkasan Profesional
        </label>
        <textarea
          value={profile.bio || ''}
          onChange={(e) => onUpdate({ bio: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all resize-none"
          placeholder="Ceritakan tentang kompetensi dan value Anda..."
        />
      </div>

      {/* Phone & City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Nomor WhatsApp
          </label>
          <input
            type="tel"
            value={profile.phone || ''}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
            placeholder="08xxxxxxxxxx"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Kota / Domisili
          </label>
          <input
            type="text"
            value={profile.city || ''}
            onChange={(e) => onUpdate({ city: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
            placeholder="Jakarta"
          />
        </div>
      </div>

      {/* Nationality & Timezone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Kewarganegaraan
          </label>
          <input
            type="text"
            value={profile.nationality || ''}
            onChange={(e) => onUpdate({ nationality: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
            placeholder="Indonesia"
          />
        </div>
        <CustomSelect
          label="Zona Waktu"
          value={profile.timezone || ''}
          options={TIMEZONE_OPTIONS}
          onChange={(val) => onUpdate({ timezone: val })}
          icon={
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Date of Birth & Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Tanggal Lahir
          </label>
          <input
            type="date"
            value={profile.date_of_birth || ''}
            onChange={(e) => onUpdate({ date_of_birth: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          />
        </div>
        <CustomSelect
          label="Gender"
          value={profile.gender || ''}
          options={GENDER_OPTIONS}
          onChange={(val) => onUpdate({ gender: val })}
          icon={
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>

      {/* Roles */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 3a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Peran / Peran Utama
        </label>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((role) => {
            const active = (profile.roles || []).includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleToggle(role)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border ${
                  active
                    ? 'bg-[#0B2C6B] text-white border-[#0B2C6B] shadow-sm'
                    : 'bg-white text-slate-650 border-slate-200 hover:border-[#0B2C6B]/30 hover:text-[#0B2C6B]'
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expertises */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Bidang Keahlian
        </label>
        <div className="flex flex-wrap gap-2">
          {expertiseOptions.map((exp) => {
            const active = (profile.expertises || []).includes(exp);
            return (
              <button
                key={exp}
                type="button"
                onClick={() => handleExpertiseToggle(exp)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border ${
                  active
                    ? 'bg-[#D9A441] text-white border-[#D9A441] shadow-sm'
                    : 'bg-white text-slate-650 border-slate-200 hover:border-[#D9A441]/30 hover:text-[#D9A441]'
                }`}
              >
                {exp}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
