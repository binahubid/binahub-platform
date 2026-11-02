'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';
import { CVDocument, type CvData } from './cv-document';

export default function CvPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [data, setData] = useState<CvData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${apiUrl}/api/admin/associates/${id}/cv`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setData(d.data);
      })
      .catch((e) => console.error('Failed to fetch CV:', e))
      .finally(() => setLoading(false));
  }, [accessToken, apiUrl, id]);

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

  if (!data || !data.profile) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <p className="text-sm font-medium text-slate-900">Data CV tidak ditemukan</p>
        <Link href={`/admin/associates/${id}`} className="mt-4 text-sm text-[#0B2C6B] hover:underline">Kembali</Link>
      </div>
    );
  }

  const fullName = String(data.profile.full_name || data.associate.email);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/admin/associates" className="text-slate-500 hover:text-slate-700">Associates</Link>
          <span className="text-slate-300">/</span>
          <Link href={`/admin/associates/${id}`} className="text-slate-500 hover:text-slate-700">{fullName}</Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-900">CV</span>
        </nav>
        <button
          onClick={() => window.print()}
          title="Pilih kertas A4 dan nonaktifkan header/footer browser agar informasi halaman tidak tercetak ganda."
          className="flex items-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A255A] print:hidden"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Cetak / Simpan PDF
        </button>
      </div>

      <CVDocument data={data} accessToken={accessToken} apiUrl={apiUrl} />
    </div>
  );
}
