'use client';

import { useState, useRef, useCallback } from 'react';

type StepUploadCVProps = {
  associateId: string;
  apiUrl: string;
  accessToken: string;
  onDone: (fileId: string, parsedData: Record<string, any> | null) => void;
  onSkip: () => void;
  onDeleteOldCV: () => void;
  existingCV?: { id: string; name: string } | null;
};

type UploadState = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

// ─── Illustrations ─────────────────────────────────────────────────────────────

function UploadIllustration({ isDragging }: { isDragging: boolean }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full max-w-[220px] mx-auto mb-2" xmlns="http://www.w3.org/2000/svg">
      {/* Background document */}
      <rect x="45" y="20" width="80" height="100" rx="8" fill={isDragging ? '#e8edf8' : '#f1f5f9'} />
      <rect x="55" y="35" width="40" height="4" rx="2" fill={isDragging ? '#c5d0ea' : '#cbd5e1'} />
      <rect x="55" y="44" width="55" height="4" rx="2" fill={isDragging ? '#c5d0ea' : '#cbd5e1'} />
      <rect x="55" y="53" width="48" height="4" rx="2" fill={isDragging ? '#c5d0ea' : '#cbd5e1'} />
      <rect x="55" y="62" width="52" height="4" rx="2" fill={isDragging ? '#c5d0ea' : '#cbd5e1'} />
      <rect x="55" y="71" width="38" height="4" rx="2" fill={isDragging ? '#c5d0ea' : '#cbd5e1'} />
      <rect x="55" y="84" width="55" height="4" rx="2" fill={isDragging ? '#c5d0ea' : '#cbd5e1'} />
      <rect x="55" y="93" width="44" height="4" rx="2" fill={isDragging ? '#c5d0ea' : '#cbd5e1'} />
      {/* Arrow */}
      <circle cx="148" cy="52" r="22" fill={isDragging ? '#0B2C6B' : '#e2e8f0'} className="transition-all duration-300" />
      <path d="M148 44v16m0-16l-5 5m5-5l5 5" stroke={isDragging ? '#fff' : '#64748b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
      {/* Glow dots */}
      <circle cx="36" cy="38" r="4" fill="#D9A441" opacity="0.6" />
      <circle cx="170" cy="86" r="5" fill="#0B2C6B" opacity="0.2" />
      <circle cx="156" cy="104" r="3" fill="#D9A441" opacity="0.4" />
    </svg>
  );
}

function ProcessingIllustration() {
  return (
    <svg viewBox="0 0 200 160" fill="none" className="w-full max-w-[220px] mx-auto mb-2" xmlns="http://www.w3.org/2000/svg">
      {/* Document */}
      <rect x="35" y="18" width="70" height="95" rx="6" fill="#f1f5f9" />
      <rect x="45" y="30" width="35" height="3.5" rx="1.75" fill="#cbd5e1" />
      <rect x="45" y="38" width="50" height="3.5" rx="1.75" fill="#cbd5e1" />
      <rect x="45" y="46" width="43" height="3.5" rx="1.75" fill="#cbd5e1" />
      <rect x="45" y="58" width="50" height="3.5" rx="1.75" fill="#0B2C6B" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.8s" repeatCount="indefinite" />
      </rect>
      <rect x="45" y="66" width="38" height="3.5" rx="1.75" fill="#0B2C6B" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.8s" begin="0.3s" repeatCount="indefinite" />
      </rect>
      <rect x="45" y="74" width="46" height="3.5" rx="1.75" fill="#D9A441" opacity="0.5">
        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x="45" y="86" width="50" height="3.5" rx="1.75" fill="#0B2C6B" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
      </rect>
      <rect x="45" y="94" width="40" height="3.5" rx="1.75" fill="#0B2C6B" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
      </rect>
      {/* Arrow */}
      <path d="M112 65h18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3">
        <animate attributeName="stroke-dashoffset" values="14;0" dur="1s" repeatCount="indefinite" />
      </path>
      <path d="M126 60l6 5-6 5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* AI brain circle */}
      <circle cx="152" cy="65" r="28" fill="#0B2C6B" />
      <path d="M144 65h2l3-8 4 16 3-8h2" stroke="#D9A441" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkles */}
      <circle cx="140" cy="55" r="2" fill="#D9A441">
        <animate attributeName="r" values="1;2.5;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="164" cy="57" r="1.5" fill="#fff" opacity="0.7">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function DoneIllustration() {
  return (
    <svg viewBox="0 0 160 160" fill="none" className="w-40 mx-auto" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="60" fill="#ecfdf5" />
      <circle cx="80" cy="80" r="46" fill="#d1fae5" />
      <path d="M57 80l15 15 31-31" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dashoffset" from="80" to="0" dur="0.5s" fill="freeze" />
        <animate attributeName="stroke-dasharray" from="0 80" to="80 0" dur="0.5s" fill="freeze" />
      </path>
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function StepUploadCV({ associateId, apiUrl, accessToken, onDone, onSkip, onDeleteOldCV, existingCV }: StepUploadCVProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingOldCV, setDeletingOldCV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format tidak didukung. Gunakan PDF, JPG, atau PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB.');
      return;
    }

    setError('');
    setState('uploading');
    setProgress(10);
    setStatusText('Menyiapkan upload...');

    try {
      const presignRes = await fetch(`${apiUrl}/api/files/associate/${associateId}/cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.error || 'Gagal menyiapkan upload');

      setProgress(30);
      setStatusText('Mengunggah CV...');

      const uploadRes = await fetch(presignData.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Gagal mengunggah berkas CV ke storage server');
      }

      setProgress(50);
      setStatusText('Mengonfirmasi unggahan...');

      const confirmRes = await fetch(`${apiUrl}/api/files/associate/${associateId}/cv/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileId: presignData.data.fileId }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmData.success) {
        throw new Error(confirmData.error || 'Gagal mengonfirmasi unggahan CV');
      }

      setProgress(70);
      setState('parsing');
      setStatusText('Sistem sedang membaca dan menganalisis CV...');

      const fileId = presignData.data.fileId;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const parseRes = await fetch(`${apiUrl}/api/ai/parse-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ document_id: fileId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const parseJson = await parseRes.json();
      setProgress(100);
      setState('done');

      if (parseJson.success && parseJson.data) {
        setStatusText('CV berhasil dianalisis!');
        setTimeout(() => onDone(fileId, parseJson.data), 800);
      } else {
        setStatusText('Upload berhasil. Isi profil secara manual.');
        setTimeout(() => onDone(fileId, null), 1200);
      }
    } catch (e: any) {
      const isTimeout = e instanceof DOMException && e.name === 'AbortError';
      setState('error');
      setError(isTimeout ? 'Proses timeout. CV sudah tersimpan — lanjutkan isi manual.' : 'Terjadi kesalahan saat mengunggah.');
    }
  }, [associateId, apiUrl, accessToken, onDone]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // ─── Loading / Parsing state ──────────────────────────────────────────────────

  if (state === 'uploading' || state === 'parsing') {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-4 max-w-md mx-auto">
        <ProcessingIllustration />
        
        <div className="text-center">
          <h5 className="text-sm font-bold text-slate-800 transition-all duration-300">
            {state === 'uploading' 
              ? (progress < 40 ? 'Menyiapkan berkas...' : 'Mengunggah CV Anda...') 
              : 'Sistem sedang membaca & menganalisis CV Anda...'}
          </h5>
          <p className="mt-1.5 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {state === 'uploading' 
              ? 'Mohon jangan tutup halaman ini selama pengunggahan.' 
              : 'Sistem sedang memetakan pengalaman kerja, pendidikan, dan keahlian secara otomatis.'}
          </p>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full max-w-xs mt-2">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0B2C6B] to-[#D9A441] transition-all duration-350"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
            <span>PROSES</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-4">
        <DoneIllustration />
        <div className="text-center">
          <p className="text-base font-bold text-slate-900">{statusText}</p>
          <p className="text-xs text-slate-500 mt-1">Melanjutkan ke langkah berikutnya...</p>
        </div>
      </div>
    );
  }

  // ─── Detect Existing CV Option ────────────────────────────────────────────────

  const handleDeleteOldCV = async () => {
    if (!existingCV) return;
    setDeletingOldCV(true);
    try {
      const res = await fetch(`${apiUrl}/api/files/${existingCV.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        onDeleteOldCV(); // Notify parent to clear existing CV states
        setShowUploader(true);
        setConfirmDelete(false);
      } else {
        setError('Gagal menghapus CV lama.');
      }
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setDeletingOldCV(false);
    }
  };

  if (existingCV && !showUploader) {
    if (confirmDelete) {
      return (
        <div className="space-y-5 text-center py-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900">Ganti CV Lama?</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              File <span className="font-semibold text-slate-700">{existingCV.name}</span> akan dihapus permanen dari sistem database.
            </p>
          </div>
          <div className="flex gap-2.5 justify-center max-w-xs mx-auto pt-1">
            <button
              onClick={handleDeleteOldCV}
              disabled={deletingOldCV}
              className="flex-1 rounded-xl bg-red-600 text-white py-2.5 text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {deletingOldCV ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deletingOldCV}
              className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-600 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 text-center py-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">CV Terdeteksi</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Anda telah mengunggah CV sebelumnya: <strong className="text-slate-700 font-semibold">{existingCV.name}</strong>. Anda dapat menggunakannya atau mengunggah file baru.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto pt-2">
          <button
            onClick={() => onDone(existingCV.id, null)}
            className="w-full rounded-xl bg-[#0B2C6B] text-white px-5 py-3 text-xs font-semibold hover:bg-[#0A255A] transition-all shadow-md shadow-[#0B2C6B]/15"
          >
            Gunakan CV Ini & Lanjutkan
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 px-5 py-3 text-xs font-semibold hover:bg-slate-50 transition-all"
          >
            Unggah File Baru
          </button>
        </div>
      </div>
    );
  }

  // ─── Idle / Dropzone state ────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => state !== 'error' && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all ${
          isDragging
            ? 'border-[#0B2C6B] bg-[#0B2C6B]/5'
            : state === 'error'
            ? 'border-red-200 bg-red-50/30'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />
        <UploadIllustration isDragging={isDragging} />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">
            {isDragging ? 'Lepaskan file di sini' : 'Unggah CV Anda'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Seret file ke sini, atau{' '}
            <span
              className="text-[#0B2C6B] font-semibold cursor-pointer"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              pilih dari komputer
            </span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">PDF, JPG, PNG · Maks. 10MB</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-red-700">{error}</p>
            {state === 'error' && (
              <button
                onClick={() => { setState('idle'); setError(''); }}
                className="mt-1.5 text-xs font-semibold text-red-600 underline"
              >
                Coba lagi
              </button>
            )}
          </div>
        </div>
      )}

      {/* Skip */}
      <div className="flex justify-center pt-1">
        <button
          onClick={onSkip}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors hover:underline underline-offset-2"
        >
          Lewati, isi manual
        </button>
      </div>
    </div>
  );
}
