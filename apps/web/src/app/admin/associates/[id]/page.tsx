'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabase-client';
import { Avatar, StatusBadge, Tabs, useToast } from '../../../../components/ui';

type DetailData = {
  id: string;
  email: string;
  status: string;
  completeness: number;
  submitted_at: string | null;
  created_at: string;
  profile: {
    full_name: string;
    headline?: string;
    bio?: string;
    phone?: string;
    nationality?: string;
    photo_url?: string;
    city?: string;
    roles?: string[];
    expertises?: string[];
  } | null;
  experiences: Array<{
    id: string;
    organization: string;
    position: string;
    start_date: string;
    end_date?: string;
    description?: string;
  }>;
  educations: Array<{
    id: string;
    institution: string;
    degree: string;
    field_of_study?: string;
    start_year?: number;
    end_year?: number;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    issue_date?: string;
    credential_url?: string;
  }>;
  skills: Array<{
    id: string;
    skill_name: string;
    proficiency?: string;
  }>;
  languages: Array<{
    id: string;
    language: string;
    proficiency: string;
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url?: string;
    created_at: string;
  }>;
  portfolios?: Array<{
    id: string;
    title: string;
    description?: string;
    link_url?: string;
  }>;
  reviews?: Array<{
    id: string;
    reviewer_id: string;
    status: string;
    notes?: string;
    decision_at?: string;
    created_at: string;
  }> | null;
};

export default function AssociateDetailPage() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const resolveFileUrl = (url: string | null | undefined) => {
    if (!url) return '#';
    let targetUrl = url;
    if (!url.startsWith('http') && !url.startsWith('data:')) {
      targetUrl = url.startsWith('/') ? `${apiUrl}${url}` : `${apiUrl}/${url}`;
    }
    // If it's an internal file API URL, ensure it has the correct active token
    if (targetUrl.startsWith(apiUrl)) {
      try {
        const parsedUrl = new URL(targetUrl);
        parsedUrl.searchParams.set('token', accessToken || '');
        targetUrl = parsedUrl.toString();
      } catch (e) {
        // Fallback if URL parsing fails
        const cleanUrl = targetUrl.split('?')[0];
        targetUrl = `${cleanUrl}?token=${accessToken || ''}`;
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

  const fetchDetail = useCallback(async () => {
    if (!user || !accessToken || !params.id) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/associates/${params.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await resp.json();
      if (d?.success) {
        setData(d.data);
        setReviewNotes(d.data?.reviews?.[0]?.notes || '');
      } else {
        toast('error', d?.error || 'Gagal memuat data');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken, params.id, apiUrl, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!user || !accessToken) return;
    setReviewing(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/associates/${params.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status, notes: reviewNotes }),
      });
      const d = await resp.json();
      if (d?.success) {
        toast('success', status === 'approved' ? 'Associate berhasil disetujui' : 'Associate telah ditolak');
        await fetchDetail();
      } else {
        toast('error', d?.error || 'Gagal memproses review');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setReviewing(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast('success', 'Link profil disalin ke clipboard');
    } catch {
      toast('error', 'Gagal menyalin link');
    }
  };

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

  if (!data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Associate tidak ditemukan</p>
        <Link href="/admin/associates" className="mt-3 text-sm font-medium text-[#0B2C6B] hover:underline">Kembali ke daftar</Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'experience', label: 'Experience' },
    { id: 'skills', label: 'Skills' },
    { id: 'education', label: 'Education' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'documents', label: 'Documents' },
    { id: 'reviews', label: `Reviews (${data.reviews?.length || 0})` },
  ];

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/associates" className="hover:text-slate-700">Associates</Link>
        <span>/</span>
        <span className="text-slate-900">{data.profile?.full_name || data.email}</span>
      </div>

      {/* Profile Header */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#0B2C6B] to-[#1e40af]" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12">
            <Avatar
              name={data.profile?.full_name || data.email}
              src={data.profile?.photo_url ? `${apiUrl}/api/files/view-path?path=${encodeURIComponent(data.profile.photo_url)}&token=${accessToken || ''}` : undefined}
              size="xl"
              className="border-4 border-white shadow-lg"
            />
            <div className="flex items-center gap-3 pb-2">
              <button
                onClick={handleShare}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Bagikan Profil
              </button>
              {data.documents?.find((d) => d.type === 'cv') && (
                <a
                  href={resolveFileUrl(`/api/files/${data.documents.find((d) => d.type === 'cv')!.id}/view`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[#0B2C6B] text-[#0B2C6B] bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Buka CV Asli (PDF/Word)
                </a>
              )}
              <Link
                href={`/admin/associates/${params.id}/cv`}
                className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A255A]"
              >
                Lihat CV Standar
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{data.profile?.full_name || data.email}</h1>
              <StatusBadge status={data.status} size="md" />
            </div>
            {data.profile?.roles && data.profile.roles.length > 0 && (
              <p className="mt-1 text-slate-600">{data.profile.roles.join(' & ')}</p>
            )}
            {data.profile?.expertises && data.profile.expertises.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.profile.expertises.map((exp) => (
                  <span key={exp} className="rounded-full bg-[#0B2C6B]/10 px-3 py-1 text-xs font-medium text-[#0B2C6B]">{exp}</span>
                ))}
              </div>
            )}
            {data.profile?.city && (
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {data.profile.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Review Panel */}
      {data.status === 'pending_review' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="text-lg font-semibold text-amber-800">Review Associate</h3>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Catatan review..."
            rows={3}
            className="mt-3 block w-full rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleReview('approved')}
              disabled={reviewing}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {reviewing ? 'Memproses...' : 'Setujui'}
            </button>
            <button
              onClick={() => handleReview('rejected')}
              disabled={reviewing}
              className="rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Tolak
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-6" />

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Tentang</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{data.profile?.bio || 'Belum ada bio.'}</p>
                <div className="mt-4 space-y-2">
                  {data.profile?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-slate-700">{data.profile.phone}</span>
                    </div>
                  )}
                  {data.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-slate-700">{data.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">Pengalaman ({data.experiences?.length || 0})</h3>
                <div className="mt-3 space-y-3">
                  {data.experiences?.slice(0, 3).map((exp) => (
                    <div key={exp.id} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{exp.position}</p>
                        <p className="text-xs text-slate-500">{exp.organization}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(exp.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} —{' '}
                          {exp.end_date ? new Date(exp.end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Sekarang'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">Keahlian Utama</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.profile?.expertises?.map((exp) => (
                    <span key={exp} className="rounded-full bg-[#0B2C6B]/5 px-3 py-1 text-sm font-medium text-[#0B2C6B]">{exp}</span>
                  ))}
                </div>
                {(!data.profile?.expertises || data.profile.expertises.length === 0) && (
                  <p className="mt-2 text-sm text-slate-500">Belum ada keahlian.</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">Dokumen</h3>
                <div className="mt-3 space-y-2">
                  {data.documents?.slice(0, 3).map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url ? `${apiUrl}/api/files/${doc.id}/view` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                          <p className="text-xs text-slate-500">{doc.type}</p>
                        </div>
                      </div>
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Experience Tab */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              {data.experiences?.map((exp) => (
                <div key={exp.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{exp.position}</p>
                  <p className="text-sm text-slate-600">{exp.organization}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(exp.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} —{' '}
                    {exp.end_date ? new Date(exp.end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Sekarang'}
                  </p>
                  {exp.description && <p className="mt-3 text-sm text-slate-600">{exp.description}</p>}
                </div>
              ))}
              {(!data.experiences || data.experiences.length === 0) && (
                <p className="text-center text-sm text-slate-500">Belum ada pengalaman.</p>
              )}
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {data.skills?.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2">
                    <span className="text-sm font-medium text-slate-900">{skill.skill_name}</span>
                    {skill.proficiency && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{skill.proficiency}</span>
                    )}
                  </div>
                ))}
              </div>
              {(!data.skills || data.skills.length === 0) && (
                <p className="text-center text-sm text-slate-500">Belum ada skill.</p>
              )}
            </div>
          )}

          {/* Education Tab */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              {data.educations?.map((edu) => (
                <div key={edu.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{edu.institution}</p>
                  <p className="text-sm text-slate-600">{edu.degree}{edu.field_of_study && ` — ${edu.field_of_study}`}</p>
                  {edu.start_year && (
                    <p className="mt-1 text-xs text-slate-400">{edu.start_year} — {edu.end_year || 'Sekarang'}</p>
                  )}
                </div>
              ))}
              {(!data.educations || data.educations.length === 0) && (
                <p className="text-center text-sm text-slate-500">Belum ada pendidikan.</p>
              )}
            </div>
          )}

          {/* Certifications Tab */}
          {activeTab === 'certifications' && (
            <div className="space-y-4">
              {data.certifications?.map((cert) => (
                <div key={cert.id} className="rounded-lg border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{cert.name}</p>
                    <p className="text-sm text-slate-600">{cert.issuer}</p>
                    {cert.issue_date && (
                      <p className="mt-1 text-xs text-slate-400">Diterbitkan {new Date(cert.issue_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                    )}
                  </div>
                  {cert.credential_url && (
                    <div className="mt-2">
                      {/\.(jpg|jpeg|png|webp)/i.test(cert.credential_url) ? (
                        <div className="relative group max-w-[200px] rounded-lg overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-50">
                          <img src={resolveFileUrl(cert.credential_url)} alt={cert.name} className="w-full h-full object-cover" />
                          <a
                            href={resolveFileUrl(cert.credential_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Buka File
                          </a>
                        </div>
                      ) : (
                        <a
                          href={resolveFileUrl(cert.credential_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-[#0B2C6B] hover:bg-slate-100 transition-colors"
                        >
                          <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate max-w-[150px] text-[10px]">Lihat Dokumen Sertifikat</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(!data.certifications || data.certifications.length === 0) && (
                <p className="text-center text-sm text-slate-500">Belum ada sertifikasi.</p>
              )}
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.portfolios?.map((port) => {
                const { cleanDesc, files } = extractAttachments(port.description);
                return (
                  <div key={port.id} className="rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 truncate" title={port.title}>{port.title}</p>
                      {cleanDesc && (
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed whitespace-pre-wrap">{cleanDesc}</p>
                      )}
                      {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Berkas Lampiran</span>
                          <div className="grid grid-cols-2 gap-2">
                            {files.map((file, fIdx) => (
                              <div key={fIdx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-50 flex flex-col justify-between">
                                {/\.(jpg|jpeg|png|webp)/i.test(file.url) ? (
                                  <>
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                                    >
                                      Buka File
                                    </a>
                                  </>
                                ) : (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center h-full p-3 gap-2 text-center text-[#0B2C6B] hover:bg-slate-100 transition-colors"
                                  >
                                    <svg className="h-6 w-6 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="truncate max-w-[120px] text-[9px] font-semibold">{file.name}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!data.portfolios || data.portfolios.length === 0) && (
                <p className="col-span-full text-center text-sm text-slate-500">Belum ada portofolio.</p>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              {data.documents?.map((doc) => {
                const isCV = doc.type === 'cv';
                return (
                  <button
                    key={doc.id}
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      const freshToken = session?.access_token || accessToken || '';
                      const url = `${apiUrl}/api/files/${doc.id}/view?token=${freshToken}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className={`w-full flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-slate-50 text-left ${isCV ? 'border-[#0B2C6B]/30 bg-[#0B2C6B]/[0.02]' : 'border-slate-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${isCV ? 'bg-[#0B2C6B]/10' : 'bg-slate-100'}`}>
                        <svg className={`h-5 w-5 ${isCV ? 'text-[#0B2C6B]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                          {isCV && (
                            <span className="inline-flex items-center rounded-full bg-[#0B2C6B] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">CV</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isCV ? 'bg-[#0B2C6B]/10 text-[#0B2C6B]' : 'bg-slate-100 text-slate-500'}`}>
                        Buka File ↗
                      </span>
                    </div>
                  </button>
                );
              })}
              {(!data.documents || data.documents.length === 0) && (
                <p className="text-center text-sm text-slate-500">Belum ada dokumen.</p>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {data.reviews && data.reviews.length > 0 ? (
                data.reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          review.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          review.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {statusLabels[review.status] || review.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {review.decision_at && (
                        <span className="text-[10px] text-slate-400">
                          Keputusan: {new Date(review.decision_at).toLocaleDateString('id-ID')}
                        </span>
                      )}
                    </div>
                    {review.notes && (
                      <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{review.notes}</p>
                    )}
                    {!review.notes && (
                      <p className="mt-3 text-xs text-slate-400 italic">Tidak ada catatan</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-slate-500">Belum ada review.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {data.submitted_at && (
        <p className="text-xs text-slate-400">Disubmit: {new Date(data.submitted_at).toLocaleString('id-ID')}</p>
      )}
    </div>
  );
}
