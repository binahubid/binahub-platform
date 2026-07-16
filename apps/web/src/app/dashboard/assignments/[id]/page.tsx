'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../components/ui';

const getFileUrlWithToken = (urlStr: string | null | undefined, token: string | null) => {
  if (!urlStr) return '';
  if (!token) return urlStr;
  try {
    const url = new URL(urlStr);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    if (urlStr.includes('?')) {
      if (urlStr.includes('token=')) {
        return urlStr.replace(/token=[^&]+/, `token=${token}`);
      }
      return `${urlStr}&token=${token}`;
    }
    return `${urlStr}?token=${token}`;
  }
};
type AssignmentDetail = {
  id: string;
  title: string;
  client_name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  needed_roles: string[];
  needed_count: number;
  mandays?: number;
  compensation?: string | null;
  created_at: string;
  my_assignment: {
    id: string;
    status: string;
    role: string | null;
    notes: string | null;
    invited_at: string;
    accepted_at: string | null;
    evidence_url: string | null;
    evidence_notes: string | null;
    evidence_submitted_at: string | null;
    evidence_reviewed_at: string | null;
    evidence_reviewer_notes: string | null;
  } | null;
  accepted_count: number;
  total_assignees: number;
};

const WORKFLOW_STEPS = [
  { key: 'invited',     label: 'Diundang',       icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'accepted',    label: 'Diterima',        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'in_progress', label: 'Berjalan',        icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { key: 'completed',   label: 'Laporan Dikirim', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'reviewed',    label: 'Review Admin',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
];

const statusLabel: Record<string, string> = {
  invited: 'Diundang',
  accepted: 'Diterima',
  in_progress: 'Mulai Bekerja',
  completed: 'Laporan Dikirim',
  reviewed: 'Disetujui Admin',
  declined: 'Ditolak',
};

function getStepIndex(status: string | undefined): number {
  if (!status) return -1;
  if (status === 'invited' || status === 'declined') return 0;
  if (status === 'accepted') return 1;
  if (status === 'in_progress') return 2;
  if (status === 'completed') return 3;
  return 4;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtCurrency(val: string | null | undefined) {
  if (!val) return '—';
  const num = Number(String(val).replace(/\D/g, ''));
  if (!isNaN(num) && num > 0)
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  return val;
}


export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);

  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; name: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const evidenceFileRef = useRef<HTMLInputElement>(null);

  // Activity progress log states
  const [progressLogs, setProgressLogs] = useState<any[]>([]);
  const [newLogNotes, setNewLogNotes] = useState('');
  const [newLogPhotos, setNewLogPhotos] = useState<{ url: string; name: string }[]>([]);
  const [submittingLog, setSubmittingLog] = useState(false);
  const newLogPhotoInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const fetchProgressLogs = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/assignments/${id}/progress-logs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setProgressLogs(json.data || []);
      }
    } catch { /* ignore */ }
  }, [accessToken, id, apiUrl]);

  const fetchDetail = useCallback(async () => {
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}`, { headers });
      const data = await resp.json();
      if (data.success) {
        setAssignment(data.data);
        if (data.data?.my_assignment) {
          setEvidenceNotes(data.data.my_assignment.evidence_notes || '');
          setEvidenceUrl(data.data.my_assignment.evidence_url || '');
        }
      }
    } catch (e) {
      console.error('Failed to fetch assignment:', e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, id, headers]);

  useEffect(() => {
    if (!accessToken) return;
    fetchDetail();
    fetchProgressLogs();
  }, [accessToken, fetchDetail, fetchProgressLogs]);

  const handleProgressLogSubmit = async () => {
    if (!newLogNotes.trim()) {
      toast('error', 'Silakan isi catatan progres terlebih dahulu');
      return;
    }
    setSubmittingLog(true);
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}/progress-log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          notes: newLogNotes,
          photo_urls: newLogPhotos.map(p => p.url)
        }),
      });
      const data = await resp.json();
      if (data.success) {
        toast('success', 'Log progres berhasil disimpan');
        setNewLogNotes('');
        setNewLogPhotos([]);
        fetchProgressLogs();
      } else {
        toast('error', data.error || 'Gagal menyimpan log progres');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleNewLogPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !accessToken || !user) return;
    setUploadingFile(true);
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) { toast('error', `${file.name} terlalu besar (maks 20MB)`); continue; }
        const url = await uploadFile(file, 'other');
        setNewLogPhotos(prev => [...prev, { url, name: file.name }]);
      }
      toast('success', 'Foto kegiatan berhasil diunggah');
    } catch (err: unknown) {
      toast('error', (err as Error).message || 'Gagal mengunggah foto');
    } finally {
      setUploadingFile(false);
      if (newLogPhotoInputRef.current) newLogPhotoInputRef.current.value = '';
    }
  };

  const handleApply = async () => {
    setActing(true);
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.success) {
        toast('success', 'Berhasil mendaftar ke assignment');
        fetchDetail();
      } else {
        toast('error', data.error || 'Gagal apply');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setActing(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setActing(true);
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await resp.json();
      if (data.success) {
        toast('success', `Status assignment diperbarui menjadi: ${statusLabel[newStatus]}`);
        fetchDetail();
      } else {
        toast('error', data.error || 'Gagal mengubah status');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setActing(false);
      setShowAgreementModal(false);
    }
  };

  const uploadFile = async (file: File, category = 'other'): Promise<string> => {
    const presignRes = await fetch(`${apiUrl}/api/files/presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ fileName: `${category}-${Date.now()}-${file.name}`, fileType: file.type, fileSize: file.size, ownerId: user!.id, ownerType: 'associate', category }),
    });
    const presignData = await presignRes.json();
    if (!presignData.success) throw new Error(presignData.error || 'Gagal upload');
    await fetch(presignData.data.presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    const regRes = await fetch(`${apiUrl}/api/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ownerId: user!.id, ownerType: 'associate', category, path: presignData.data.path, originalName: file.name, mime: file.type, size: file.size, visibility: 'private' }),
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error(regData.error || 'Gagal registrasi file');
    return `${apiUrl}/api/files/${regData.data.id}/view?token=${accessToken}`;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !accessToken || !user) return;
    setUploadingFile(true);
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) { toast('error', `${file.name} terlalu besar (maks 20MB)`); continue; }
        const url = await uploadFile(file, 'other');
        setUploadedPhotos(prev => [...prev, { url, name: file.name }]);
      }
      toast('success', 'Foto berhasil diunggah');
    } catch (err: unknown) {
      toast('error', (err as Error).message || 'Gagal mengunggah foto');
    } finally {
      setUploadingFile(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleEvidenceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken || !user) return;
    if (file.size > 20 * 1024 * 1024) { toast('error', 'Ukuran file maksimal 20MB'); return; }
    setUploadingFile(true);
    try {
      const url = await uploadFile(file, 'other');
      setEvidenceUrl(url);
      toast('success', 'File laporan berhasil diunggah');
    } catch (err: unknown) {
      toast('error', (err as Error).message || 'Gagal mengunggah file');
    } finally {
      setUploadingFile(false);
    }
  };

  const submitFinalReport = async () => {
    if (!evidenceNotes.trim() && !evidenceUrl && uploadedPhotos.length === 0) {
      toast('error', 'Isi laporan terlebih dahulu sebelum submit');
      return;
    }
    setActing(true);
    const photosStr = uploadedPhotos.length > 0
      ? `\n\nFoto Dokumentasi:\n${uploadedPhotos.map(p => p.url).join('\n')}`
      : '';
    const combinedNotes = (evidenceNotes + photosStr).trim();
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'completed', evidence_url: evidenceUrl || (uploadedPhotos[0]?.url ?? ''), evidence_notes: combinedNotes }),
      });
      const data = await resp.json();
      if (data.success) {
        toast('success', 'Laporan berhasil dikirim! Menunggu review admin.');
        fetchDetail();
      } else {
        toast('error', data.error || 'Gagal mengirim laporan');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setActing(false);
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

  if (!assignment) return null;

  const my = assignment.my_assignment;
  const myStatus = my?.status;
  const stepIndex = getStepIndex(myStatus);
  const myRole = my?.role || assignment.needed_roles?.[0] || null;
  const isDeclined = myStatus === 'declined';

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startDate = assignment.start_date
    ? (() => { const d = new Date(assignment.start_date!); d.setHours(0,0,0,0); return d; })()
    : null;
  const canStart = myStatus === 'accepted' && (!startDate || today >= startDate);

  return (
    <div className="space-y-5 pb-8">
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/assignments" className="text-slate-400 hover:text-slate-600 transition-colors">Assignments</Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-700 truncate max-w-[220px]">{assignment.title}</span>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#1a4dab] p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${assignment.status === 'active' ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-white/10 text-white/60'}`}>
                  {assignment.status === 'active' ? 'Aktif' : assignment.status}
                </span>
                {myStatus && !isDeclined && (
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30">
                    {myStatus === 'invited' ? 'Diundang' : myStatus === 'accepted' ? 'Diterima' : myStatus === 'in_progress' ? 'Berjalan' : myStatus === 'completed' ? 'Laporan Dikirim' : myStatus === 'reviewed' ? 'Disetujui' : myStatus}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">{assignment.title}</h1>
              <p className="text-white/60 text-sm mt-0.5">{assignment.client_name}</p>
              {assignment.description && <p className="mt-3 text-sm text-white/70 leading-relaxed max-w-2xl">{assignment.description}</p>}
            </div>
            {myRole && (
              <div className="flex-shrink-0 rounded-xl bg-white/10 ring-1 ring-white/20 px-4 py-3 text-center min-w-[110px]">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Role Anda</p>
                <p className="text-sm font-bold text-white mt-0.5">{myRole}</p>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70 border-t border-white/10 pt-4">
            {assignment.start_date && (
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>Mulai: <strong className="text-white/90">{fmtDate(assignment.start_date)}</strong></span>
              </div>
            )}
            {assignment.end_date && (
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Selesai: <strong className="text-white/90">{fmtDate(assignment.end_date)}</strong></span>
              </div>
            )}
            {!!assignment.mandays && assignment.mandays > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span>Durasi: <strong className="text-white/90">{assignment.mandays} Manday{assignment.mandays > 1 ? 's' : ''}</strong></span>
              </div>
            )}
            {assignment.compensation && (
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Kompensasi: <strong className="text-white/90">{fmtCurrency(assignment.compensation)}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      {my && !isDeclined && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5">Alur Penugasan</p>
          <div className="relative flex items-start justify-between">
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-100" />
            {WORKFLOW_STEPS.map((step, idx) => {
              const done = stepIndex > idx;
              const active = stepIndex === idx;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center flex-1 gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all shadow-sm ${done ? 'border-[#0B2C6B] bg-[#0B2C6B]' : active ? 'border-[#0B2C6B] bg-white ring-4 ring-[#0B2C6B]/10' : 'border-slate-200 bg-white'}`}>
                    {done ? (
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className={`h-3.5 w-3.5 ${active ? 'text-[#0B2C6B]' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                      </svg>
                    )}
                  </div>
                  <p className={`text-center text-[10px] font-semibold leading-tight ${done || active ? 'text-[#0B2C6B]' : 'text-slate-400'}`}>{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isDeclined && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <svg className="h-10 w-10 text-red-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="font-semibold text-red-700">Anda menolak undangan ini</p>
          <p className="text-xs text-red-400 mt-1">Hubungi admin jika ingin mengajukan kembali</p>
        </div>
      )}

      {my && !isDeclined && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {myStatus === 'invited' && (
            <div className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Anda Mendapat Undangan</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Diundang sebagai <strong className="text-slate-700">{myRole || 'Associate'}</strong>. Baca detail, lalu terima atau tolak.</p>
                  </div>
                </div>
              </div>
              {my.notes && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Pesan dari Admin</p>
                  <p className="text-sm text-amber-800">{my.notes}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={() => setShowAgreementModal(true)} disabled={acting} className="w-full sm:flex-1 rounded-xl bg-[#0B2C6B] py-3 text-sm font-bold text-white hover:bg-[#0A255A] disabled:opacity-50 transition-colors shadow-sm text-center">Terima Undangan</button>
                <button onClick={() => handleStatusUpdate('declined')} disabled={acting} className="w-full sm:w-32 rounded-xl border border-red-200 bg-red-50/50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100/70 disabled:opacity-50 transition-colors text-center">Tolak</button>
              </div>
            </div>
          )}

          {myStatus === 'accepted' && (
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Undangan Diterima</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{canStart ? 'Proyek sudah bisa dimulai sekarang.' : `Pekerjaan dimulai pada ${fmtDate(assignment.start_date)}.`}</p>
                </div>
              </div>
              {!canStart && startDate && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-3">
                  <svg className="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm text-slate-600">Tombol mulai aktif pada <strong>{fmtDate(assignment.start_date)}</strong></p>
                </div>
              )}
              <button onClick={() => handleStatusUpdate('in_progress')} disabled={acting || !canStart} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                {acting ? 'Memproses...' : canStart ? 'Mulai Kerja Sekarang' : `Mulai Kerja (${fmtDate(assignment.start_date)})`}
              </button>
            </div>
          )}

          {myStatus === 'in_progress' && (
            <div className="divide-y divide-slate-100">
              {my.evidence_reviewer_notes && (
                <div className="p-4 bg-amber-50">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div><p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Revisi Diperlukan</p><p className="text-sm text-amber-700 mt-0.5">{my.evidence_reviewer_notes}</p></div>
                  </div>
                </div>
              )}

              {/* CARD 1: Log Aktivitas Harian/Lapangan */}
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Log Aktivitas & Progres Lapangan</h2>
                  <p className="text-xs text-slate-500 mt-1">Gunakan form ini untuk mencatat perkembangan pekerjaan Anda kapan saja. Log ini langsung tersimpan dan tidak mengubah status penugasan Anda.</p>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Catatan Kegiatan / Hambatan</label>
                    <textarea 
                      value={newLogNotes} 
                      onChange={(e) => setNewLogNotes(e.target.value)} 
                      placeholder="Contoh: Hari ini melakukan survey lokasi A, kendala cuaca hujan deras..." 
                      rows={3} 
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none resize-none transition shadow-sm" 
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Foto Dokumentasi Kegiatan (Opsional)</label>
                    <div onClick={() => !uploadingFile && newLogPhotoInputRef.current?.click()} className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0B2C6B]/50 hover:bg-[#0B2C6B]/[0.02] transition-all p-5 flex flex-col items-center gap-1.5 group bg-white shadow-sm">
                      {uploadingFile
                        ? <svg className="h-6 w-6 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        : <svg className="h-6 w-6 text-slate-400 group-hover:text-[#0B2C6B]/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      }
                      <p className="text-xs font-bold text-[#0B2C6B] group-hover:underline transition-colors">{uploadingFile ? 'Sedang Mengunggah...' : 'Klik untuk Ambil/Unggah Foto Progres'}</p>
                      <input ref={newLogPhotoInputRef} type="file" accept="image/*" multiple onChange={handleNewLogPhotoUpload} className="hidden" />
                    </div>

                    {newLogPhotos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                        {newLogPhotos.map((photo, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-sm">
                            <img src={getFileUrlWithToken(photo.url, accessToken)} alt={photo.name} className="w-full h-full object-cover animate-fade-in" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setNewLogPhotos(prev => prev.filter((_, i) => i !== idx))} className="text-white text-[10px] font-bold bg-red-500 rounded px-2 py-1 shadow-sm">Hapus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={handleProgressLogSubmit} 
                      disabled={submittingLog || uploadingFile}
                      className="px-5 py-2.5 rounded-xl bg-[#0B2C6B] text-xs font-bold text-white hover:bg-[#0A255A] disabled:opacity-50 transition-colors shadow-md flex items-center gap-1.5"
                    >
                      {submittingLog && <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                      Simpan Log Progres
                    </button>
                  </div>
                </div>

                {/* Timeline Log Progres yang Sudah Ada */}
                {progressLogs.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Riwayat Aktivitas Lapangan ({progressLogs.length})</h3>
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {progressLogs.map((log, logIdx) => (
                          <li key={log.id}>
                            <div className="relative pb-8">
                              {logIdx !== progressLogs.length - 1 ? (
                                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className="h-8 w-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center ring-8 ring-white">
                                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 pt-1.5">
                                  <div className="text-xs text-slate-500 flex items-center justify-between gap-4">
                                    <span className="font-semibold text-slate-800">Log Aktivitas</span>
                                    <span>{new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{log.notes}</p>
                                  
                                  {log.photo_urls && Array.isArray(log.photo_urls) && log.photo_urls.length > 0 && (
                                    <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                                      {log.photo_urls.map((photoUrl: string, pIdx: number) => (
                                        <a 
                                          key={pIdx} 
                                          href={getFileUrlWithToken(photoUrl, accessToken)} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50 block shadow-xs hover:opacity-80 transition"
                                        >
                                          <img src={getFileUrlWithToken(photoUrl, accessToken)} alt="Dokumentasi" className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: Kirim Laporan Akhir (Final Submission) */}
              <div className="p-6 bg-slate-50/30 space-y-5 border-t border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Kirim Laporan Akhir</h2>
                  <p className="text-xs text-slate-500 mt-1">Lakukan langkah ini HANYA jika seluruh pekerjaan telah selesai. Status penugasan akan berubah menjadi <strong>Laporan Dikirim (Completed)</strong> dan menunggu persetujuan admin.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Kesimpulan / Laporan Akhir</label>
                    <textarea 
                      value={evidenceNotes} 
                      onChange={(e) => setEvidenceNotes(e.target.value)} 
                      placeholder="Tuliskan di sini ringkasan akhir hasil pekerjaan Anda untuk diserahkan ke admin..." 
                      rows={4} 
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none resize-none transition shadow-sm" 
                    />
                  </div>

                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-150 shadow-sm">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Berkas Laporan Pendukung / Dokumen Final</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => evidenceFileRef.current?.click()} disabled={uploadingFile} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        {uploadingFile ? 'Mengunggah Berkas...' : 'Upload Berkas Laporan'}
                      </button>
                      <input ref={evidenceFileRef} type="file" onChange={handleEvidenceFileUpload} className="hidden" />
                      {evidenceUrl ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          &#10003; Berkas berhasil dilampirkan
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">PDF, Word, Excel, ZIP (Opsional)</span>
                      )}
                    </div>
                    {evidenceUrl && (
                      <div className="pt-1.5">
                        <a 
                          href={getFileUrlWithToken(evidenceUrl, accessToken)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-[#0B2C6B] hover:underline font-bold"
                        >
                          Lihat file terlampir
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button onClick={submitFinalReport} disabled={acting || uploadingFile} className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      Kirim Laporan & Selesai Bekerja
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {myStatus === 'completed' && (
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Laporan Telah Dikirim</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Sedang dalam proses review admin.</p>
                  {my.evidence_submitted_at && <p className="text-xs text-slate-400 mt-1">Dikirim: {new Date(my.evidence_submitted_at).toLocaleString('id-ID')}</p>}
                </div>
              </div>
              {(my.evidence_notes || my.evidence_url) && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Laporan yang Dikirim</p>
                  {my.evidence_notes && <p className="text-sm text-slate-700 whitespace-pre-wrap">{my.evidence_notes}</p>}
                  {my.evidence_url && (
                    <a href={my.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Buka File Laporan
                    </a>
                  )}
                </div>
              )}
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 flex items-center gap-3">
                <svg className="h-5 w-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-indigo-700">Admin sedang memeriksa laporan Anda. Anda akan menerima notifikasi setelah review selesai.</p>
              </div>
            </div>
          )}

          {myStatus === 'reviewed' && (
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shadow-md animate-pulse">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Pekerjaan Selesai & Disetujui! ✅</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Admin telah meninjau dan menyetujui laporan akhir Anda. Terima kasih atas kontribusi Anda!</p>
                  {my.evidence_reviewed_at && <p className="text-xs text-slate-400 mt-1">Disetujui: {new Date(my.evidence_reviewed_at).toLocaleString('id-ID')}</p>}
                </div>
              </div>
              {my.evidence_reviewer_notes && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catatan Penilai (Admin)</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{my.evidence_reviewer_notes}</p>
                </div>
              )}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <p className="text-sm text-emerald-800 font-semibold">Tugas diselesaikan dengan sukses. Nilai performa Anda telah terhitung.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showAgreementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0B2C6B] to-[#1a4dab]">
              <h3 className="text-base font-bold text-white">Surat Perjanjian Kerja (SPK)</h3>
              <button onClick={() => setShowAgreementModal(false)} className="text-white/60 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 text-sm text-slate-700 leading-relaxed">
              <div className="text-center space-y-1">
                <p className="text-base font-bold text-slate-900 uppercase tracking-wide">Surat Perjanjian Kerja Sama (SPK)</p>
                <p className="text-[11px] text-slate-400">No. SPK/BINAHUB/{assignment.id.substring(0,8).toUpperCase()}/{new Date().getFullYear()}</p>
              </div>
              <p className="text-xs text-slate-600">Perjanjian ini dibuat oleh dan antara <strong className="text-slate-800">PT Binahub Global Indonesia (BinaHub)</strong> sebagai Pemberi Kerja dan <strong className="text-slate-800">{user?.email}</strong> sebagai Mitra Pelaksana.</p>
              {[
                { title: 'Pasal 1: Ruang Lingkup', items: [`Nama Proyek: ${assignment.title}`, `Klien: ${assignment.client_name}`, `Peran/Role: ${myRole || 'Associate'}`] },
                { title: 'Pasal 2: Jangka Waktu', items: ([assignment.start_date && `Tanggal Mulai: ${fmtDate(assignment.start_date)}`, assignment.end_date && `Tanggal Selesai: ${fmtDate(assignment.end_date)}`, assignment.mandays ? `Durasi: ${assignment.mandays} Manday(s)` : null] as (string | null | false)[]).filter((x): x is string => !!x) },
                { title: 'Pasal 3: Kompensasi', items: [`Nilai: ${fmtCurrency(assignment.compensation)}`, 'Pembayaran diproses setelah bukti tugas disetujui admin.'] },
                { title: 'Pasal 4: Kerahasiaan (NDA)', items: ['Mitra wajib menjaga kerahasiaan seluruh informasi proyek. Dilarang menyebarluaskan tanpa izin tertulis BinaHub.'] },
              ].map((s) => (
                <div key={s.title} className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.title}</p>
                  <ul className="space-y-1 list-disc pl-4 text-xs text-slate-600">{s.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreementChecked} onChange={(e) => setAgreementChecked(e.target.checked)} className="mt-0.5 rounded text-[#0B2C6B] focus:ring-[#0B2C6B]" />
                <span className="text-xs text-slate-600 font-medium select-none leading-normal">Saya menyetujui seluruh ketentuan SPK di atas secara sadar dan bersedia menaati semua peraturan kerja sama.</span>
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAgreementModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">Batal</button>
                <button onClick={() => handleStatusUpdate('accepted')} disabled={!agreementChecked || acting} className="rounded-xl bg-[#0B2C6B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A255A] disabled:opacity-50 transition-colors shadow-sm">
                  {acting ? 'Memproses...' : 'Setujui & Terima Undangan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
