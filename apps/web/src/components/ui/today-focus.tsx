'use client';

type FocusItem = {
  id: string;
  type: 'assignment' | 'review' | 'document' | 'notification' | 'reminder' | 'approval' | 'revision';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
};

const typeConfig = {
  assignment: { color: 'bg-blue-500', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  review: { color: 'bg-amber-500', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  document: { color: 'bg-emerald-500', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  notification: { color: 'bg-purple-500', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  reminder: { color: 'bg-slate-500', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  approval: { color: 'bg-emerald-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  revision: { color: 'bg-red-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
};

export function TodayFocus({ items, userName }: { items: FocusItem[]; userName: string }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...items].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#0B2C6B] to-[#1e40af] p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {getGreeting()}, {userName.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-white/70">Here&apos;s what needs your attention today</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-white/10 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="mt-3 text-sm font-medium text-white">All caught up! No pending items.</p>
          <p className="mt-1 text-xs text-white/60">Great job staying on top of your work.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((item) => {
            const config = typeConfig[item.type];
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/15">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${config.color} text-white`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                    {item.priority === 'high' && (
                      <span className="rounded-full bg-red-400/20 px-2 py-0.5 text-[10px] font-medium text-red-300">Urgent</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-white/70 truncate">{item.description}</p>
                  {item.dueDate && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-white/50">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
