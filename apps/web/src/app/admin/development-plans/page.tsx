'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type DevPlan = {
  id: string;
  associate_id: string;
  current_score: number;
  target_score: number;
  recommended_actions: Array<{
    id: string;
    type: 'course' | 'certification' | 'project' | 'skill';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'not_started' | 'in_progress' | 'completed';
  }>;
  learning_paths: Array<{
    id: string;
    skill_name: string;
    current_level: number;
    target_level: number;
    steps: Array<{ id: string; title: string; type: string; completed: boolean }>;
  }>;
  created_at: string;
  profile?: { full_name: string; email: string } | null;
};

type Associate = {
  id: string;
  email: string;
  profile?: { full_name: string } | null;
};

export default function AdminDevPlansPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<DevPlan[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DevPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    associate_id: '',
    current_score: 0,
    target_score: 80,
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [plansRes, assocRes] = await Promise.allSettled([
        fetch(`${apiUrl}/api/admin/development-plans`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${apiUrl}/api/admin/associates?limit=1000`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      if (plansRes.status === 'fulfilled') {
        const d = await plansRes.value.json();
        if (d.success) setPlans(d.data || []);
      }
      if (assocRes.status === 'fulfilled') {
        const d = await assocRes.value.json();
        if (d.success) setAssociates(d.data || []);
      }
    } catch {
      toast('error', 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ associate_id: '', current_score: 0, target_score: 80 });
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (p: DevPlan) => {
    setForm({ associate_id: p.associate_id, current_score: p.current_score, target_score: p.target_score });
    setEditing(p);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.associate_id) {
      toast('error', 'Associate wajib dipilih');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `${apiUrl}/api/admin/development-plans/${editing.id}` : `${apiUrl}/api/admin/development-plans`;
      const method = editing ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        associate_id: form.associate_id,
        current_score: form.current_score,
        target_score: form.target_score,
      };
      if (editing) {
        body.recommended_actions = editing.recommended_actions;
        body.learning_paths = editing.learning_paths;
      }
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const d = await resp.json();
      if (d.success) {
        toast('success', editing ? 'Development plan diperbarui' : 'Development plan dibuat');
        resetForm();
        await fetchData();
      } else {
        toast('error', d.error || 'Gagal menyimpan');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus development plan ini?')) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/development-plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await resp.json();
      if (d.success) {
        toast('success', 'Development plan dihapus');
        await fetchData();
      } else {
        toast('error', d.error || 'Gagal menghapus');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  };

  const getName = (p: DevPlan) => p.profile?.full_name || associates.find((x) => x.id === p.associate_id)?.profile?.full_name || '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Development Plans</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola rencana pengembangan skill associate.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A]">
          + Tambah Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Plans</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{plans.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avg Current Score</p>
          <p className="mt-1 text-2xl font-bold text-[#0B2C6B]">
            {plans.length > 0 ? Math.round(plans.reduce((s, p) => s + p.current_score, 0) / plans.length) : 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avg Target Score</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {plans.length > 0 ? Math.round(plans.reduce((s, p) => s + p.target_score, 0) / plans.length) : 0}
          </p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => resetForm()}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">{editing ? 'Edit Development Plan' : 'Tambah Development Plan'}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Associate *</label>
                <select value={form.associate_id} onChange={(e) => setForm({ ...form, associate_id: e.target.value })} disabled={!!editing}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none disabled:bg-slate-50">
                  <option value="">-- Pilih Associate --</option>
                  {associates.map((a) => <option key={a.id} value={a.id}>{a.profile?.full_name || a.email}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Current Score</label>
                  <input type="number" min={0} max={100} value={form.current_score} onChange={(e) => setForm({ ...form, current_score: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Target Score</label>
                  <input type="number" min={0} max={100} value={form.target_score} onChange={(e) => setForm({ ...form, target_score: parseInt(e.target.value) || 80 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">Actions & learning paths dapat dikelola setelah plan dibuat.</p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A255A] disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="mt-4 text-sm font-medium text-slate-900">Belum ada development plan</p>
          <p className="mt-1 text-xs text-slate-500">Klik &quot;Tambah Plan&quot; untuk membuat baru.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Associate</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Current</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Target</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Progress</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Paths</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {plans.map((p) => {
                const gap = p.target_score - p.current_score;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/associates/${p.associate_id}`} className="text-sm font-medium text-slate-900 hover:text-[#0B2C6B]">
                        {getName(p)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900">{p.current_score}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-amber-600">{p.target_score}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: `${Math.min(p.current_score, 100)}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500">{gap > 0 ? `Gap: ${gap}` : 'Terpenuhi'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{p.recommended_actions.length}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{p.learning_paths.length}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#0B2C6B] hover:bg-[#0B2C6B]/10">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50">Hapus</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
