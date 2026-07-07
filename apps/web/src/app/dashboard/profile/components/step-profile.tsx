'use client';

import { ProfileData } from '../types';

type StepProfileProps = {
  profile: ProfileData;
  saving: boolean;
  onUpdate: (data: Partial<ProfileData>) => void;
  onSave: () => void;
};

const roleOptions = [
  'Project Manager', 'Business Analyst', 'Scrum Master', 'Product Owner',
  'QA Lead', 'Data Analyst', 'IT Consultant', 'DevOps Engineer',
  'Software Developer', 'UI/UX Designer', 'Technical Writer', 'Solutions Architect',
];

const expertiseOptions = [
  'Banking & Finance', 'Healthcare', 'E-Commerce', 'Telecommunications',
  'Manufacturing', 'Education', 'Government', 'Startups', 'Fintech', 'Logistics',
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

      {/* Headline / Title */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Headline / Jabatan
        </label>
        <input
          type="text"
          value={profile.headline || ''}
          onChange={(e) => onUpdate({ headline: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder="Contoh: Senior Project Manager"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Bio / Tentang Saya
        </label>
        <textarea
          value={profile.bio || ''}
          onChange={(e) => onUpdate({ bio: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all resize-none"
          placeholder="Ceritakan tentang diri Anda..."
        />
      </div>

      {/* Phone & City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Telepon
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
            Kota
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

      {/* Roles */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Peran / Role
        </label>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((role) => {
            const active = (profile.roles || []).includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleToggle(role)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                  active
                    ? 'bg-[#0B2C6B] text-white border-[#0B2C6B] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#0B2C6B]/30 hover:text-[#0B2C6B]'
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
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                  active
                    ? 'bg-[#D9A441] text-white border-[#D9A441] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#D9A441]/30 hover:text-[#D9A441]'
                }`}
              >
                {exp}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan & Lanjut'}
        </button>
      </div>
    </div>
  );
}
