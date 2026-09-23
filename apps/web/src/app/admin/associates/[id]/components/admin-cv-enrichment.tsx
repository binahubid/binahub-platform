'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../../../../components/ui';

type ParsedExperience = {
  company?: string | null;
  position?: string | null;
  startDate?: string | null;
};

type ParsedEducation = {
  institution?: string | null;
  degree?: string | null;
};

type NamedEntry = {
  name?: string | null;
  title?: string | null;
  language?: string | null;
};

export type AdminParsedCV = {
  fullName?: string | null;
  preferredName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  headline?: string | null;
  bio?: string | null;
  linkedIn?: string | null;
  website?: string | null;
  roles?: string[];
  expertises?: string[];
  skills?: NamedEntry[];
  experience?: ParsedExperience[];
  education?: ParsedEducation[];
  certifications?: NamedEntry[];
  languages?: NamedEntry[];
  portfolios?: NamedEntry[];
};

const APPLY_FIELDS = [
  'fullName', 'preferredName', 'phone', 'location', 'nationality', 'dateOfBirth',
  'gender', 'headline', 'bio', 'linkedIn', 'website', 'roles', 'expertises',
  'experience', 'education', 'skills', 'certifications', 'languages', 'portfolios',
] as const;

type ApplyField = typeof APPLY_FIELDS[number];

type Props = {
  associateId: string;
  accessToken: string;
  apiUrl: string;
  currentDocumentId?: string;
  initialParsedData?: AdminParsedCV | null;
  onChanged: () => Promise<void> | void;
};

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const scalarFields: Array<{ key: ApplyField; label: string }> = [
  { key: 'fullName', label: 'Nama lengkap' },
  { key: 'preferredName', label: 'Nama panggilan' },
  { key: 'phone', label: 'Nomor telepon' },
  { key: 'location', label: 'Lokasi' },
  { key: 'nationality', label: 'Kewarganegaraan' },
  { key: 'dateOfBirth', label: 'Tanggal lahir' },
  { key: 'gender', label: 'Gender' },
  { key: 'headline', label: 'Headline profesional' },
  { key: 'bio', label: 'Ringkasan profil' },
  { key: 'linkedIn', label: 'LinkedIn' },
  { key: 'website', label: 'Website' },
  { key: 'roles', label: 'Peran' },
  { key: 'expertises', label: 'Bidang keahlian' },
];

const collectionFields: Array<{ key: ApplyField; label: string }> = [
  { key: 'experience', label: 'Pengalaman' },
  { key: 'education', label: 'Pendidikan' },
  { key: 'skills', label: 'Keahlian' },
  { key: 'certifications', label: 'Sertifikasi' },
  { key: 'languages', label: 'Bahasa' },
  { key: 'portfolios', label: 'Portofolio' },
];

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

function hasValue(parsed: AdminParsedCV, key: ApplyField): boolean {
  const value = parsed[key];
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

function displayScalar(parsed: AdminParsedCV, key: ApplyField): string {
  const value = parsed[key];
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value !== 'string') return 'Tidak terbaca';
  return value.trim() || 'Tidak terbaca';
}

function entryLabel(key: ApplyField, entry: unknown): string {
  if (!entry || typeof entry !== 'object') return 'Entri CV';
  const item = entry as Record<string, unknown>;
  if (key === 'experience') return [item.position, item.company].filter(Boolean).join(' · ') || 'Pengalaman';
  if (key === 'education') return [item.degree, item.institution].filter(Boolean).join(' · ') || 'Pendidikan';
  return String(item.name || item.language || item.title || 'Entri CV');
}

function selectionStorageKey(documentId: string): string {
  return `ams:cv-apply-selection:${documentId}`;
}

export function AdminCVEnrichment({
  associateId,
  accessToken,
  apiUrl,
  currentDocumentId,
  initialParsedData,
  onChanged,
}: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'uploading' | 'parsing' | 'applying' | null>(null);
  const [documentId, setDocumentId] = useState(currentDocumentId || '');
  const [parsed, setParsed] = useState<AdminParsedCV | null>(initialParsedData || null);
  const [selectedFields, setSelectedFields] = useState<ApplyField[]>([]);
  const [applied, setApplied] = useState(false);

  const availableFields = useMemo(
    () => parsed ? APPLY_FIELDS.filter((field) => hasValue(parsed, field)) : [],
    [parsed],
  );

  useEffect(() => {
    if (!currentDocumentId) return;
    setDocumentId(currentDocumentId);
    setParsed(initialParsedData || null);
  }, [currentDocumentId, initialParsedData]);

  useEffect(() => {
    if (!parsed || !documentId) {
      setSelectedFields([]);
      return;
    }
    let restored: ApplyField[] = [];
    let hasSavedSelection = false;
    try {
      const stored = window.localStorage.getItem(selectionStorageKey(documentId));
      const saved = stored === null ? null : JSON.parse(stored);
      if (Array.isArray(saved)) {
        hasSavedSelection = true;
        restored = saved.filter((field): field is ApplyField =>
          typeof field === 'string'
          && (APPLY_FIELDS as readonly string[]).includes(field)
          && availableFields.includes(field as ApplyField));
      }
    } catch {
      restored = [];
    }
    setSelectedFields(hasSavedSelection ? restored : availableFields);
  }, [parsed, documentId, availableFields]);

  const saveSelection = (next: ApplyField[]) => {
    setSelectedFields(next);
    setApplied(false);
    if (documentId) window.localStorage.setItem(selectionStorageKey(documentId), JSON.stringify(next));
  };

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
      setParsed(body.data as AdminParsedCV);
      await onChanged();
      toast('success', body.cached
        ? 'Draft analisis tersimpan berhasil dimuat tanpa memakai token AI.'
        : 'CV berhasil dianalisis dan draftnya disimpan. Pilih data yang ingin diterapkan.');
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
    setSelectedFields([]);
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
    if (!parsed || !documentId || selectedFields.length === 0) return;
    setBusy('applying');
    try {
      const response = await fetch(`${apiUrl}/api/admin/associates/${associateId}/cv/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, fields: selectedFields }),
      });
      const body = await responseJson(response);
      setApplied(true);
      toast('success', body.message || `${selectedFields.length} kelompok data berhasil diterapkan.`);
      await onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Data CV gagal diterapkan');
    } finally {
      setBusy(null);
    }
  };

  const toggleField = (field: ApplyField) => {
    const next = selectedFields.includes(field)
      ? selectedFields.filter((item) => item !== field)
      : [...selectedFields, field];
    saveSelection(next);
  };

  const missingExperienceDates = parsed?.experience?.filter((item) => !item.startDate).length || 0;
  const allAvailableSelected = availableFields.length > 0
    && availableFields.every((field) => selectedFields.includes(field));

  return (
    <section className="rounded-xl border border-[#0B2C6B]/15 bg-gradient-to-br from-[#F8FAFF] to-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">AI Profile Enrichment</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Lengkapi profil dari CV</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Hasil AI disimpan pada dokumen CV dan akan tetap tersedia setelah pindah halaman atau refresh. Pilih hanya data yang memang ingin diterapkan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentDocumentId && (
            <button
              type="button"
              onClick={() => parseDocument(currentDocumentId, Boolean(initialParsedData))}
              disabled={busy !== null}
              title={initialParsedData ? 'Memanggil AI kembali dan mengganti draft analisis tersimpan' : 'Menganalisis CV karena belum ada draft tersimpan'}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'parsing'
                ? 'Menganalisis...'
                : initialParsedData
                  ? 'Analisis ulang dengan AI'
                  : 'Analisis CV tersimpan'}
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
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-emerald-700">Draft analisis tersimpan</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Tidak memakai token saat dimuat ulang</span>
              </div>
              <h4 className="mt-1 text-base font-semibold text-slate-950">{parsed.fullName || 'Nama tidak terbaca'}</h4>
              <p className="mt-0.5 text-sm text-slate-500">{parsed.headline || parsed.email || 'Periksa setiap data sebelum menerapkan.'}</p>
            </div>
            <button
              type="button"
              onClick={applyToProfile}
              disabled={busy !== null || applied || selectedFields.length === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'applying'
                ? 'Menerapkan...'
                : applied
                  ? 'Sudah diterapkan'
                  : `Terapkan ${selectedFields.length} pilihan`}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h5 className="text-sm font-semibold text-slate-900">Pilih data yang ingin diterapkan</h5>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Data profil terpilih dapat memperbarui nilai lama. Daftar terpilih ditambahkan tanpa duplikasi sederhana. Pilihan ini tersimpan di browser.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveSelection(allAvailableSelected ? [] : availableFields)}
              className="self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0B2C6B] hover:bg-slate-50"
            >
              {allAvailableSelected ? 'Batalkan semua' : 'Pilih semua tersedia'}
            </button>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {scalarFields.filter(({ key }) => availableFields.includes(key)).map(({ key, label }) => (
              <label key={key} className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${selectedFields.includes(key) ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(key)}
                  onChange={() => toggleField(key)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0B2C6B]"
                />
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                  <span className="mt-0.5 block max-h-16 overflow-hidden text-sm leading-5 text-slate-700">{displayScalar(parsed, key)}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {collectionFields.filter(({ key }) => availableFields.includes(key)).map(({ key, label }) => {
              const entries = Array.isArray(parsed[key]) ? parsed[key] as unknown[] : [];
              return (
                <label key={key} className={`cursor-pointer rounded-lg border p-3 transition-colors ${selectedFields.includes(key) ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                  <span className="flex items-start justify-between gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(key)}
                      onChange={() => toggleField(key)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="text-lg font-semibold text-slate-900">{entries.length}</span>
                  </span>
                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                  <span className="mt-1 block truncate text-[10px] text-slate-400" title={entries.slice(0, 3).map((entry) => entryLabel(key, entry)).join(', ')}>
                    {entries.slice(0, 2).map((entry) => entryLabel(key, entry)).join(', ')}
                  </span>
                </label>
              );
            })}
          </div>

          {selectedFields.length === 0 && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              Belum ada data yang dipilih. Profil tidak akan berubah sampai Anda mencentang minimal satu pilihan.
            </p>
          )}

          {missingExperienceDates > 0 && selectedFields.includes('experience') && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {missingExperienceDates} pengalaman tidak mempunyai tanggal mulai dan akan dilewati agar sistem tidak membuat tanggal palsu.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
