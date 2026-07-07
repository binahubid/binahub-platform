'use client';

import { useState } from 'react';
import { Experience } from '../types';

type StepExperienceProps = {
  experiences: Experience[];
  apiUrl: string;
  accessToken: string;
  onRefresh: () => void;
};

export function StepExperience({ experiences, apiUrl, accessToken, onRefresh }: StepExperienceProps) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ organization: '', position: '', industry: 'Umum', startDate: '', endDate: '', isCurrent: false, description: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Experience>>({});

  const handleAdd = async () => {
    if (!form.organization || !form.position) return;
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/associate/experiences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ...form, industry: form.industry || 'Umum' }),
      });
      setForm({ organization: '', position: '', industry: 'Umum', startDate: '', endDate: '', isCurrent: false, description: '' });
      setAdding(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengalaman ini?')) return;
    try {
      await fetch(`${apiUrl}/api/associate/experiences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/associate/experiences/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Experience List */}
      {experiences.length === 0 && !adding ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-900">Belum ada pengalaman</p>
          <p className="mt-1 text-xs text-slate-500">Tambahkan pengalaman kerja Anda</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-4 rounded-xl bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A255A] transition-colors"
          >
            + Tambah Pengalaman
          </button>
        </div>
      ) : (
        <>
          {experiences.map((exp) => (
            <div key={exp.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
              {editingId === exp.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.organization || ''}
                    onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                    placeholder="Perusahaan"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editForm.position || ''}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    placeholder="Posisi"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={saving} className="rounded-lg bg-[#0B2C6B] px-3 py-1.5 text-xs font-semibold text-white">
                      {saving ? '...' : 'Simpan'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{exp.position}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{exp.organization}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {exp.industry && <span className="rounded bg-slate-100 px-2 py-0.5">{exp.industry}</span>}
                      <span>{exp.start_date} — {exp.is_current ? 'Sekarang' : exp.end_date || '-'}</span>
                    </div>
                    {exp.description && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{exp.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => { setEditingId(exp.id); setEditForm(exp); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0B2C6B]"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="w-full rounded-xl border-2 border-dashed border-slate-200 p-4 text-sm font-medium text-slate-500 hover:border-[#0B2C6B]/30 hover:text-[#0B2C6B] transition-colors"
            >
              + Tambah Pengalaman Lain
            </button>
          )}
        </>
      )}

      {/* Add Form */}
      {adding && (
        <div className="rounded-xl border border-[#0B2C6B]/20 bg-[#0B2C6B]/5 p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Tambah Pengalaman Baru</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="Nama Perusahaan *" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Posisi / Jabatan *" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="text" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Industri" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="month" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="month" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} disabled={form.isCurrent} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50" />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: '' })} className="rounded border-slate-300 text-[#0B2C6B] focus:ring-[#0B2C6B]" />
              Masih bekerja di sini
            </label>
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi pekerjaan (opsional)" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !form.organization || !form.position} className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setAdding(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
