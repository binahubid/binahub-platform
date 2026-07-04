'use client';

type Assignment = {
  id: string;
  project_name: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  deadline: string;
  client?: string;
};

const statusConfig = {
  upcoming: { label: 'Upcoming', bg: 'bg-blue-50', text: 'text-blue-700' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700' },
  completed: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export function UpcomingAssignment({ assignments }: { assignments: Assignment[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Upcoming Assignments</h3>
      <div className="mt-4 space-y-3">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <svg className="h-10 w-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-xs text-slate-400">No upcoming assignments</p>
          </div>
        ) : assignments.map((a) => {
          const config = statusConfig[a.status];
          return (
            <div key={a.id} className="rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{a.project_name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
              </div>
              {a.client && <p className="mt-1 text-xs text-slate-500">{a.client}</p>}
              <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(a.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
