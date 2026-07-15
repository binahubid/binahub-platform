import { useState, useRef } from 'react';

type Portfolio = {
  id: string;
  title: string;
  description?: string;
  link_url?: string;
};

type StepPortfolioProps = {
  portfolios: Portfolio[];
  associateId: string;
  apiUrl: string;
  accessToken: string;
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
};

export function StepPortfolio({ portfolios, associateId, apiUrl, accessToken, onRefresh, showToast }: StepPortfolioProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', linkUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken || !associateId) return;

    // Validate type
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    if (!allowed.includes(file.type)) {
      showToast('Tipe file tidak didukung. Harap unggah PDF, PNG, JPG, MP4, Word, Excel, PowerPoint, ZIP, atau Text.', 'error');
      return;
    }

    // Validate size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast('Ukuran file maksimal 50MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const presignRes = await fetch(`${apiUrl}/api/files/presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          fileName: `portfolio-${Date.now()}-${file.name}`,
          fileType: file.type,
          fileSize: file.size,
          ownerId: associateId,
          ownerType: 'associate',
          category: 'portfolio'
        }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.error || 'Gagal membuat URL unggah');

      // Upload file directly to Supabase storage
      const uploadRes = await fetch(presignData.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadRes.ok) throw new Error('Gagal mengunggah file ke storage');

      // Register file registry
      const registerRes = await fetch(`${apiUrl}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          ownerId: associateId,
          ownerType: 'associate',
          category: 'portfolio',
          path: presignData.data.path,
          originalName: file.name,
          mime: file.type,
          size: file.size,
          visibility: 'private'
        })
      });
      const registerData = await registerRes.json();
      if (!registerData.success) throw new Error(registerData.error || 'Gagal meregistrasi file');

      // Append file download/view URL to description
      const fileUrl = `${apiUrl}/api/files/${registerData.data.id}/view`;
      setForm((prev) => ({
        ...prev,
        description: prev.description 
          ? `${prev.description}\n\n[File Lampiran: ${file.name}](${fileUrl})` 
          : `[File Lampiran: ${file.name}](${fileUrl})`
      }));
      showToast('Dokumentasi portofolio berhasil diunggah!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal mengunggah file portofolio', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      // Backend mapping projectUrl & linkUrl
      await fetch(`${apiUrl}/api/associate/portfolios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          projectUrl: form.linkUrl
        }),
      });
      setForm({ title: '', description: '', linkUrl: '' });
      setAdding(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data portofolio ini? Berkas lampiran di storage juga akan dihapus secara permanen.')) return;
    try {
      await fetch(`${apiUrl}/api/associate/portfolios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast('Portofolio berhasil dihapus', 'success');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4"
        className="hidden"
      />
      {portfolios.length === 0 && !adding ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-900">Belum ada portofolio</p>
          <p className="mt-1 text-xs text-slate-500">Tambahkan link portofolio hasil karya terbaik Anda</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-4 rounded-xl bg-[#0B2C6B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A255A] transition-colors"
          >
            + Tambah Portofolio
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolios.map((port) => (
              <div key={port.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={port.title}>{port.title}</h4>
                    <button
                      onClick={() => handleDelete(port.id)}
                      className="text-slate-400 hover:text-rose-600 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {port.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{port.description}</p>
                  )}
                </div>
                {port.link_url && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
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
            ))}
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-bold text-slate-500 hover:border-[#0B2C6B] hover:text-[#0B2C6B] transition-colors"
            >
              + Tambah Portofolio Lain
            </button>
          )}
        </>
      )}

      {adding && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Form Portofolio Baru</h3>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Judul Portofolio / Proyek"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Deskripsi Portofolio (Opsional)"
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none resize-none"
          />
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-semibold text-slate-500">Unggah Gambar / Dokumen Pendukung (PDF/PNG/JPG/MP4)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Mengunggah...' : 'Pilih Berkas'}
              </button>
              <span className="text-xs text-slate-500 truncate max-w-xs">
                {uploading ? 'Mengunggah file...' : 'Pilih screenshot/testimoni/foto proyek'}
              </span>
            </div>
          </div>
          <input
            type="text"
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            placeholder="Tautan / Link Portofolio / Link Sosial Media Proyek (misal: GitHub, Behance, LinkedIn Post)"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setAdding(false);
                setForm({ title: '', description: '', linkUrl: '' });
              }}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-lg bg-[#0B2C6B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0A255A] transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
