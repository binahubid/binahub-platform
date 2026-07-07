'use client';

import Link from 'next/link';
import { Avatar } from '../../../../components/ui';
import type { AssociateData } from '../types';

type ProfileViewProps = {
  data: AssociateData;
  completionPercentage: number;
  onEdit: () => void;
};

export function ProfileView({ data, completionPercentage, onEdit }: ProfileViewProps) {
  const p = data.profile;
  const cvDoc = data.documents.find((d) => d.type === 'cv');

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2C6B] via-[#1440a0] to-[#1e3a8a] p-6 sm:p-8 shadow-lg text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tNC04aDJ2MmgtMnptMCA0aDJ2MmgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar src={p?.photo_url} name={p?.full_name || data.id} size="lg" className="h-24 w-24 ring-4 ring-white/20" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{p?.full_name || 'Nama Belum Diisi'}</h1>
            <p className="text-sm text-white/70 mt-1">{p?.headline || p?.roles?.join(' & ') || 'Headline belum diisi'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-white/50">
              {p?.city && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {p.city}
                </span>
              )}
              {p?.phone && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {p.phone}
                </span>
              )}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {data.status}
              </span>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-3xl font-bold">{completionPercentage}%</div>
            <div className="text-xs text-white/50">Profil Lengkap</div>
          </div>
        </div>
      </div>

      {/* Edit Button */}
      <button
        onClick={onEdit}
        className="w-full rounded-xl border-2 border-dashed border-[#0B2C6B]/30 bg-[#0B2C6B]/5 py-3 text-sm font-semibold text-[#0B2C6B] hover:border-[#0B2C6B]/50 hover:bg-[#0B2C6B]/10 transition-all flex items-center justify-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Profil
      </button>

      {/* CV Card */}
      {cvDoc && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B2C6B]/10">
              <svg className="h-5 w-5 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Curriculum Vitae</h3>
              <p className="text-xs text-slate-500">{cvDoc.file_name} — {new Date(cvDoc.created_at).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bio */}
      {p?.bio && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Tentang Saya
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{p.bio}</p>
        </div>
      )}

      {/* Roles */}
      {p?.roles && p.roles.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Peran / Role
          </h3>
          <div className="flex flex-wrap gap-2">
            {p.roles.map((role) => (
              <span key={role} className="rounded-lg bg-[#0B2C6B]/10 px-3 py-1.5 text-xs font-medium text-[#0B2C6B]">
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expertises */}
      {p?.expertises && p.expertises.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Bidang Keahlian
          </h3>
          <div className="flex flex-wrap gap-2">
            {p.expertises.map((exp) => (
              <span key={exp} className="rounded-lg bg-[#D9A441]/10 px-3 py-1.5 text-xs font-medium text-[#D9A441]">
                {exp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experiences.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Pengalaman Kerja
          </h3>
          <div className="space-y-4">
            {data.experiences.map((exp) => (
              <div key={exp.id} className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
                  <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{exp.position}</p>
                  <p className="text-xs text-slate-600">{exp.organization}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {exp.start_date} — {exp.is_current ? 'Sekarang' : exp.end_date || '-'}
                    {exp.industry && ` • ${exp.industry}`}
                  </p>
                  {exp.description && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">{exp.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Keahlian
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <span key={skill.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                {skill.skill_name}
                {skill.proficiency && <span className="ml-1 text-slate-400">({skill.proficiency})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {data.languages.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Bahasa
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.languages.map((lang) => (
              <span key={lang.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                {lang.language}
                <span className="ml-1 text-slate-400">({lang.proficiency})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.educations.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
            Pendidikan
          </h3>
          <div className="space-y-3">
            {data.educations.map((edu) => (
              <div key={edu.id} className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
                  <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{edu.degree}</p>
                  <p className="text-xs text-slate-600">{edu.institution}</p>
                  {edu.field_of_study && <p className="text-xs text-slate-500">{edu.field_of_study}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {edu.start_year} — {edu.end_year || 'Sekarang'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      {data.availability && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ketersediaan
          </h3>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${
              data.availability.status === 'open' ? 'bg-emerald-500' :
              data.availability.status === 'busy' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium text-slate-700">
              {data.availability.status === 'open' ? 'Open for Opportunities' :
               data.availability.status === 'busy' ? 'Busy / Limited' : 'Not Available'}
            </span>
          </div>
          {data.availability.work_locations && data.availability.work_locations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.availability.work_locations.map((loc) => (
                <span key={loc} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{loc}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!p?.full_name && data.experiences.length === 0 && data.skills.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Profil Anda Masih Kosong</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Mulai dengan upload CV Anda. AI akan mengisi profil Anda secara otomatis.
          </p>
          <Link
            href="/dashboard/profile?edit=true"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Mulai Isi Profil
          </Link>
        </div>
      )}
    </div>
  );
}
