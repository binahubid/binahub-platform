'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';

type CvData = {
  associate: { id: string; email: string; status: string; created_at: string };
  profile: Record<string, unknown> | null;
  experiences: Record<string, unknown>[];
  educations: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  portfolios: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  languages: Record<string, unknown>[];
  availability: Record<string, unknown>[];
  social_links: Record<string, unknown>[];
};

export default function CvPage() {
  const { id } = useParams();
  const router = useRouter();
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

  const p = data.profile as Record<string, string | null>;
  const fullName = p.full_name || data.associate.email;
  const roles = (p.roles as unknown as string[]) || [];
  const expertises = (p.expertises as unknown as string[]) || [];
  const city = p.city || '';
  const bio = p.bio || '';
  const phone = p.phone || '';
  const photoUrl = p.photo_url || '';

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
          className="flex items-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A255A] print:hidden"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Cetak / Simpan PDF
        </button>
      </div>

      <div className="mx-auto max-w-[800px] rounded-xl border border-slate-200 bg-white shadow-sm print:shadow-none print:border-none">
        <div className="p-8 print:p-6">
          <div className="flex items-start gap-6 border-b-2 border-[#0B2C6B] pb-6">
            {photoUrl ? (
              <img src={photoUrl} alt={fullName} className="h-24 w-24 rounded-full object-cover flex-shrink-0 print:h-20 print:w-20" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-[#0B2C6B] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 print:h-20 print:w-20">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#0B2C6B] print:text-xl">{fullName}</h1>
              {roles.length > 0 && <p className="mt-1 text-base text-slate-700 print:text-sm">{roles.join(' & ')}</p>}
              {expertises.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {expertises.map((exp) => (
                    <span key={exp} className="rounded-full bg-[#0B2C6B]/10 px-2.5 py-0.5 text-xs font-medium text-[#0B2C6B]">{exp}</span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 print:text-xs">
                {city && <span>{city}</span>}
                {phone && <span>{phone}</span>}
                <span>{data.associate.email}</span>
                {(data.social_links as Array<Record<string, string>>).map((s, i) => (
                  s.url && <span key={i}>{s.platform}: {s.url}</span>
                ))}
              </div>
            </div>
          </div>

          {bio && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-2 print:text-xs">Profil</h2>
              <p className="text-sm text-slate-600 print:text-xs">{bio}</p>
            </div>
          )}

          {(data.experiences as Array<Record<string, string | number | null>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Pengalaman Kerja</h2>
              {(data.experiences as Array<Record<string, string | number | null>>).map((exp, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 print:text-xs">{exp.organization || exp.company}</p>
                      <p className="text-sm text-slate-600 print:text-xs">{exp.position || exp.role}</p>
                    </div>
                    <p className="text-xs text-slate-500 print:text-[10px] flex-shrink-0">
                      {exp.start_year}{exp.end_year ? ` – ${exp.end_year}` : ' – Saat ini'}
                    </p>
                  </div>
                  {exp.description && <p className="mt-1 text-xs text-slate-500 print:text-[10px]">{exp.description}</p>}
                </div>
              ))}
            </div>
          )}

          {(data.educations as Array<Record<string, string | number | null>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Pendidikan</h2>
              {(data.educations as Array<Record<string, string | number | null>>).map((edu, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 print:text-xs">{edu.institution}</p>
                      <p className="text-sm text-slate-600 print:text-xs">{edu.degree} — {edu.field_of_study || edu.field}</p>
                    </div>
                    <p className="text-xs text-slate-500 print:text-[10px] flex-shrink-0">
                      {edu.start_year}{edu.end_year ? ` – ${edu.end_year}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(data.skills as Array<Record<string, string | number | null>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Keahlian</h2>
              <div className="flex flex-wrap gap-2">
                {(data.skills as Array<Record<string, string | number | null>>).map((s, i) => (
                  <span key={i} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 print:bg-transparent print:px-1 print:text-[10px]">
                    {s.skill_name}
                    {s.proficiency && <span className="text-slate-400 ml-1">({s.proficiency})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(data.certifications as Array<Record<string, string>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Sertifikasi</h2>
              {(data.certifications as Array<Record<string, string>>).map((cert, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <p className="text-sm font-semibold text-slate-900 print:text-xs">{cert.name}</p>
                  <p className="text-xs text-slate-500 print:text-[10px]">{cert.issuing_organization || cert.issuer} — {cert.issued_date}</p>
                </div>
              ))}
            </div>
          )}

          {(data.languages as Array<Record<string, string>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Bahasa</h2>
              <div className="flex flex-wrap gap-2">
                {(data.languages as Array<Record<string, string>>).map((l, i) => (
                  <span key={i} className="text-sm text-slate-700 print:text-xs">
                    {l.language_name} <span className="text-slate-400">({l.proficiency})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {(data.availability as Array<Record<string, string>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Ketersediaan</h2>
              {(data.availability as Array<Record<string, string>>).map((a, i) => (
                <div key={i} className="mb-1">
                  <p className="text-sm text-slate-700 print:text-xs">{a.status} — {a.preferred_engagements || a.preferredEngagements} — Max {a.max_hours_per_week || a.maxHoursPerWeek} jam/minggu</p>
                </div>
              ))}
            </div>
          )}

          {(data.portfolios as Array<Record<string, string>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Portfolio</h2>
              {(data.portfolios as Array<Record<string, string>>).map((port, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p className="text-sm font-semibold text-slate-900 print:text-xs">{port.title}</p>
                  {port.description && <p className="text-xs text-slate-500 print:text-[10px]">{port.description}</p>}
                  {port.url && <a href={port.url} className="text-xs text-[#0B2C6B] print:text-[10px]">{port.url}</a>}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 print:text-[9px]">
            <p>CV Standar BinaHub — Dicetak pada {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
