'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type ReportSummary = {
  total_associates: number;
  active_associates: number;
  pending_associates: number;
  incomplete_profiles: number;
  total_documents: number;
  total_assignments: number;
  active_assignments: number;
  total_reviews: number;
  total_skills: number;
  top_skills: { name: string; count: number }[];
  top_cities: { name: string; count: number }[];
  unknown_city_count: number;
};

export default function AdminReportsPage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!user || !accessToken) return;
    fetch(`${apiUrl}/api/admin/reports/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat laporan'); setLoading(false); });
  }, [user, accessToken, apiUrl, toast]);

  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `binahub-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Laporan diekspor sebagai JSON');
  };

  const handleExportCSV = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push('Kategori,Nilai,Keterangan');;
    lines.push(`Total Associate,${data.total_associates},${data.active_associates} aktif`);
    lines.push(`Pending Review,${data.pending_associates},menunggu review`);
    lines.push(`Profile Belum Lengkap,${data.incomplete_profiles},perlu diperbaiki`);
    lines.push(`Total Dokumen,${data.total_documents},CV & sertifikat`);
    lines.push(`Total Assignment,${data.total_assignments},${data.active_assignments} aktif`);
    lines.push(`Total Review,${data.total_reviews},semua review`);
    lines.push(`Total Skill,${data.total_skills},unique skills`);
    lines.push('');
    lines.push('Top Skills');
    lines.push('Skill,Jumlah');
    data.top_skills.forEach((s) => lines.push(`${s.name},${s.count}`));
    lines.push('');
    lines.push('Top Kota');
    lines.push('Kota,Jumlah');
    data.top_cities.forEach((c) => lines.push(`${c.name},${c.count}`));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `binahub-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Laporan diekspor sebagai CSV');
  };

  const maxSkill = data ? Math.max(...data.top_skills.map((s) => s.count), 1) : 1;
  const maxCity = data ? Math.max(...data.top_cities.map((c) => c.count), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Statistik dan laporan operasional BinaHub.</p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : !data ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <p className="text-sm text-slate-500">Gagal memuat data</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportCard label="Total Associate" value={data.total_associates} sub={`${data.active_associates} aktif`} color="bg-[#0B2C6B]/10 text-[#0B2C6B]" />
            <ReportCard label="Pending Review" value={data.pending_associates} sub="Menunggu review" color="bg-amber-100 text-amber-700" />
            <ReportCard label="Profile Belum Lengkap" value={data.incomplete_profiles} sub="Perlu diperbaiki" color="bg-red-50 text-red-600" />
            <ReportCard label="Total Dokumen" value={data.total_documents} sub="CV & sertifikat" color="bg-blue-50 text-blue-700" />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <ReportCard label="Total Assignment" value={data.total_assignments} sub={`${data.active_assignments} aktif`} color="bg-purple-50 text-purple-700" />
            <ReportCard label="Total Review" value={data.total_reviews} sub="Semua review" color="bg-emerald-50 text-emerald-700" />
            <ReportCard label="Total Skill" value={data.total_skills} sub="Unique skills" color="bg-slate-100 text-slate-700" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Skills */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Top Skills</h2>
              {data.top_skills.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Belum ada data skill</p>
              ) : (
                <div className="space-y-3">
                  {data.top_skills.map((s) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="w-32 text-xs font-medium text-slate-700 truncate">{s.name}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0B2C6B] rounded-full" style={{ width: `${(s.count / maxSkill) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 w-8 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Cities */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Top Lokasi</h2>
                {data.unknown_city_count > 0 && (
                  <span className="text-[11px] text-slate-500">{data.unknown_city_count} belum diisi</span>
                )}
              </div>
              {data.top_cities.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Belum ada data lokasi</p>
              ) : (
                <div className="space-y-3">
                  {data.top_cities.map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="w-32 text-xs font-medium text-slate-700 truncate">{c.name}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(c.count / maxCity) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 w-8 text-right">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReportCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${color}`}>
        {value}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
