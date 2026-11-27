'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, useToast } from '../../../../components/ui';
import { useAuth } from '../../../../context/AuthContext';
import { resolveProtectedFileUrl } from '../../../../components/ui/protected-file';
import type { AssociateData, Availability } from '../types';
import { ProfileBio, ProfileItems } from './profile-disclosure';
import { useAmsLocale } from "@/components/ams-language";

type ProfileViewProps = {
  data: AssociateData;
  completionPercentage: number;
  onEdit: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
};

export function ProfileView({ data, completionPercentage, onEdit, onSubmit, submitting }: ProfileViewProps) {
  const { t } = useAmsLocale();
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  const p = data.profile;
  const cvDoc = data.documents.find((d) => d.type === 'cv');
  const av: Availability | null | undefined = Array.isArray(data.availability) ? data.availability[0] : data.availability;
  const availabilityLabels: Record<string, string> = {
    open: 'Tersedia', available: 'Tersedia', limited: 'Terbatas', busy: 'Terbatas', unavailable: 'Tidak tersedia',
  };
  const profileLabels: Record<string, string> = {
    active: 'Akun aktif', draft: 'Profil belum diajukan', pending_review: 'Sedang ditinjau', suspended: 'Akun ditangguhkan',
  };
  const profileStatus = profileLabels[data.status] ?? data.status;
  const missingForReview = [
    !p?.full_name?.trim() && 'Nama lengkap',
    !p?.phone?.trim() && 'Nomor telepon',
    !p?.city?.trim() && 'Kota domisili',
    (!Array.isArray(p?.roles) || p.roles.length === 0) && 'Peran',
  ].filter(Boolean) as string[];
  const rejectedReview = data.status === 'draft' ? data.reviews?.find((review) => review.status === 'rejected') : null;


  const openPreview = async (source: string, title: string) => {
    if (!accessToken) {
      toast('error', 'Sesi Anda belum siap. Silakan coba lagi.');
      return;
    }

    try {
      const resolvedUrl = await resolveProtectedFileUrl(source, accessToken);
      setActivePreviewUrl(resolvedUrl);
      setActivePreviewTitle(title);
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Berkas tidak dapat dibuka');
    }
  };

  const extractAttachments = (description: string | null | undefined) => {
    if (!description) return { cleanDesc: '', files: [] as { name: string; url: string }[] };
    const files: { name: string; url: string }[] = [];
    const regex = /\[(?:File\s+)?Lampiran:\s*([^\]]+)\]\(([^)]+)\)/gi;
    let match;
    while ((match = regex.exec(description)) !== null) {
      files.push({ name: match[1], url: match[2] });
    }
    const cleanDesc = description.replace(regex, '').trim();
    return { cleanDesc, files };
  };

  return (
    <div className="space-y-5">

      <section className="ams-panel p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar name={p?.full_name || data.id} src={p?.photo_url} accessToken={accessToken} size="xl" className="sm:!h-20 sm:!w-20" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl">{p?.full_name || t("Profil saya")}</h1>
            {(p?.headline || p?.roles?.length) && <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-slate-600">{p.headline || p.roles?.[0]}</p>}
            <p className="mt-1 text-xs text-slate-600">{profileStatus}</p>
          </div>
        </div>
        {[p?.city, p?.phone, p?.nationality].some(Boolean) && (
          <p className="mt-4 break-words border-t border-slate-200 pt-3 text-sm leading-6 text-slate-600">
            {[p?.city, p?.phone, p?.nationality].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900">{t("Kelengkapan profil")}</span>
            <span className="font-medium tabular-nums text-[#0B2C6B]">{completionPercentage}%</span>
          </div>
          <progress aria-label={t("Kelengkapan profil")} value={completionPercentage} max={100} className="block h-1.5 w-full" />
        </div>
        <button type="button" onClick={onEdit} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123575]">{t("Ubah profil")}</button>
      </section>

      {/* Review is an explicit final step; a CV upload alone does not submit a profile. */}
      {data.status === 'draft' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-bold text-amber-950">{t("Langkah terakhir: kirim profil untuk ditinjau")}</h2>
          <p className="mt-1 text-xs leading-5 text-amber-900">{t("Menyimpan data atau mengunggah CV belum otomatis mengirim profil. Setelah dikirim, admin akan menyetujui atau memberi catatan perbaikan.")}</p>
          {rejectedReview && <p className="mt-3 rounded-lg border border-rose-200 bg-white p-3 text-xs text-rose-800"><strong>{t("Perlu perbaikan dari admin:")}</strong> {rejectedReview.notes || t("Periksa kembali informasi profil Anda.")}</p>}
          {missingForReview.length > 0 && <p className="mt-3 text-xs font-medium text-amber-950">{t("Sebelum mengirim, lengkapi:")} {missingForReview.join(', ')}.</p>}
          <button onClick={missingForReview.length ? onEdit : onSubmit} disabled={submitting} className="mt-3 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#123b80] disabled:opacity-50">
            {submitting ? t("Mengirim profil...") : missingForReview.length ? t("Lengkapi data wajib") : t("Kirim profil untuk ditinjau")}
          </button>
        </div>
      )}

      {/* ─── Two-Column Layout for Professional Detail ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Summary & Sidebar Widgets (1 Column) */}
        <div className="ams-panel divide-y divide-slate-200 self-start overflow-hidden lg:col-span-1">
          {/* Availability Status */}
          {av && (
            <div className="p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">{t("Ketersediaan kerja")}</h3>
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${
                  av.status === 'open' || av.status === 'available' ? 'bg-emerald-500' :
                  av.status === 'busy' || av.status === 'limited' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                <span className="text-sm font-bold text-slate-800">
                  {availabilityLabels[av.status || ''] || t("Belum diatur")}
                </span>
              </div>
              {av.work_locations && av.work_locations.length > 0 && (
                <ProfileItems label={t("Lokasi kerja")} items={av.work_locations} limit={3} compact>
                  {(visible) => (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-50">
                      {visible.map((loc: string) => (
                        <span key={loc} className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {loc}
                        </span>
                      ))}
                    </div>
                  )}
                </ProfileItems>
              )}
            </div>
          )}

          {/* Curriculum Vitae Widget */}
          {cvDoc && (
            <div className="p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("Dokumen CV Terlampir")}</h3>
              <button
                type="button"
                onClick={() => void openPreview(`/api/files/${cvDoc.id}/view`, cvDoc.file_name || 'Curriculum Vitae')}
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
            <div className="p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("Peran utama")}</h3>
              <ProfileItems label={t("Peran utama")} items={p.roles} limit={3} compact>
                {(visible) => (
                  <div className="flex flex-wrap gap-1.5">
                    {visible.map((role) => (
                      <span key={role} className="max-w-full break-words rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs font-semibold text-[#0B2C6B]">
                        {role === "EO" ? "Event Organizer" : role}
                      </span>
                    ))}
                  </div>
                )}
              </ProfileItems>
            </div>
          )}

          {/* Expertises List */}
          {p?.expertises && p.expertises.length > 0 && (
            <div className="p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("Bidang keahlian")}</h3>
              <ProfileItems label={t("Bidang keahlian")} items={p.expertises} limit={2} compact>
                {(visible) => (
                  <div className="flex flex-wrap gap-1.5">
                    {visible.map((exp) => (
                      <span key={exp} className="max-w-full break-words rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900">
                        {exp}
                      </span>
                    ))}
                  </div>
                )}
              </ProfileItems>
            </div>
          )}

          {/* Skills List */}
          {data.skills.length > 0 && (
            <div className="p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("Kompetensi dan keahlian")}</h3>
              <ProfileItems label={t("Kompetensi dan keahlian")} items={data.skills} limit={3} compact>
                {(visible) => (
                  <div className="flex flex-wrap gap-1.5">
                    {visible.map((skill) => (
                      <span key={skill.id} className="max-w-full break-words rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {skill.skill_name}
                        {skill.proficiency && (
                          <span className="ml-1.5 text-[11px] font-medium text-slate-600 capitalize">
                            ({skill.proficiency})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </ProfileItems>
            </div>
          )}

          {/* Languages List */}
          {data.languages.length > 0 && (
            <div className="p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("Penguasaan bahasa")}</h3>
              <ProfileItems label={t("Penguasaan bahasa")} items={data.languages} limit={3} compact>
                {(visible) => (
                  <div className="flex flex-wrap gap-1.5">
                    {visible.map((lang) => (
                      <span key={lang.id} className="max-w-full break-words rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {lang.language}
                        <span className="ml-1.5 text-[9px] font-bold text-[#0B2C6B] uppercase tracking-wider">
                          ({lang.proficiency})
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </ProfileItems>
            </div>
          )}
        </div>

        {/* Right Side: Bio & Interactive Timelines (2 Columns) */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {p?.bio && (
            <section className="ams-panel p-4 sm:p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">{t("Tentang saya")}</h2>
              <ProfileBio text={p.bio} />
            </section>
          )}

          {/* Experiences Section */}
          {data.experiences.length > 0 && (
            <div className="ams-panel min-w-0 p-4 sm:p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">{t("Pengalaman kerja")}</h3>
              <ProfileItems label={t("Pengalaman kerja")} items={data.experiences} limit={2} details={data.experiences.some((item) => Boolean(item.description?.trim() || item.achievement?.trim()))}>
                {(visible, expanded) => (
                  <div className="relative space-y-5 border-l border-slate-200 pl-4">
                    {visible.map((exp) => (
                      <div key={exp.id} className="relative group">
                        {/* Timeline Node Bullet */}
                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0B2C6B] shadow-sm transition-all duration-300 group-hover:scale-125" />

                        <div className="space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="break-words text-sm font-semibold text-slate-900">
                              {exp.position}
                            </h4>
                            <span className="inline-block rounded bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 w-fit">
                              {exp.start_date} — {exp.is_current ? 'Sekarang' : exp.end_date || '-'}
                            </span>
                          </div>
                          <p className="break-words text-xs font-semibold text-slate-600">{exp.organization}</p>
                          {exp.industry && (
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                              Industri: {exp.industry}
                            </p>
                          )}
                          {expanded && exp.description && (
                            <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {exp.description}
                            </p>
                          )}
                          {expanded && exp.achievement && (
                            <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-slate-600">{exp.achievement}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ProfileItems>
            </div>
          )}

          {/* Education Section */}
          {data.educations.length > 0 && (
            <div className="ams-panel min-w-0 p-4 sm:p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">{t("Riwayat pendidikan")}</h3>
              <ProfileItems label={t("Riwayat pendidikan")} items={data.educations} limit={2}>
                {(visible) => (
                  <div className="relative space-y-5 border-l border-slate-200 pl-4">
                    {visible.map((edu) => (
                      <div key={edu.id} className="relative group">
                        {/* Timeline Node Bullet */}
                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500 shadow-sm transition-all duration-300 group-hover:scale-125" />

                        <div className="space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="break-words text-sm font-semibold text-slate-900">
                              {edu.degree}
                            </h4>
                            <span className="inline-block rounded bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 w-fit">
                              {edu.start_year} — {edu.end_year || 'Sekarang'}
                            </span>
                          </div>
                          <p className="break-words text-xs font-semibold text-slate-600">{edu.institution}</p>
                          {edu.field_of_study && (
                            <p className="text-xs text-slate-500 italic mt-0.5">{t("Bidang Studi:")} {edu.field_of_study}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ProfileItems>
            </div>
          )}

          {/* Certifications Section */}
          {data.certifications && data.certifications.length > 0 && (
            <div className="ams-panel min-w-0 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">{t("Sertifikasi profesional")}</h3>
              <ProfileItems label={t("Sertifikasi profesional")} items={data.certifications} limit={2}>
                {(visible) => (
                  <div className="space-y-4 pt-2">
                    {visible.map((cert) => (
                      <div key={cert.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 hover:shadow-sm transition-shadow">
                        <div className="min-w-0 flex-1">
                          <h4 className="break-words text-sm font-semibold text-slate-900">{cert.name}</h4>
                          <p className="break-words text-xs font-medium text-slate-600">{cert.issuing_organization}</p>
                          {cert.credential_id && (
                            <p className="text-[10px] text-slate-400 mt-1">ID Kredensial: {cert.credential_id}</p>
                          )}
                          {cert.credential_url && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => void openPreview(cert.credential_url!, cert.name)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-[#0B2C6B] hover:bg-slate-100 transition-colors"
                              >
                                <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate max-w-[150px] text-[10px]">{t("Lihat Dokumen Sertifikat")}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ProfileItems>
            </div>
          )}

          {/* Portfolios Section */}
          {data.portfolios && data.portfolios.length > 0 && (
            <div className="ams-panel min-w-0 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">{t("Portofolio dan hasil karya")}</h3>
              <ProfileItems label="Portofolio" items={data.portfolios} limit={2} details={data.portfolios.some((item) => Boolean(item.description?.trim() || item.link_url))}>
                {(visible, expanded) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {visible.map((port) => {
                      const { cleanDesc, files } = extractAttachments(port.description);
                      return (
                        <div key={port.id} className="ams-panel p-4 hover:shadow-sm transition-shadow flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 break-words">{port.title}</h4>
                            {expanded && cleanDesc && (
                              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed break-words whitespace-pre-wrap">{cleanDesc}</p>
                            )}

                            {/* Visual File Attachments Box */}
                            {expanded && files.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Berkas Lampiran")}</span>
                                <div className="grid grid-cols-2 gap-2">
                                  {files.map((file, fIdx) => (
                                    <button
                                      key={fIdx}
                                      type="button"
                                      onClick={() => void openPreview(file.url, file.name)}
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
                          {expanded && port.link_url && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <a
                                href={port.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B2C6B] hover:underline truncate max-w-full"
                              >{t("Buka Tautan Portofolio")}<svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ProfileItems>
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
          <h3 className="mt-4 text-lg font-bold text-slate-900">{t("Profil Anda Masih Kosong")}</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">{t("Mulai isi profil Anda untuk mempermudah pendaftaran tugas dan proses penempatan.")}</p>
          <Link
            href="/dashboard/profile?edit=true"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25"
          >{t("Mulai Isi Profil")}</Link>
        </div>
      )}

      {/* File Preview Modal */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl h-[85vh] rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="break-words text-sm font-semibold text-slate-900">{activePreviewTitle || t("Pratinjau Dokumen")}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{t("Dokumen terverifikasi BinaHub")}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={activePreviewUrl}
                  download
                  className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>{t("Unduh")}</a>
                <button
                  onClick={() => { setActivePreviewUrl(null); setActivePreviewTitle(''); }}
                  className="rounded-lg bg-[#0B2C6B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0A255A] transition-colors"
                >{t("Tutup")}</button>
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
