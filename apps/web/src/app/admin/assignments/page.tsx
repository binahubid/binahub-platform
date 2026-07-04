'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type Assignment = {
  id: string;
  title: string;
  client_name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  needed_roles: string[];
  needed_count: number;
  created_at: string;
};

const EMPTY_FORM = {
  title: '',
  client_name: '',
  description: '',
  start_date: '',
  end_date: '',
  needed_roles: '',
  needed_count: '0',
};

type FormType = typeof EMPTY_FORM;

function FormFields({ form, setForm }: { form: FormType; setForm: (f: FormType) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Judul *</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Klien *</label>
        <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Mulai</label>
        <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Selesai</label>
        <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Role yang Dibutuhkan (koma)</label>
        <input value={form.needed_roles} onChange={(e) => setForm({ ...form, needed_roles: e.target.value })} placeholder="Trainer, Coach, Facilitator" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah Dibutuhkan</label>
        <input type="number" value={form.needed_count} onChange={(e) => setForm({ ...form, needed_count: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const fetchAssignments = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments`, { headers });
      const d = await resp.json();
      if (d?.success) setAssignments(d.data || []);
      else toast('error', d?.error || 'Gagal memuat data');
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken, apiUrl]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const handleCreate = async () => {
    if (!form.title || !form.client_name) {
      toast('warning', 'Judul dan Klien wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: form.title,
          client_name: form.client_name,
          description: form.description || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          needed_roles: form.needed_roles ? form.needed_roles.split(',').map((s) => s.trim()).filter(Boolean) : [],
          needed_count: parseInt(form.needed_count) || 0,
        }),
      });
      const d = await resp.json();
      if (d?.success) {
        toast('success', 'Assignment berhasil dibuat');
        setShowForm(false);
        setForm(EMPTY_FORM);
        await fetchAssignments();
      } else {
        toast('error', d?.error || 'Gagal membuat assignment');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await resp.json();
      if (d?.success) {
        toast('success', 'Status assignment diperbarui');
        await fetchAssignments();
      } else {
        toast('error', d?.error || 'Gagal mengubah status');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus assignment ini?')) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}`, { method: 'DELETE', headers });
      const d = await resp.json();
      if (d?.success) {
        toast('success', 'Assignment dihapus');
        await fetchAssignments();
      } else {
        toast('error', d?.error || 'Gagal menghapus');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  };

  const startEdit = (a: Assignment) => {
    setEditingId(a.id);
    setEditForm({
      title: a.title,
      client_name: a.client_name,
      description: a.description || '',
      start_date: a.start_date || '',
      end_date: a.end_date || '',
      needed_roles: a.needed_roles.join(', '),
      needed_count: String(a.needed_count),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${editingId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          title: editForm.title,
          client_name: editForm.client_name,
          description: editForm.description || null,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          needed_roles: editForm.needed_roles ? editForm.needed_roles.split(',').map((s) => s.trim()).filter(Boolean) : [],
          needed_count: parseInt(editForm.needed_count) || 0,
        }),
      });
      const d = await resp.json();
      if (d?.success) {
        toast('success', 'Assignment diperbarui');
        setEditingId(null);
        await fetchAssignments();
      } else {
        toast('error', d?.error || 'Gagal memperbarui');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-emerald-50 text-emerald-700';
      case 'draft': return 'bg-slate-100 text-slate-600';
      case 'completed': return 'bg-blue-50 text-blue-700';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const statusLabel: Record<string, string> = {
    draft: 'Draft',
    active: 'Aktif',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  const renderStatusButtons = (a: Assignment) => {
    const buttons: Array<{ label: string; status: string; cls: string }> = [];
    if (a.status === 'draft') {
      buttons.push({ label: 'Aktifkan', status: 'active', cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' });
      buttons.push({ label: 'Batalkan', status: 'cancelled', cls: 'bg-red-50 text-red-600 hover:bg-red-100' });
    }
    if (a.status === 'active') {
      buttons.push({ label: 'Selesai', status: 'completed', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100' });
      buttons.push({ label: 'Batalkan', status: 'cancelled', cls: 'bg-red-50 text-red-600 hover:bg-red-100' });
    }
    if (a.status === 'completed' || a.status === 'cancelled') {
      buttons.push({ label: 'Reaktivasi', status: 'draft', cls: 'bg-slate-100 text-slate-600 hover:bg-slate-200' });
    }
    return buttons;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Assignments</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola semua project dan penugasan BinaHub.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="flex items-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Assignment
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Assignment Baru</h3>
          <FormFields form={form} setForm={setForm} />
          <div className="mt-4 flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A255A] disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Batal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-4 text-sm font-medium text-slate-900">Belum ada assignment</p>
          <p className="mt-1 text-xs text-slate-500">Klik &quot;Buat Assignment&quot; untuk menambah baru</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {assignments.map((a) => (
              <div key={a.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                {editingId === a.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Edit Assignment</h3>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <FormFields form={editForm} setForm={setEditForm} />
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} disabled={saving} className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A255A] disabled:opacity-50">
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(a.status)}`}>
                          {statusLabel[a.status] || a.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{a.client_name}</p>
                      {a.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{a.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                        {a.start_date && <span>Mulai: {new Date(a.start_date).toLocaleDateString('id-ID')}</span>}
                        {a.end_date && <span>Selesai: {new Date(a.end_date).toLocaleDateString('id-ID')}</span>}
                        {a.needed_roles.length > 0 && <span>Role: {a.needed_roles.join(', ')}</span>}
                        {a.needed_count > 0 && <span>Dibutuhkan: {a.needed_count} orang</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/admin/assignments/${a.id}`} className="rounded-lg bg-[#0B2C6B] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#0A255A]">Lihat Tim</Link>
                      {renderStatusButtons(a).map((btn) => (
                        <button
                          key={btn.status}
                          onClick={() => handleStatusChange(a.id, btn.status)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${btn.cls}`}
                        >
                          {btn.label}
                        </button>
                      ))}
                      <button
                        onClick={() => startEdit(a)}
                        className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
