'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { StatCard } from '../../../components/ui';
import { SimpleLineChart, SimpleBarChart, DonutChart } from '../../../components/ui/charts';

type GrowthData = {
  label: string;
  value: number;
};

type CapabilityData = {
  label: string;
  value: number;
};

type ReportsData = {
  top_skills: Array<{ name: string; count: number }>;
  top_cities: Array<{ name: string; count: number }>;
};

type GrowthEndpointData = {
  growth: GrowthData[];
  assignment_status: Record<string, number>;
};

export default function AnalyticsPage() {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending_review: 0,
    active: 0,
    draft: 0,
  });
  const [capabilities, setCapabilities] = useState<CapabilityData[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [growthData, setGrowthData] = useState<GrowthEndpointData | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        
        try {
          const [statsRes, capsRes, reportsRes, growthRes] = await Promise.all([
            fetch(`${apiUrl}/api/admin/stats`, { headers }),
            fetch(`${apiUrl}/api/admin/capabilities`, { headers }),
            fetch(`${apiUrl}/api/admin/reports/summary`, { headers }),
            fetch(`${apiUrl}/api/admin/growth`, { headers }),
          ]);

          const [statsJson, capsJson, reportsJson, growthJson] = await Promise.all([
            statsRes.json(),
            capsRes.json(),
            reportsRes.json(),
            growthRes.json(),
          ]);

          if (statsJson.success) setStats(statsJson.data);
          if (capsJson.success) setCapabilities(capsJson.data);
          if (reportsJson.success) setReports(reportsJson.data);
          if (growthJson.success) setGrowthData(growthJson.data);
        } catch (error) {
          console.error('Failed to fetch analytics data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [user, accessToken, apiUrl]);

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

  // Prepare donut chart data for capabilities (top 6)
  const donutData = capabilities.slice(0, 6).map((c, i) => ({
    label: c.label,
    value: c.value,
    color: ['#0B2C6B', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a'][i % 6],
  }));

  // Prepare bar chart data for top skills
  const skillsBarData = reports?.top_skills?.map(s => s.count) || [];
  const skillsLabels = reports?.top_skills?.map(s => s.name) || [];

  // Prepare bar chart data for top cities
  const citiesBarData = reports?.top_cities?.map(c => c.count) || [];
  const citiesLabels = reports?.top_cities?.map(c => c.name) || [];

  // Prepare line chart data for growth
  const growthValues = growthData?.growth?.map(g => g.value) || [];
  const growthLabels = growthData?.growth?.map(g => g.label) || [];

  // Assignment status data
  const assignmentStatus = growthData?.assignment_status || { draft: 0, active: 0, completed: 0, cancelled: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Capability Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of key metrics and performance.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Associates"
          value={stats.total.toLocaleString()}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active"
          value={stats.active.toLocaleString()}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Under Review"
          value={stats.pending_review.toLocaleString()}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Draft"
          value={stats.draft.toLocaleString()}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Associate Growth (6 Bulan)</h2>
          <div className="mt-4">
            <SimpleBarChart data={growthValues} labels={growthLabels} color="#0B2C6B" height={220} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Distribusi Keahlian (Top 6)</h2>
          <div className="mt-4 flex items-center justify-center">
            <DonutChart data={donutData} size={160} strokeWidth={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Top 5 Keahlian</h2>
          <div className="mt-4">
            <SimpleBarChart data={skillsBarData} labels={skillsLabels} color="#2563eb" height={220} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Top 5 Kota</h2>
          <div className="mt-4">
            <SimpleBarChart data={citiesBarData} labels={citiesLabels} color="#7c3aed" height={220} />
          </div>
        </div>
      </div>

      {/* Assignment Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Status Assignment</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Draft</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{assignmentStatus.draft}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-medium text-blue-600">Active</p>
            <p className="mt-2 text-2xl font-bold text-blue-900">{assignmentStatus.active}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-600">Completed</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{assignmentStatus.completed}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-medium text-red-600">Cancelled</p>
            <p className="mt-2 text-2xl font-bold text-red-900">{assignmentStatus.cancelled}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
