'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type Activity = {
  icon: string;
  iconBg: string;
  iconColor: string;
  text: string;
  time: string;
  id: string;
};

export default function AdminActivityPage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchActivities = useCallback(async () => {
    if (!user || !accessToken) return;
    setLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/activities?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await resp.json();
      if (d?.success) {
        setActivities(d.data || []);
      } else {
        toast('error', d?.error || 'Gagal memuat aktivitas');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken, apiUrl, toast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Activity Log</h1>
          <p className="mt-1 text-sm text-slate-500">Riwayat aktivitas seluruh pengguna sistem.</p>
        </div>
        <button
          onClick={fetchActivities}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center">
            <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-sm text-slate-500">Belum ada aktivitas</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${act.iconBg}`}>
                  <ActivityIcon type={act.icon} className={`h-4 w-4 ${act.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{act.text}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">{act.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, string> = {
    upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    check: 'M5 13l4 4L19 7',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    activity: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    x: 'M6 18L18 6M6 6l12 12',
    briefcase: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type] || icons.activity} />
    </svg>
  );
}
