'use client';

import { useState, useRef } from 'react';
import { Document } from '../types';

type StepDocumentsProps = {
  documents: Document[];
  apiUrl: string;
  accessToken: string;
  onRefresh: () => void;
  onParseCV: (docId: string) => void;
  parsingCV: boolean;
};

export function StepDocuments({ documents, apiUrl, accessToken, onRefresh, onParseCV, parsingCV }: StepDocumentsProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cvDoc = documents.find((d) => d.type === 'cv');
  const otherDocs = documents.filter((d) => d.type !== 'cv');

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
      // Step 1: Get presigned URL
      const presignRes = await fetch(`${apiUrl}/api/files/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      const presignData = await presignRes.json();

      if (!presignData.success) {
        alert('Gagal mendapatkan URL upload');
        return;
      }

      setUploadProgress(30);

      // Step 2: Upload to storage
      await fetch(presignData.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setUploadProgress(60);

      // Step 3: Register file record
      const registerRes = await fetch(`${apiUrl}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storagePath: presignData.data.storagePath,
          documentType: 'cv',
        }),
      });
      const registerData = await registerRes.json();

      setUploadProgress(80);

      if (registerData.success) {
        // Step 4: Parse CV with AI
        if (registerData.data?.id) {
          onParseCV(registerData.data.id);
        }
        await onRefresh();
      } else {
        alert('Gagal menyimpan file');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
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
      {/* CV Section */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-4">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Curriculum Vitae (CV)
        </h4>

        {cvDoc ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-2">
                <a
                  href={cvDoc.storage_path?.startsWith('http') ? cvDoc.storage_path : `${apiUrl}/api/files/${cvDoc.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Unduh
                </a>
                <button
                  onClick={() => onParseCV(cvDoc.id)}
                  disabled={parsingCV}
                  className="rounded-lg bg-[#0B2C6B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A255A] disabled:opacity-50"
                >
                  {parsingCV ? 'Memproses...' : 'Re-parse AI'}
                </button>
                <button
                  onClick={() => handleDelete(cvDoc.id, cvDoc.file_name)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-500"
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

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0B2C6B] to-[#D9A441] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 text-center">
              {uploadProgress < 30 ? 'Menyiapkan upload...' : uploadProgress < 60 ? 'Mengupload file...' : uploadProgress < 80 ? 'Menyimpan...' : 'Memproses AI...'}
            </p>
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
                  <button onClick={() => handleDelete(doc.id, doc.file_name)} className="rounded-lg p-1 text-red-400 hover:text-red-500">
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
