'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type Assessment = {
  id: string;
  skill_name: string;
  assessment_type: 'self' | 'peer' | 'ai' | 'certification';
  score: number;
  max_score: number;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  assessor?: string;
  feedback?: string;
};

const typeConfig = {
  self: { label: 'Self-Assessment', bg: 'bg-blue-50', color: 'text-blue-600', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  peer: { label: 'Peer Review', bg: 'bg-purple-50', color: 'text-purple-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ai: { label: 'AI Analysis', bg: 'bg-amber-50', color: 'text-amber-600', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  certification: { label: 'Certification', bg: 'bg-emerald-50', color: 'text-emerald-600', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
};

export default function AssessmentsPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${apiUrl}/api/associate/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setAssessments(d?.data?.assessments || []);
      })
      .catch((e) => console.error('Failed to fetch assessments:', e))
      .finally(() => setLoading(false));
  }, [accessToken, apiUrl]);

  const completed = assessments.filter((a) => a.status === 'completed');
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, a) => sum + (a.score / a.max_score) * 100, 0) / completed.length)
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Assessments</h1>
        <p className="mt-1 text-sm text-slate-500">Test your skills and earn certifications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Assessments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{assessments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{completed.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avg Score</p>
          <p className="mt-1 text-2xl font-bold text-[#0B2C6B]">{avgScore}%</p>
        </div>
      </div>

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <svg className="h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No Assessments Yet</h2>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
              Complete assignments and build your profile to unlock skill assessments.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((assessment) => {
            const config = typeConfig[assessment.assessment_type];
            const percentage = Math.round((assessment.score / assessment.max_score) * 100);
            return (
              <div
                key={assessment.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                    <svg className={`h-6 w-6 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{assessment.skill_name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Score</span>
                          <span className="text-xs font-semibold text-slate-900">{assessment.score}/{assessment.max_score}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#0B2C6B]"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{percentage}%</span>
                    </div>
                    {assessment.assessor && (
                      <p className="mt-2 text-xs text-slate-400">By {assessment.assessor}</p>
                    )}
                    {assessment.feedback && (
                      <p className="mt-2 text-xs text-slate-500 italic">&ldquo;{assessment.feedback}&rdquo;</p>
                    )}
                    {assessment.completed_at && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        Completed {new Date(assessment.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    assessment.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    assessment.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {assessment.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
