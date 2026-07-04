'use client';

type EvidenceItem = {
  id: string;
  type: 'certificate' | 'portfolio' | 'deliverable' | 'report';
  name: string;
  status: 'uploaded' | 'pending' | 'verified';
  date?: string;
};

const typeConfig = {
  certificate: { label: 'Certificate', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', color: 'text-amber-500', bg: 'bg-amber-50' },
  portfolio: { label: 'Portfolio', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'text-blue-500', bg: 'bg-blue-50' },
  deliverable: { label: 'Deliverable', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  report: { label: 'Report', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-purple-500', bg: 'bg-purple-50' },
};

const statusConfig = {
  uploaded: { label: 'Uploaded', bg: 'bg-blue-50', text: 'text-blue-700' },
  pending: { label: 'Pending Review', bg: 'bg-amber-50', text: 'text-amber-700' },
  verified: { label: 'Verified', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export function EvidenceUpload({ items }: { items: EvidenceItem[] }) {
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, EvidenceItem[]>);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Evidence & Deliverables</h2>
      <div className="mt-4 space-y-4">
        {Object.entries(typeConfig).map(([type, config]) => {
          const typeItems = grouped[type] || [];
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded ${config.bg}`}>
                  <svg className={`h-3.5 w-3.5 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700">{config.label}</span>
                <span className="text-[11px] text-slate-400">({typeItems.length})</span>
              </div>
              {typeItems.length === 0 ? (
                <div className="ml-8 rounded-lg border border-dashed border-slate-200 p-3 text-center">
                  <p className="text-xs text-slate-400">No {config.label.toLowerCase()} uploaded</p>
                </div>
              ) : (
                <div className="ml-8 space-y-2">
                  {typeItems.map((item) => {
                    const sConfig = statusConfig[item.status];
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5">
                        <span className="text-xs font-medium text-slate-700">{item.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sConfig.bg} ${sConfig.text}`}>
                          {sConfig.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
