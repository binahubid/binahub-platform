'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

type ProfileCompletionCardProps = {
  completionPercentage: number;
  hasProfile: boolean;
  hasCV: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasPortfolio: boolean;
  userName?: string;
};

export function ProfileCompletionCard({
  completionPercentage,
  hasProfile,
  hasCV,
  hasExperience,
  hasEducation,
  hasSkills,
  hasPortfolio,
  userName,
}: ProfileCompletionCardProps) {
  const { accessToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleCVUpload = async (file: File) => {
    if (!file.name.match(/\.(pdf|doc|docx)$/i)) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      await fetch(`${apiUrl}/api/files/associate/current/cv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      setParsing(true);
      await new Promise((r) => setTimeout(r, 2000));
      window.location.reload();
    } catch {
      setUploading(false);
      setParsing(false);
    }
  };

  const steps = [
    { label: 'Upload CV', done: hasCV, href: '/dashboard/profile?tab=documents', priority: true },
    { label: 'Add Experience', done: hasExperience, href: '/dashboard/profile?tab=experience' },
    { label: 'Add Education', done: hasEducation, href: '/dashboard/profile?tab=education' },
    { label: 'Add Skills', done: hasSkills, href: '/dashboard/profile?tab=skills' },
    { label: 'Upload Portfolio', done: hasPortfolio, href: '/dashboard/profile?tab=portfolio' },
  ];

  const nextStep = steps.find((s) => !s.done);

  if (completionPercentage >= 100) return null;

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {completionPercentage < 30
            ? `Welcome${userName ? `, ${userName}` : ''}`
            : 'Complete your profile'}
        </h3>
        <span className="text-xs font-semibold text-[#0B2C6B]">{completionPercentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-slate-100 mb-4">
        <div
          className="h-full rounded-full bg-[#0B2C6B] transition-all duration-500"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* CV Upload - primary action */}
      {!hasCV && (
        <div className="mb-4">
          {uploading || parsing ? (
            <div className="rounded-lg border border-[#0B2C6B]/20 bg-[#0B2C6B]/[0.02] p-4 text-center">
              <svg className="mx-auto h-6 w-6 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-2 text-xs font-medium text-slate-700">
                {parsing ? 'AI is parsing your CV...' : 'Uploading...'}
              </p>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-[#0B2C6B]/30 bg-[#0B2C6B]/[0.02] p-4 text-center transition-all hover:border-[#0B2C6B] hover:bg-[#0B2C6B]/[0.05]"
            >
              <svg className="mx-auto h-8 w-8 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm font-semibold text-[#0B2C6B]">Upload CV</p>
              <p className="mt-1 text-[11px] text-slate-500">AI fills your profile automatically · ~30 sec</p>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => e.target.files?.[0] && handleCVUpload(e.target.files[0])}
            className="hidden"
          />
        </div>
      )}

      {/* Steps checklist */}
      <div className="space-y-1.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2.5">
            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
              step.done ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              {step.done ? (
                <svg className="h-3 w-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">
                  {steps.indexOf(step) + 1}
                </span>
              )}
            </div>
            <Link
              href={step.href}
              className={`flex-1 text-xs ${
                step.done
                  ? 'text-slate-400 line-through'
                  : step.priority
                  ? 'font-semibold text-[#0B2C6B] hover:underline'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {step.label}
            </Link>
            {!step.done && nextStep?.label === step.label && (
              <span className="rounded-full bg-[#0B2C6B]/10 px-2 py-0.5 text-[10px] font-medium text-[#0B2C6B]">
                Next
              </span>
            )}
          </div>
        ))}
      </div>

      {nextStep && (
        <Link
          href={nextStep.href}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0A255A] transition-colors"
        >
          {nextStep.label}
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}
