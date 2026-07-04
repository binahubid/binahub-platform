'use client';

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  status: 'verified' | 'pending' | 'missing';
};

const statusConfig = {
  verified: {
    label: 'Verified',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  missing: {
    label: 'Missing',
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-400',
  },
};

export function DocumentStatus({ documents }: { documents: DocumentItem[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Document Status</h3>
      <div className="mt-4 space-y-3">
        {documents.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-4">No documents uploaded yet.</p>
        ) : documents.map((doc) => {
          const config = statusConfig[doc.status];
          return (
            <div key={doc.id} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{doc.name}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.bg} ${config.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
