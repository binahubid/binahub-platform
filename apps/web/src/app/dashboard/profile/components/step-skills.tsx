'use client';

import { useState } from 'react';
import { Skill, Language } from '../types';

type StepSkillsProps = {
  skills: Skill[];
  languages: Language[];
  apiUrl: string;
  accessToken: string;
  onRefresh: () => void;
};

const proficiencyOptions = [
  { value: 'beginner', label: 'Pemula' },
  { value: 'intermediate', label: 'Menengah' },
  { value: 'advanced', label: 'Lanjut' },
  { value: 'expert', label: 'Ahli' },
  { value: 'fluent', label: 'Lancar' },
  { value: 'native', label: 'Native' },
];

export function StepSkills({ skills, languages, apiUrl, accessToken, onRefresh }: StepSkillsProps) {
  const [newSkill, setNewSkill] = useState({ skill_name: '', category: 'technical', proficiency: 'intermediate' });
  const [newLang, setNewLang] = useState({ language: '', proficiency: 'fluent' });
  const [saving, setSaving] = useState(false);

  const handleAddSkill = async () => {
    if (!newSkill.skill_name) return;
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/associate/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(newSkill),
      });
      setNewSkill({ skill_name: '', category: 'technical', proficiency: 'intermediate' });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await fetch(`${apiUrl}/api/associate/skills/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLanguage = async () => {
    if (!newLang.language) return;
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/associate/languages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(newLang),
      });
      setNewLang({ language: '', proficiency: 'fluent' });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLanguage = async (id: string) => {
    try {
      await fetch(`${apiUrl}/api/associate/languages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Skills Section */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-4">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Keahlian / Skills
        </h4>

        {/* Skill Tags */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((skill) => (
              <span key={skill.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2C6B]/10 px-3 py-1.5 text-xs font-medium text-[#0B2C6B]">
                {skill.skill_name}
                <span className="text-[10px] text-[#0B2C6B]/60">({skill.proficiency})</span>
                <button onClick={() => handleDeleteSkill(skill.id)} className="ml-0.5 rounded-full p-0.5 hover:bg-[#0B2C6B]/20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add Skill Form */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newSkill.skill_name}
            onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
            placeholder="Tambah skill baru..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
          />
          <select
            value={newSkill.proficiency}
            onChange={(e) => setNewSkill({ ...newSkill, proficiency: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          >
            {proficiencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleAddSkill}
            disabled={saving || !newSkill.skill_name}
            className="rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? '...' : 'Tambah'}
          </button>
        </div>
      </div>

      {/* Languages Section */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-4">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          Bahasa
        </h4>

        {/* Language Tags */}
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {languages.map((lang) => (
              <span key={lang.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441]/10 px-3 py-1.5 text-xs font-medium text-[#D9A441]">
                {lang.language}
                <span className="text-[10px] text-[#D9A441]/60">({lang.proficiency})</span>
                <button onClick={() => handleDeleteLanguage(lang.id)} className="ml-0.5 rounded-full p-0.5 hover:bg-[#D9A441]/20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add Language Form */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newLang.language}
            onChange={(e) => setNewLang({ ...newLang, language: e.target.value })}
            placeholder="Tambah bahasa..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddLanguage()}
          />
          <select
            value={newLang.proficiency}
            onChange={(e) => setNewLang({ ...newLang, proficiency: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="beginner">Pemula</option>
            <option value="intermediate">Menengah</option>
            <option value="advanced">Lanjut</option>
            <option value="fluent">Lancar</option>
            <option value="native">Native</option>
          </select>
          <button
            onClick={handleAddLanguage}
            disabled={saving || !newLang.language}
            className="rounded-lg bg-[#D9A441] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? '...' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}
