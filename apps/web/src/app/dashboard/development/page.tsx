'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type DevelopmentPlan = {
  current_score: number;
  target_score: number;
  recommended_actions: Action[];
  learning_paths: LearningPath[];
};

type Action = {
  id: string;
  type: 'course' | 'certification' | 'project' | 'skill';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed';
};

type LearningPath = {
  id: string;
  skill_name: string;
  current_level: number;
  target_level: number;
  steps: Step[];
};

type Step = {
  id: string;
  title: string;
  type: 'course' | 'article' | 'practice' | 'assessment';
  completed: boolean;
};

const actionTypeConfig = {
  course: { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'text-blue-500', bg: 'bg-blue-50' },
  certification: { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', color: 'text-amber-500', bg: 'bg-amber-50' },
  project: { icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  skill: { icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'text-purple-500', bg: 'bg-purple-50' },
};

export default function DevelopmentPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${apiUrl}/api/associate/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setPlan(d?.data?.development_plan || null);
      })
      .catch((e) => console.error('Failed to fetch development plan:', e))
      .finally(() => setLoading(false));
  }, [accessToken, apiUrl]);

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
        <h1 className="text-2xl font-semibold text-slate-900">Development Plan</h1>
        <p className="mt-1 text-sm text-slate-500">Your personalized growth roadmap</p>
      </div>

      {!plan ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <svg className="h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No Development Plan Yet</h2>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
              Complete assignments and assessments to get your personalized development plan.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Capability Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Current</span>
                  <span className="text-sm font-semibold text-slate-900">{plan.current_score}/100</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: `${plan.current_score}%` }} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Target</span>
                  <span className="text-sm font-semibold text-slate-900">{plan.target_score}/100</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#D9A441]" style={{ width: `${plan.target_score}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          {plan.recommended_actions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Recommended Actions</h2>
              <div className="space-y-3">
                {plan.recommended_actions.map((action) => {
                  const config = actionTypeConfig[action.type];
                  return (
                    <div key={action.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                        <svg className={`h-5 w-5 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{action.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            action.priority === 'high' ? 'bg-red-50 text-red-600' :
                            action.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {action.priority}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{action.description}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        action.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        action.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {action.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Learning Paths */}
          {plan.learning_paths.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Learning Paths</h2>
              <div className="space-y-4">
                {plan.learning_paths.map((path) => (
                  <div key={path.id} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">{path.skill_name}</h3>
                      <span className="text-xs text-slate-500">
                        Level {path.current_level} → {path.target_level}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {path.steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-3">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            step.completed ? 'bg-emerald-100' : 'bg-slate-100'
                          }`}>
                            {step.completed ? (
                              <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500">{step.id}</span>
                            )}
                          </div>
                          <span className={`text-xs ${step.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
