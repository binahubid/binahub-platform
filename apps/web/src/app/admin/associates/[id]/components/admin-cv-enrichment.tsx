'use client';

import { useRef, useState } from 'react';
import { useToast } from '../../../../../components/ui';

type ParsedCV = {
  fullName?: string | null;
  preferredName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  bio?: string | null;
  roles?: string[];
  expertises?: string[];
  skills?: unknown[];
  experience?: Array<{ startDate?: string | null }>;
  education?: unknown[];
  certifications?: unknown[];
  languages?: unknown[];
  portfolios?: unknown[];
};

type Props = {
  associateId: string;
  accessToken: string;
  apiUrl: string;
  currentDocumentId?: string;
  onApplied: () => Promise<void> | void;
};

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function resolveMime(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  if (file.type === PDF_MIME || lowerName.endsWith('.pdf')) return PDF_MIME;
  if (file.type === DOCX_MIME || lowerName.endsWith('.docx')) return DOCX_MIME;
  return null;
}

async function responseJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || `Permintaan gagal (HTTP ${response.status})`);
  }
  return body;
}

export function AdminCVEnrichment({ associateId, accessToken, apiUrl, currentDocumentId, onApplied }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'uploading' | 'parsing' | 'applying' | null>(null);
  const [documentId, setDocumentId] = useState(currentDocumentId || '');
  const [parsed, setParsed] = useState<ParsedCV | null>(null);
  const [applied, setApplied] = useState(false);

  const parseDocument = async (id: string, force = false) => {
    setBusy('parsing');
    setApplied(false);
    try {
      const response = await fetch(`${apiUrl}/api/ai/parse-cv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: id, force }),
      });
      const body = await responseJson(response);
      setDocumentId(id);
      setParsed(body.data as ParsedCV);
      toast('success', body.cached ? 'Hasil analisis tersimpan berhasil dimuat.' : 'CV berhasil dianalisis. Periksa ringkasannya sebelum diterapkan.');
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'CV gagal dianalisis');
    } finally {
      setBusy(null);
    }
  };

  const uploadAndParse = async (file: File) => {
    const mime = resolveMime(file);
    if (!mime) {
      toast('error', 'Gunakan CV berformat PDF berbasis teks atau DOCX.');
      return;
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      toast('error', 'Ukuran CV harus antara 1 byte dan 10 MB.');
      return;
    }

    setBusy('uploading');
    setParsed(null);
    setApplied(false);
    try {
      const prepare = await fetch(`${apiUrl}/api/files/associate/${associateId}/cv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: mime, fileSize: file.size }),
      });
      const prepared = await responseJson(prepare);

      const uploaded = await fetch(prepared.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mime },
        body: file,
      });
      if (!uploaded.ok) throw new Error('Binary CV gagal dikirim ke storage.');

      const confirm = await fetch(`${apiUrl}/api/files/associate/${associateId}/cv/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: prepared.data.fileId }),
      });
      await responseJson(confirm);
      await parseDocument(prepared.data.fileId, true);
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Unggah CV gagal');
      setBusy(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyToProfile = async () => {
    if (!parsed || !documentId) return;
    setBusy('applying');
    try {
      const response = await fetch(`${apiUrl}/api/admin/associates/${associateId}/cv/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      const body = await responseJson(response);
      setApplied(true);
      toast('success', body.message || 'Profil berhasil dilengkapi dari CV.');
      await onApplied();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Data CV gagal diterapkan');
    } finally {
      setBusy(null);
    }
  };

  const counts = parsed ? [
    ['Pengalaman', parsed.experience?.length || 0],
    ['Pendidikan', parsed.education?.length || 0],
    ['Keahlian', parsed.skills?.length || 0],
    ['Sertifikasi', parsed.certifications?.length || 0],
    ['Bahasa', parsed.languages?.length || 0],
    ['Portofolio', parsed.portfolios?.length || 0],
  ] as const : [];
  const missingExperienceDates = parsed?.experience?.filter((item) => !item.startDate).length || 0;

  return (
    <section className="rounded-xl border border-[#0B2C6B]/15 bg-gradient-to-br from-[#F8FAFF] to-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">AI Profile Enrichment</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Lengkapi profil dari CV</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Admin mengunggah atau menganalisis ulang CV, memeriksa hasilnya, lalu menerapkannya. Data koleksi yang sudah ada dipertahankan; entri baru ditambahkan tanpa duplikasi sederhana.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentDocumentId && (
            <button
              type="button"
              onClick={() => parseDocument(currentDocumentId, true)}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'parsing' ? 'Menganalisis...' : 'Analisis ulang CV tersimpan'}
            </button>
          )}
          <label className="cursor-pointer rounded-lg bg-[#0B2C6B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#09245A] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            {busy === 'uploading' ? 'Mengunggah...' : 'Unggah CV baru'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={busy !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAndParse(file);
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {busy === 'parsing' && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
          AI sedang membaca seluruh isi CV. CV panjang dapat memerlukan hingga satu menit.
        </div>
      )}

      {parsed && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700">Hasil siap ditinjau</p>
              <h4 className="mt-1 text-base font-semibold text-slate-950">{parsed.fullName || 'Nama tidak terbaca'}</h4>
              <p className="mt-0.5 text-sm text-slate-500">{parsed.headline || parsed.email || 'Periksa data sumber sebelum menerapkan.'}</p>
            </div>
            <button
              type="button"
              onClick={applyToProfile}
              disabled={busy !== null || applied}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'applying' ? 'Menerapkan...' : applied ? 'Sudah diterapkan' : 'Terapkan ke profil'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {counts.map(([label, count]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{count}</p>
              </div>
            ))}
          </div>

          {(parsed.roles?.length || parsed.expertises?.length) ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Peran terdeteksi</p>
                <p className="mt-1 text-sm text-slate-700">{parsed.roles?.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bidang keahlian</p>
                <p className="mt-1 text-sm text-slate-700">{parsed.expertises?.join(', ') || '—'}</p>
              </div>
            </div>
          ) : null}

          {missingExperienceDates > 0 && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {missingExperienceDates} pengalaman tidak mempunyai tanggal mulai dan akan dilewati agar sistem tidak membuat tanggal palsu.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
