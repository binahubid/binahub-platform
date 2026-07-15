import { useState, useRef } from 'react';

type Certification = {
  id: string;
  name: string;
  issuing_organization: string;
  credential_id?: string;
  credential_url?: string;
};

type StepCertificationsProps = {
  certifications: Certification[];
  associateId: string;
  apiUrl: string;
  accessToken: string;
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
};

export function StepCertifications({ certifications, associateId, apiUrl, accessToken, onRefresh, showToast }: StepCertificationsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', issuingOrganization: '', credentialId: '', credentialUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Certification>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken || !associateId) return;

    // Validate type
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
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
      showToast('Tipe file tidak didukung. Harap unggah PDF, PNG, JPG, Word, Excel, PowerPoint, ZIP, atau Text.', 'error');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const presignRes = await fetch(`${apiUrl}/api/files/presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          fileName: `certificate-${Date.now()}-${file.name}`,
          fileType: file.type,
          fileSize: file.size,
          ownerId: associateId,
          ownerType: 'associate',
          category: 'certificate'
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
          category: 'certificate',
          path: presignData.data.path,
          originalName: file.name,
          mime: file.type,
          size: file.size,
          visibility: 'private'
        })
      });
      const registerData = await registerRes.json();
      if (!registerData.success) throw new Error(registerData.error || 'Gagal meregistrasi file');

      // Save the registered download/view path or file registry path
      const filePath = `/api/files/${registerData.data.id}/view`;
      if (editingId) {
        setEditForm((prev) => ({ ...prev, credential_url: filePath }));
      } else {
        setForm((prev) => ({ ...prev, credentialUrl: filePath }));
      }
      showToast('Sertifikat berhasil diunggah!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal mengunggah file sertifikat', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.issuingOrganization) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/associate/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: form.name,
          issuer: form.issuingOrganization,
          credentialId: form.credentialId,
          credentialUrl: form.credentialUrl
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal menyimpan sertifikasi', 'error');
        return;
      }
      setForm({ name: '', issuingOrganization: '', credentialId: '', credentialUrl: '' });
      setAdding(false);
      onRefresh();
      showToast('Sertifikasi berhasil ditambahkan', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal menghubungi server', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data sertifikasi ini? Berkas lampiran di storage juga akan dihapus secara permanen.')) return;
    try {
      await fetch(`${apiUrl}/api/associate/certifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast('Sertifikasi berhasil dihapus', 'success');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/associate/certifications/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: editForm.name,
          issuer: editForm.issuing_organization,
          credentialId: editForm.credential_id,
          credentialUrl: editForm.credential_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal memperbarui sertifikasi', 'error');
        return;
      }
      setEditingId(null);
      onRefresh();
      showToast('Sertifikasi berhasil diperbarui', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal menghubungi server', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
      />
      {certifications.length === 0 && !adding ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-900">Belum ada sertifikasi</p>
          <p className="mt-1 text-xs text-slate-500">Tambahkan sertifikasi profesional Anda</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-4 rounded-xl bg-[#0B2C6B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A255A] transition-colors"
          >
            + Tambah Sertifikasi
          </button>
        </div>
      ) : (
        <>
          {certifications.map((cert) => (
            <div key={cert.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
              {editingId === cert.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nama Sertifikat"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editForm.issuing_organization || ''}
                    onChange={(e) => setEditForm({ ...editForm, issuing_organization: e.target.value })}
                    placeholder="Organisasi Penerbit"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editForm.credential_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, credential_id: e.target.value })}
                    placeholder="Kredensial ID (Opsional)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
                  />
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-slate-500">Berkas Sertifikat (PDF / JPG / PNG)</label>
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
                        {editForm.credential_url ? 'Sertifikat Terlampir ✓' : 'Belum ada file terlampir'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="rounded-lg bg-[#0B2C6B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0A255A] transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{cert.name}</h4>
                    <p className="text-xs text-slate-600 font-medium">{cert.issuing_organization}</p>
                    {cert.credential_id && (
                      <p className="text-[10px] text-slate-400 mt-1">ID Kredensial: {cert.credential_id}</p>
                    )}
                    {cert.credential_url && (
                      <div className="mt-3">
                        {/\.(jpg|jpeg|png|webp)/i.test(cert.credential_url) ? (
                          <div className="relative group max-w-xs rounded-lg overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-50">
                            <img src={cert.credential_url} alt={cert.name} className="w-full h-full object-cover" />
                            <a
                              href={cert.credential_url}
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
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-[#0B2C6B] hover:bg-slate-100 transition-colors"
                          >
                            <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate max-w-[200px] text-[10px]">Lihat Dokumen Sertifikat</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(cert.id);
                        setEditForm(cert);
                      }}
                      className="text-slate-400 hover:text-[#0B2C6B]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-bold text-slate-500 hover:border-[#0B2C6B] hover:text-[#0B2C6B] transition-colors"
            >
              + Tambah Sertifikasi Lain
            </button>
          )}
        </>
      )}

      {adding && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Form Sertifikasi Baru</h3>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama Sertifikat"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
          />
          <input
            type="text"
            value={form.issuingOrganization}
            onChange={(e) => setForm({ ...form, issuingOrganization: e.target.value })}
            placeholder="Organisasi Penerbit"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
          />
          <input
            type="text"
            value={form.credentialId}
            onChange={(e) => setForm({ ...form, credentialId: e.target.value })}
            placeholder="Kredensial ID (Opsional)"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none"
          />
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-semibold text-slate-500">Berkas Sertifikat (PDF / JPG / PNG)</label>
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
                {form.credentialUrl ? 'Sertifikat Terlampir ✓' : 'Belum ada file terlampir'}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setAdding(false);
                setForm({ name: '', issuingOrganization: '', credentialId: '', credentialUrl: '' });
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
