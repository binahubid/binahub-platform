'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar } from '../../../../components/ui';
import { useAuth } from '../../../../context/AuthContext';
import type { AssociateData } from '../types';

type ProfileViewProps = {
  data: AssociateData;
  completionPercentage: number;
  onEdit: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
};

export function ProfileView({ data, completionPercentage, onEdit, onSubmit, submitting }: ProfileViewProps) {
  const { accessToken } = useAuth();
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  const p = data.profile;
  const cvDoc = data.documents.find((d) => d.type === 'cv');
  const av = (Array.isArray(data.availability) ? data.availability[0] : data.availability) || { status: 'open' };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const getPhotoUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${apiUrl}/api/files/view-path?path=${encodeURIComponent(path)}`;
  };

  const resolveFileUrl = (url: string | null | undefined) => {
    if (!url) return '#';
    let targetUrl = url;
    if (!url.startsWith('http') && !url.startsWith('data:')) {
      targetUrl = `${apiUrl}${url}`;
    }
    if (targetUrl.startsWith(apiUrl)) {
      const separator = targetUrl.includes('?') ? '&' : '?';
      if (!targetUrl.includes('token=')) {
        targetUrl = `${targetUrl}${accessToken ? `${separator}token=${accessToken}` : ''}`;
      }
    }
    return targetUrl;
  };

  const extractAttachments = (description: string | null | undefined) => {
    if (!description) return { cleanDesc: '', files: [] as { name: string; url: string }[] };
    const files: { name: string; url: string }[] = [];
    const regex = /\[(?:File\s+)?Lampiran:\s*([^\]]+)\]\(([^)]+)\)/gi;
    let match;
    while ((match = regex.exec(description)) !== null) {
      files.push({ name: match[1], url: resolveFileUrl(match[2]) });
    }
    const cleanDesc = description.replace(regex, '').trim();
    return { cleanDesc, files };
  };

  return (
    <div className="space-y-8">
      {/* ─── Premium Header Hero Card ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#091F4D] via-[#0E2F6C] to-[#164596] p-8 shadow-xl border border-[#164596]/30 text-white">
        {/* Subtle dynamic background lines */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tNC04aDJ2MmgtMnptMCA0aDJ2MmgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30 mix-blend-overlay" />
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8 z-10">
          {/* Avatar Container */}
          <div className="relative flex-shrink-0 group">
            <div className="h-28 w-28 md:h-32 md:w-32 overflow-hidden rounded-full border-4 border-white/20 shadow-2xl bg-slate-900/40 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-white/40">
              {p?.photo_url ? (
                <img src={getPhotoUrl(p.photo_url)} alt="Profile Avatar" className="h-full w-full object-cover" />
              ) : (
                <Avatar name={p?.full_name || data.id} size="xl" className="h-full w-full bg-gradient-to-tr from-[#D9A441] to-[#E6B85C]" />
              )}
            </div>
            {/* Status indicator on avatar */}
            <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[#0E2F6C] bg-emerald-500 shadow-md" title="Aktif" />
          </div>

          {/* Main identity information */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Talent Associate
              </span>
              {av && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  av.status === 'open' 
                    ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300' 
                    : av.status === 'busy'
                    ? 'bg-amber-500/15 border border-amber-500/35 text-amber-300'
                    : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    av.status === 'open' ? 'bg-emerald-400 animate-pulse' : av.status === 'busy' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {av.status === 'open' ? 'Available' : av.status === 'busy' ? 'Limited / Busy' : 'Not Available'}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm flex flex-col sm:flex-row sm:items-center gap-2">
              {p?.full_name || 'Nama Belum Diisi'}
              {data.status === 'draft' && (
                <span className="inline-flex items-center rounded-full bg-amber-500/25 border border-amber-400/30 px-2.5 py-0.5 text-[9px] font-bold text-amber-300 uppercase tracking-wider w-fit">
                  Draft
                </span>
              )}
              {data.status === 'pending_review' && (
                <span className="inline-flex items-center rounded-full bg-blue-500/25 border border-blue-400/30 px-2.5 py-0.5 text-[9px] font-bold text-blue-300 uppercase tracking-wider w-fit animate-pulse">
                  Under Review
                </span>
              )}
              {data.status === 'active' && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/25 border border-emerald-400/30 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 uppercase tracking-wider w-fit">
                  Active
                </span>
              )}
              {data.status === 'suspended' && (
                <span className="inline-flex items-center rounded-full bg-rose-500/25 border border-rose-400/30 px-2.5 py-0.5 text-[9px] font-bold text-rose-300 uppercase tracking-wider w-fit">
                  Suspended
                </span>
              )}
            </h1>
            <p className="text-sm md:text-base text-blue-200/90 font-medium mt-1.5 leading-relaxed max-w-xl">
              {p?.headline || (p?.roles && p.roles.length > 0 ? p.roles.join(' & ') : 'Spesialis Transformasi & Pengembangan')}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mt-5 text-xs text-blue-100/70 border-t border-white/10 pt-4">
              {p?.city && (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {p.city}
                </span>
              )}
              {p?.phone && (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {p.phone}
                </span>
              )}
              {p?.nationality && (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a3 3 0 013 3V16.5m-3-12.135A9 9 0 1115.5 21" />
                  </svg>
                  {p.nationality}
                </span>
              )}
            </div>
          </div>

          {/* Progress Widget */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-white/5 border border-white/10 px-5 py-4 w-full md:w-auto text-center backdrop-blur-md">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16">
                <circle className="text-white/10" strokeWidth="4" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
                <circle className="text-amber-400" strokeWidth="4" strokeDasharray={176} strokeDashoffset={176 - (176 * completionPercentage) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
              </svg>
              <span className="absolute text-xs font-bold text-white">{completionPercentage}%</span>
            </div>
            <div className="text-[11px] font-bold text-blue-200 uppercase tracking-widest mt-2.5">Kelengkapan Profil</div>
          </div>
        </div>
      </div>

      {/* Submit for Review Action (only visible in Draft status) */}
      {data.status === 'draft' && (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 py-3.5 text-xs font-bold text-white hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          {submitting ? 'Mengirim Profil...' : 'Kirim Profil untuk Direview oleh Admin'}
        </button>
      )}

      {/* Quick Edit Action Button */}
      <button
        onClick={onEdit}
        className="w-full rounded-xl border-2 border-dashed border-[#0B2C6B]/20 bg-[#0B2C6B]/5 py-3.5 text-xs font-bold text-[#0B2C6B] hover:border-[#0B2C6B]/40 hover:bg-[#0B2C6B]/10 transition-all flex items-center justify-center gap-2 group shadow-sm shadow-[#0B2C6B]/5"
      >
        <svg className="h-4 w-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit & Perbarui Informasi Profil
      </button>

      {/* ─── Two-Column Layout for Professional Detail ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Summary & Sidebar Widgets (1 Column) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Availability Status */}
          {av && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ketersediaan & Kerja</h3>
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full animate-pulse ${
                  av.status === 'open' || av.status === 'available' ? 'bg-emerald-500' :
                  av.status === 'busy' || av.status === 'limited' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                <span className="text-sm font-bold text-slate-800">
                  {av.status === 'open' || av.status === 'available' ? 'Terbuka untuk Kolaborasi' :
                   av.status === 'busy' || av.status === 'limited' ? 'Terbatas / Sibuk' : 'Tidak Tersedia'}
                </span>
              </div>
              {av.work_locations && av.work_locations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-50">
                  {av.work_locations.map((loc: string) => (
                    <span key={loc} className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {loc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Curriculum Vitae Widget */}
          {cvDoc && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dokumen CV Terlampir</h3>
              <button
                type="button"
                onClick={() => {
                  setActivePreviewUrl(resolveFileUrl(`/api/files/${cvDoc.id}/view`));
                  setActivePreviewTitle(cvDoc.file_name || 'Curriculum Vitae');
                }}
                className="w-full flex items-center gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-xl hover:bg-slate-100 hover:border-slate-200 transition-colors group cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#0B2C6B]/25"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B2C6B]/10 text-[#0B2C6B] group-hover:bg-[#0B2C6B] group-hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#0B2C6B] transition-colors" title={cvDoc.file_name}>{cvDoc.file_name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Uploaded {new Date(cvDoc.created_at).toLocaleDateString('id-ID')}</p>
                </div>
              </button>
            </div>
          )}

          {/* Roles List */}
          {p?.roles && p.roles.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Peran Utama</h3>
              <div className="flex flex-wrap gap-1.5">
                {p.roles.map((role) => (
                  <span key={role} className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs font-semibold text-[#0B2C6B]">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expertises List */}
          {p?.expertises && p.expertises.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Bidang Keahlian</h3>
              <div className="flex flex-wrap gap-1.5">
                {p.expertises.map((exp) => (
                  <span key={exp} className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs font-semibold text-[#D9A441]">
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills List */}
          {data.skills.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Kompetensi & Keahlian</h3>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((skill) => (
                  <span key={skill.id} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {skill.skill_name}
                    {skill.proficiency && (
                      <span className="ml-1.5 text-[9px] font-medium text-slate-400 capitalize">
                        ({skill.proficiency})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages List */}
          {data.languages.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Penguasaan Bahasa</h3>
              <div className="flex flex-wrap gap-1.5">
                {data.languages.map((lang) => (
                  <span key={lang.id} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {lang.language}
                    <span className="ml-1.5 text-[9px] font-bold text-[#0B2C6B] uppercase tracking-wider">
                      ({lang.proficiency})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Bio & Interactive Timelines (2 Columns) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Bio Section */}
          {p?.bio && (
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-3 mb-4">
                Tentang Saya
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {p.bio}
              </p>
            </div>
          )}

          {/* Experiences Section */}
          {data.experiences.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-3 mb-6">
                Pengalaman Kerja
              </h3>
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                {data.experiences.map((exp) => (
                  <div key={exp.id} className="relative group">
                    {/* Timeline Node Bullet */}
                    <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-[#0B2C6B] shadow-sm transition-all duration-300 group-hover:scale-125" />
                    
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0B2C6B] transition-colors">
                          {exp.position}
                        </h4>
                        <span className="inline-block rounded bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 w-fit">
                          {exp.start_date} — {exp.is_current ? 'Sekarang' : exp.end_date || '-'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">{exp.organization}</p>
                      {exp.industry && (
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                          Industri: {exp.industry}
                        </p>
                      )}
                      {exp.description && (
                        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education Section */}
          {data.educations.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-3 mb-6">
                Riwayat Pendidikan
              </h3>
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                {data.educations.map((edu) => (
                  <div key={edu.id} className="relative group">
                    {/* Timeline Node Bullet */}
                    <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-amber-500 shadow-sm transition-all duration-300 group-hover:scale-125" />
                    
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-sm font-bold text-slate-900">
                          {edu.degree}
                        </h4>
                        <span className="inline-block rounded bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 w-fit">
                          {edu.start_year} — {edu.end_year || 'Sekarang'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">{edu.institution}</p>
                      {edu.field_of_study && (
                        <p className="text-xs text-slate-500 italic mt-0.5">
                          Bidang Studi: {edu.field_of_study}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications Section */}
          {data.certifications && data.certifications.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-3 mb-4">
                Sertifikasi Profesional
              </h3>
              <div className="space-y-4 pt-2">
                {data.certifications.map((cert) => (
                  <div key={cert.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 hover:shadow-sm transition-shadow">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900">{cert.name}</h4>
                      <p className="text-xs text-slate-600 font-medium">{cert.issuing_organization}</p>
                      {cert.credential_id && (
                        <p className="text-[10px] text-slate-400 mt-1">ID Kredensial: {cert.credential_id}</p>
                      )}
                      {cert.credential_url && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePreviewUrl(resolveFileUrl(cert.credential_url));
                              setActivePreviewTitle(cert.name);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-[#0B2C6B] hover:bg-slate-100 transition-colors"
                          >
                            <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate max-w-[150px] text-[10px]">Lihat Dokumen Sertifikat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolios Section */}
          {data.portfolios && data.portfolios.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-3 mb-4">
                Portofolio & Hasil Karya
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {data.portfolios.map((port) => {
                  const { cleanDesc, files } = extractAttachments(port.description);
                  return (
                    <div key={port.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 truncate" title={port.title}>{port.title}</h4>
                        {cleanDesc && (
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3 whitespace-pre-wrap">{cleanDesc}</p>
                        )}
                        
                        {/* Visual File Attachments Box */}
                        {files.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Berkas Lampiran</span>
                            <div className="grid grid-cols-2 gap-2">
                              {files.map((file, fIdx) => (
                                <button
                                  key={fIdx}
                                  type="button"
                                  onClick={() => {
                                    setActivePreviewUrl(file.url);
                                    setActivePreviewTitle(file.name);
                                  }}
                                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-slate-50 gap-2 text-center text-[#0B2C6B] hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0B2C6B]/25"
                                >
                                  <svg className="h-6 w-6 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="truncate max-w-[120px] text-[9px] font-semibold">{file.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {port.link_url && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <a
                            href={port.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B2C6B] hover:underline truncate max-w-full"
                          >
                            Buka Tautan Portofolio
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State Fallback */}
      {!p?.full_name && data.experiences.length === 0 && data.skills.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white shadow-sm">
          <svg className="mx-auto h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Profil Anda Masih Kosong</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Mulai isi profil Anda untuk mempermudah pendaftaran tugas dan proses penempatan.
          </p>
          <Link
            href="/dashboard/profile?edit=true"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25"
          >
            Mulai Isi Profil
          </Link>
        </div>
      )}

      {/* File Preview Modal */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl h-[85vh] rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{activePreviewTitle || 'Pratinjau Dokumen'}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Dokumen terverifikasi BinaHub</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={activePreviewUrl}
                  download
                  className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Unduh
                </a>
                <button
                  onClick={() => { setActivePreviewUrl(null); setActivePreviewTitle(''); }}
                  className="rounded-lg bg-[#0B2C6B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0A255A] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 bg-slate-800 flex items-center justify-center relative">
              <iframe
                src={activePreviewUrl}
                className="w-full h-full border-none bg-slate-800"
                title="File Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
