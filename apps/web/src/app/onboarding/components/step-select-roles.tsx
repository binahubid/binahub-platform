'use client';

import { useState } from 'react';

const ROLE_OPTIONS = [
  { value: 'Trainer', icon: <TrainerIcon /> },
  { value: 'Facilitator', icon: <FacilitatorIcon /> },
  { value: 'Coach', icon: <CoachIcon /> },
  { value: 'Mentor', icon: <MentorIcon /> },
  { value: 'Consultant', icon: <ConsultantIcon /> },
  { value: 'Assessor', icon: <AssessorIcon /> },
  { value: 'Speaker', icon: <SpeakerIcon /> },
  { value: 'Game Master', icon: <GameMasterIcon /> },
  { value: 'Tour Leader', icon: <TrainerIcon /> },
  { value: 'Project Manager', icon: <FacilitatorIcon /> },
  { value: 'EO', icon: <CoachIcon /> },
  { value: 'MC', icon: <SpeakerIcon /> },
  { value: 'Photographer', icon: <TrainerIcon /> },
  { value: 'Videographer', icon: <FacilitatorIcon /> },
  { value: 'Affiliate Marketer', icon: <CoachIcon /> },
  { value: 'AI Consultant', icon: <ConsultantIcon /> },
];

function GameMasterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const EXPERTISE_OPTIONS = [
  { value: 'Leadership Development' },
  { value: 'Team Development' },
  { value: 'Learning & Facilitation' },
  { value: 'Coaching & Mentoring' },
  { value: 'Assessment & Talent' },
  { value: 'Organization Development' },
  { value: 'Performance & Execution' },
  { value: 'Business Consulting' },
  { value: 'Learning Design' },
  { value: 'Measurement & Analytics' },
  { value: 'AI & Digital Transformation' },
  { value: 'Spiritual & Character Development' },
];

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function TrainerIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function FacilitatorIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function CoachIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
function MentorIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function ConsultantIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
function AssessorIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function SpeakerIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v3a3 3 0 01-3 3z" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type AI_Skill = {
  name: string;
  category: string;
  proficiency: string;
};

type StepSelectRolesProps = {
  selectedRoles: string[];
  selectedExpertises: string[];
  skillsList: AI_Skill[];
  onRoleToggle: (role: string) => void;
  onExpertiseToggle: (expertise: string) => void;
  onRemoveSkill: (name: string) => void;
  onAddSkill: (skill: AI_Skill) => void;
};

export function StepSelectRoles({
  selectedRoles,
  selectedExpertises,
  skillsList,
  onRoleToggle,
  onExpertiseToggle,
  onRemoveSkill,
  onAddSkill,
}: StepSelectRolesProps) {
  const [newSkillName, setNewSkillName] = useState('');

  const handleAdd = () => {
    if (!newSkillName.trim()) return;
    onAddSkill({
      name: newSkillName.trim(),
      category: 'other',
      proficiency: 'intermediate',
    });
    setNewSkillName('');
  };

  return (
    <div className="space-y-6">
      {/* Roles */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Peran Associate</h3>
          <p className="text-xs text-slate-500 mt-0.5">Pilih maksimal 7 peran utama yang ingin Anda kontribusikan di BinaHub</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(({ value, icon }) => {
            const active = selectedRoles.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => onRoleToggle(value)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all border ${
                  active
                    ? 'bg-[#0B2C6B] text-white border-[#0B2C6B] shadow-sm shadow-[#0B2C6B]/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#0B2C6B]/40 hover:text-[#0B2C6B] hover:bg-[#0B2C6B]/3'
                }`}
              >
                <span className={active ? 'text-white' : 'text-slate-400'}>{icon}</span>
                <span>{value}</span>
                {active && (
                  <svg className="h-3 w-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Expertises */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Bidang Keahlian Utama</h3>
          <p className="text-xs text-slate-500 mt-0.5">Bidang Keahlian Utama (maksimal pilih 5)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map(({ value }) => {
            const active = selectedExpertises.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => onExpertiseToggle(value)}
                className={`rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all border ${
                  active
                    ? 'bg-[#D9A441] text-white border-[#D9A441] shadow-sm shadow-[#D9A441]/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#D9A441]/50 hover:text-[#c89438] hover:bg-[#D9A441]/5'
                }`}
              >
                {value}
                {active && (
                  <svg className="inline ml-1.5 h-3 w-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Skills list (AI detected) */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Keahlian & Kompetensi Spesifik</h3>
          <p className="text-xs text-slate-500 mt-0.5">Keahlian spesifik yang berhasil dideteksi dari CV Anda. Hapus atau tambahkan jika diperlukan.</p>
        </div>

        {/* Add skill input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Tambah keahlian baru..."
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0B2C6B] focus:border-[#0B2C6B]"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl bg-[#0B2C6B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#0A255A] transition-all"
          >
            Tambah
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {skillsList.map((sk) => (
            <div
              key={sk.name}
              className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 pl-3 pr-2 py-1.5 text-xs text-slate-700 font-medium"
            >
              <span>{sk.name}</span>
              <button
                type="button"
                onClick={() => onRemoveSkill(sk.name)}
                className="text-slate-400 hover:text-red-500 rounded p-0.5 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {skillsList.length === 0 && (
            <p className="text-xs text-slate-400 w-full text-center py-2">Belum ada keahlian spesifik.</p>
          )}
        </div>
      </div>
    </div>
  );
}
