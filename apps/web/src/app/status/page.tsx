'use client';

import { useState, useEffect } from 'react';
import { usePageVisibility } from '../../hooks/use-page-visibility';

interface HealthCheck {
  name: string;
  url: string;
  status: 'ok' | 'error' | 'loading';
  latency: number | null;
  message?: string;
}

interface HealthCheckDefinition {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const EXPECTED_API_VERSION = '0.8.4';

const checks: HealthCheckDefinition[] = [
  { name: 'API Health', url: `${API_URL}/api/health` },
  {
    name: 'Supabase Auth',
    url: `${SUPABASE_URL}/auth/v1/health`,
    headers: SUPABASE_ANON_KEY
      ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      : undefined,
  },
];

export default function StatusPage() {
  const [results, setResults] = useState<HealthCheck[]>(
    checks.map(({ name, url }) => ({ name, url, status: 'loading', latency: null }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function runChecks() {
    setResults((prev) => prev.map((r) => ({ ...r, status: 'loading', latency: null })));

    const updated = await Promise.all(
      checks.map(async (check) => {
        const start = performance.now();
        const resultBase = { name: check.name, url: check.url };
        try {
          if (check.name === 'Supabase Auth' && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
            return {
              ...resultBase,
              status: 'error' as const,
              latency: null,
              message: 'Konfigurasi Supabase belum tersedia',
            };
          }

          const res = await fetch(check.url, {
            method: 'GET',
            headers: check.headers,
            signal: AbortSignal.timeout(10000),
          });
          const latency = Math.round(performance.now() - start);
          if (res.ok && check.name === 'API Health') {
            const body = await res.json().catch(() => null);
            if (body?.status === 'ok' && body?.version === EXPECTED_API_VERSION) {
              return { ...resultBase, status: 'ok' as const, latency, message: `Versi ${body.version}` };
            }
            return {
              ...resultBase,
              status: 'error' as const,
              latency,
              message: `Respons health tidak sesuai (diharapkan ${EXPECTED_API_VERSION})`,
            };
          }
          if (res.ok) {
            return { ...resultBase, status: 'ok' as const, latency };
          }
          return { ...resultBase, status: 'error' as const, latency, message: `HTTP ${res.status}` };
        } catch {
          const latency = Math.round(performance.now() - start);
          return { ...resultBase, status: 'error' as const, latency, message: 'Tidak dapat dijangkau' };
        }
      })
    );

    setResults(updated);
    setLastChecked(new Date());
  }

  const { isVisible, justBecameVisible } = usePageVisibility();

  useEffect(() => {
    runChecks();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        runChecks();
      }
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isVisible && justBecameVisible > 0) {
      runChecks();
    }
  }, [isVisible, justBecameVisible]);

  const allOk = results.every((r) => r.status === 'ok');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-900">System Status</h1>
          <p className="mt-2 text-sm text-slate-500">BinaApps AMS — Status Layanan</p>
        </div>

        <div className={`rounded-xl border p-6 mb-8 text-center ${
          allOk
            ? 'border-emerald-200 bg-emerald-50'
            : results.some((r) => r.status === 'error')
            ? 'border-red-200 bg-red-50'
            : 'border-slate-200 bg-white'
        }`}>
          {allOk ? (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="font-semibold text-emerald-800">Semua Sistem Beroperasi Normal</p>
            </>
          ) : results.some((r) => r.status === 'error') ? (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="font-semibold text-red-800">Ada Gangguan pada Sistem</p>
            </>
          ) : (
            <p className="text-slate-500">Memeriksa status...</p>
          )}
        </div>

        <div className="space-y-3">
          {results.map((check) => (
            <div key={check.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  check.status === 'ok' ? 'bg-emerald-500' : check.status === 'error' ? 'bg-red-500' : 'bg-slate-300 animate-pulse'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{check.name}</p>
                  {check.message && (
                    <p className={`text-xs ${check.status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {check.message}
                    </p>
                  )}
                  <p className="mt-0.5 max-w-sm break-all text-[10px] text-slate-400">{check.url}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium ${
                  check.status === 'ok' ? 'text-emerald-600' : check.status === 'error' ? 'text-red-600' : 'text-slate-400'
                }`}>
                  {check.status === 'ok' ? 'Operasional' : check.status === 'error' ? 'Gagal' : 'Memeriksa...'}
                </span>
                {check.latency !== null && (
                  <p className="text-xs text-slate-400 mt-0.5">{check.latency}ms</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          {lastChecked && (
            <p className="text-xs text-slate-400">
              Terakhir diperiksa: {lastChecked.toLocaleTimeString('id-ID')} WIB
            </p>
          )}
          <button
            onClick={runChecks}
            className="mt-3 text-sm text-[#0B2C6B] hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
