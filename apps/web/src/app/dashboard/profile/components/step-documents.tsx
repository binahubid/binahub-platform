'use client';

import { useState, useRef } from 'react';
import { Document } from '../types';

type StepDocumentsProps = {
  associateId: string;
  documents: Document[];
  apiUrl: string;
  accessToken: string;
  onRefresh: () => void;
  onParseCV: (docId: string) => void;
  parsingCV: boolean;
};

function ProcessingIllustration() {
  return (
    <svg viewBox="0 0 200 160" fill="none" className="w-full max-w-[200px] mx-auto mb-2" xmlns="http://www.w3.org/2000/svg">
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
      {/* Brain circle */}
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

export function StepDocuments({ associateId, documents, apiUrl, accessToken, onRefresh, onParseCV, parsingCV }: StepDocumentsProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cvDoc = documents.find((d) => d.type === 'cv');
  const otherDocs = documents.filter((d) => d.type !== 'cv');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Format file tidak didukung. Gunakan PDF, JPG, atau PNG.');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file maksimal 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL & Register file records in one call
      const presignRes = await fetch(`${apiUrl}/api/files/associate/${associateId}/cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      const presignData = await presignRes.json();

      if (!presignData.success) {
        alert(presignData.error || 'Gagal menyiapkan upload CV');
        return;
      }

      setUploadProgress(40);

      // Step 2: Upload to storage
      await fetch(presignData.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setUploadProgress(70);

      // Step 3: Trigger CV parsing with AI directly using the registered file ID
      if (presignData.data?.fileId) {
        onParseCV(presignData.data.fileId);
      }
      
      setUploadProgress(100);
      await onRefresh();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!cvDoc) return;
    setDeleting(true);
    setConfirmDelete(false);
    try {
      const res = await fetch(`${apiUrl}/api/files/${cvDoc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await onRefresh();
      } else {
        alert(`Gagal menghapus dokumen: ${json.error || 'Server error'}`);
      }
    } catch (e: any) {
      alert(`Terjadi kesalahan koneksi: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleOtherDelete = async (docId: string, docName: string) => {
    if (!confirm(`Hapus dokumen "${docName}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`${apiUrl}/api/files/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirm Delete CV Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 m-4 animate-scaleUp">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 mb-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-center text-slate-900 mb-1.5">Hapus Dokumen CV?</h3>
            <p className="text-xs text-center text-slate-500 mb-5 leading-relaxed">
              Dokumen CV saat ini <span className="font-semibold text-slate-700">({cvDoc?.file_name})</span> akan dihapus permanen dari sistem untuk mengunggah CV yang baru.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 text-white py-2.5 text-xs font-semibold hover:bg-red-700 transition-all shadow-md shadow-red-600/10 disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-650 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV Section */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-4">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Curriculum Vitae (CV)
        </h4>

        {cvDoc ? (
          <div className="rounded-xl border border-emerald-250 bg-emerald-50/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{cvDoc.file_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(cvDoc.created_at).toLocaleDateString('id-ID')} — {(cvDoc.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={cvDoc.storage_path?.startsWith('http') ? cvDoc.storage_path : `${apiUrl}/api/files/${cvDoc.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Unduh
                </a>
                <button
                  onClick={() => onParseCV(cvDoc.id)}
                  disabled={parsingCV}
                  className="rounded-lg bg-[#0B2C6B]/10 border border-[#0B2C6B]/25 px-3 py-1.5 text-xs font-bold text-[#0B2C6B] hover:bg-[#0B2C6B]/20 transition-all disabled:opacity-50"
                >
                  {parsingCV ? 'Memproses...' : 'Re-parse AI'}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-[#0B2C6B]/30 transition-colors">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-900">Upload CV Anda</p>
            <p className="mt-1 text-xs text-slate-500">PDF, JPG, atau PNG (maks. 10MB)</p>
            <p className="mt-1 text-xs text-[#0B2C6B] font-medium">AI akan menganalisis CV Anda secara otomatis</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploading ? 'Mengupload...' : 'Pilih File'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Upload & Parsing Illustration Progress */}
        {(uploading || parsingCV) && (
          <div className="flex flex-col items-center justify-center py-6 gap-4 max-w-md mx-auto">
            <ProcessingIllustration />
            
            <div className="text-center">
              <h5 className="text-sm font-bold text-slate-800 transition-all duration-300">
                {uploading 
                  ? (uploadProgress < 40 ? 'Menyiapkan berkas...' : 'Mengunggah CV Anda...') 
                  : 'Sistem sedang membaca & menganalisis CV Anda...'}
              </h5>
              <p className="mt-1.5 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                {uploading 
                  ? 'Mohon jangan tutup halaman ini selama pengunggahan.' 
                  : 'Sistem sedang memetakan pengalaman kerja, pendidikan, dan keahlian secara otomatis.'}
              </p>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full max-w-xs mt-2">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0B2C6B] to-[#D9A441] transition-all duration-350"
                  style={{ width: uploading ? `${uploadProgress}%` : '85%' }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
                <span>PROSES</span>
                <span>{uploading ? `${uploadProgress}%` : '85%'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Other Documents */}
      {otherDocs.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-4">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Dokumen Lainnya
          </h4>
          <div className="space-y-2">
            {otherDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.file_name}</p>
                    <p className="text-xs text-slate-500">{(doc.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={doc.storage_path?.startsWith('http') ? doc.storage_path : `${apiUrl}/api/files/${doc.id}/download`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#0B2C6B] hover:underline">
                    Unduh
                  </a>
                  <button onClick={() => handleOtherDelete(doc.id, doc.file_name)} className="rounded-lg p-1 text-red-400 hover:text-red-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Tips */}
      <div className="rounded-xl bg-slate-50 p-4">
        <h5 className="text-xs font-bold text-slate-700 mb-2">Tips Upload CV</h5>
        <ul className="space-y-1.5 text-xs text-slate-500">
          <li className="flex items-start gap-2">
            <svg className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Gunakan format PDF untuk hasil terbaik
          </li>
          <li className="flex items-start gap-2">
            <svg className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Pastikan teks dalam CV terbaca jelas
          </li>
          <li className="flex items-start gap-2">
            <svg className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            AI akan otomatis mengisi profil Anda
          </li>
        </ul>
      </div>
    </div>
  );
}
