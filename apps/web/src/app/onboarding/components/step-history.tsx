'use client';

import { useState } from 'react';

type Experience = {
  organization: string;
  position: string;
  industry?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
};

type Education = {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
};

type StepHistoryProps = {
  experiences: Experience[];
  educations: Education[];
  onChangeExperiences: (exp: Experience[]) => void;
  onChangeEducations: (edu: Education[]) => void;
};

export function StepHistory({
  experiences,
  educations,
  onChangeExperiences,
  onChangeEducations,
}: StepHistoryProps) {
  const [activeTab, setActiveTab] = useState<'experience' | 'education'>('experience');

  const removeExperience = (idx: number) => {
    onChangeExperiences(experiences.filter((_, i) => i !== idx));
  };

  const removeEducation = (idx: number) => {
    onChangeEducations(educations.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      {/* Sub tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('experience')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === 'experience' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pengalaman Kerja ({experiences.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('education')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === 'education' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pendidikan ({educations.length})
        </button>
      </div>

      {activeTab === 'experience' ? (
        <div className="space-y-3">
          {experiences.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">Belum ada data pengalaman kerja</p>
          ) : (
            experiences.map((exp, idx) => (
              <div key={idx} className="relative rounded-xl border border-slate-100 bg-slate-50 p-4 pr-10">
                <button
                  type="button"
                  onClick={() => removeExperience(idx)}
                  className="absolute top-3.5 right-3.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <p className="text-sm font-semibold text-slate-800">{exp.position}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{exp.organization}</p>
                <p className="text-[10px] text-slate-400 mt-1">{exp.startDate} — {exp.isCurrent ? 'Sekarang' : exp.endDate || '-'}</p>
                {exp.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{exp.description}</p>}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {educations.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">Belum ada data pendidikan</p>
          ) : (
            educations.map((edu, idx) => (
              <div key={idx} className="relative rounded-xl border border-slate-100 bg-slate-50 p-4 pr-10">
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  className="absolute top-3.5 right-3.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <p className="text-sm font-semibold text-slate-800">{edu.institution}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{edu.degree} {edu.fieldOfStudy ? `— ${edu.fieldOfStudy}` : ''}</p>
                <p className="text-[10px] text-slate-400 mt-1">{edu.startYear || '-'} — {edu.endYear || '-'}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
