'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';
import { CapabilityRadar } from '../../../components/ui/capability-radar';

type Skill = {
  id: string;
  skill_name: string;
  category: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number;
};

type Review = {
  id: string;
  rating: number;
  capability_updates?: { skill_name: string; old_score: number; new_score: number }[];
};

type CapabilityScore = {
  label: string;
  score: number;
  confidence: number;
  evidence: string;
};

const categoryIcons: Record<string, string> = {
  technical: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  soft: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  leadership: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  domain: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
};

const proficiencyConfig = {
  beginner: { label: 'Beginner', color: 'text-slate-500', bg: 'bg-slate-100', width: '25%' },
  intermediate: { label: 'Intermediate', color: 'text-blue-600', bg: 'bg-blue-50', width: '50%' },
  advanced: { label: 'Advanced', color: 'text-amber-600', bg: 'bg-amber-50', width: '75%' },
  expert: { label: 'Expert', color: 'text-emerald-600', bg: 'bg-emerald-50', width: '100%' },
};

export default function CapabilityPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${apiUrl}/api/associate/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setSkills(d?.data?.skills || []);
        setReviews(d?.data?.reviews || []);
      })
      .catch((e) => console.error('Failed to fetch capability data:', e))
      .finally(() => setLoading(false));
  }, [accessToken, apiUrl]);

  const capabilityData: CapabilityScore[] = skills.map((s) => {
    const levelMap = { beginner: 25, intermediate: 50, advanced: 75, expert: 95 };
    const score = levelMap[s.proficiency as keyof typeof levelMap] || 25;
    const confidence = Math.min(100, 30 + (s.years_experience || 0) * 10);
    return {
      label: s.skill_name.length > 12 ? s.skill_name.slice(0, 12) + '…' : s.skill_name,
      score,
      confidence,
      evidence: `${s.years_experience || 0} years experience`,
    };
  });

  const groupedSkills = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    const cat = s.category || 'other';
    (acc[cat] = acc[cat] || []).push(s);
    return acc;
  }, {});

  const totalCapabilityUpdates = reviews.reduce((sum, r) => sum + (r.capability_updates?.length || 0), 0);

  const stats = {
    totalSkills: skills.length,
    avgProficiency: skills.length > 0
      ? Math.round(skills.reduce((sum, s) => sum + (['beginner', 'intermediate', 'advanced', 'expert'].indexOf(s.proficiency) + 1), 0) / skills.length * 25)
      : 0,
    totalUpdates: totalCapabilityUpdates,
    categories: Object.keys(groupedSkills).length,
  };

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
        <h1 className="text-2xl font-semibold text-slate-900">Capability Assessment</h1>
        <p className="mt-1 text-sm text-slate-500">Your professional capability scores and development areas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Skills</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalSkills}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avg Proficiency</p>
          <p className="mt-1 text-2xl font-bold text-[#0B2C6B]">{stats.avgProficiency}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Skill Updates</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.totalUpdates}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Categories</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.categories}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Radar Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Capability Radar</h2>
            {capabilityData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="mt-3 text-sm text-slate-400">Add skills to see your capability radar</p>
              </div>
            ) : (
              <CapabilityRadar data={capabilityData} size={320} />
            )}
          </div>

          {/* Skills by Category */}
          {Object.keys(groupedSkills).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <div key={category} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="h-5 w-5 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryIcons[category] || categoryIcons.technical} />
                    </svg>
                    <h3 className="text-sm font-semibold text-slate-900 capitalize">{category}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {categorySkills.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {categorySkills.map((skill) => {
                      const profConfig = proficiencyConfig[skill.proficiency];
                      return (
                        <div key={skill.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-700">{skill.skill_name}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${profConfig.bg} ${profConfig.color}`}>
                                {profConfig.label}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: profConfig.width }} />
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              <span>{skill.years_experience || 0} years experience</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
              <svg className="h-12 w-12 text-slate-200 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No Skills Added</h3>
              <p className="mt-1 text-xs text-slate-500">Add skills in your profile to see capability scores here</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Score List */}
          {capabilityData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                {capabilityData.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-medium text-slate-600 truncate">{item.label}</span>
                    <div className="flex-1">
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-slate-900">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#D9A441]/10">
                <svg className="h-3.5 w-3.5 text-[#D9A441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">AI Recommendations</h3>
            </div>
            {skills.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Complete your profile to get AI recommendations</p>
            ) : (
              <div className="space-y-3">
                {skills
                  .filter((s) => s.proficiency === 'beginner' || s.proficiency === 'intermediate')
                  .slice(0, 3)
                  .map((skill) => (
                    <div key={skill.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <p className="text-xs font-medium text-slate-700">{skill.skill_name}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Consider taking advanced courses to improve from {skill.proficiency} to advanced level.
                      </p>
                    </div>
                  ))}
                {skills.filter((s) => s.proficiency === 'beginner' || s.proficiency === 'intermediate').length === 0 && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-xs font-medium text-emerald-700">All skills are at advanced or expert level</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/dashboard/profile?tab=skills" className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                <svg className="h-5 w-5 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Add New Skill</span>
              </a>
              <a href="/dashboard/reviews" className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                <svg className="h-5 w-5 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">View Reviews</span>
              </a>
              <a href="/dashboard/development" className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                <svg className="h-5 w-5 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Development Plan</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
