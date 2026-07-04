'use client';

import Link from 'next/link';

type Assignment = {
  id: string;
  project_name: string;
  role: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  deadline: string;
  reviewer?: string;
  progress?: number;
};

const statusConfig = {
  upcoming: { label: 'Upcoming', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  completed: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
};

export function MyWork({ assignments }: { assignments: Assignment[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">My Work</h2>
        <Link href="/dashboard/assignments" className="text-xs font-medium text-[#0B2C6B] hover:underline">
          View all
        </Link>
      </div>
      <div className="p-5">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="h-12 w-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-slate-500">No active assignments</p>
            <p className="text-xs text-slate-400">New assignments will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              const config = statusConfig[a.status];
              return (
                <div key={a.id} className="rounded-lg border border-slate-100 p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{a.project_name}</p>
                      <p className="text-xs text-slate-500">{a.role}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.bg} ${config.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                      {config.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      {a.reviewer && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {a.reviewer}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(a.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {a.progress !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: `${a.progress}%` }} />
                        </div>
                        <span className="font-medium text-slate-600">{a.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
