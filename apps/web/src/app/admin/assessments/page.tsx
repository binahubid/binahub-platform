'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type Assessment = {
  id: string;
  associate_id: string;
  skill_name: string;
  assessment_type: string;
  score: number;
  max_score: number;
  status: string;
  assessor: string | null;
  feedback: string | null;
  completed_at: string | null;
  created_at: string;
  profile?: { full_name: string; email: string } | null;
};

type Associate = {
  id: string;
  email: string;
  profile?: { full_name: string } | null;
};

const typeConfig: Record<string, { label: string; bg: string; color: string }> = {
  self: { label: 'Self-Assessment', bg: 'bg-blue-50', color: 'text-blue-600' },
  peer: { label: 'Peer Review', bg: 'bg-purple-50', color: 'text-purple-600' },
  ai: { label: 'AI Analysis', bg: 'bg-amber-50', color: 'text-amber-600' },
  certification: { label: 'Certification', bg: 'bg-emerald-50', color: 'text-emerald-600' },
};

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: 'bg-slate-100', color: 'text-slate-600' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50', color: 'text-amber-600' },
  completed: { label: 'Completed', bg: 'bg-emerald-50', color: 'text-emerald-600' },
};

export default function AdminAssessmentsPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    associate_id: '',
    skill_name: '',
    assessment_type: 'self',
    score: 0,
    max_score: 100,
    status: 'pending',
    assessor: '',
    feedback: '',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [assessRes, assocRes] = await Promise.allSettled([
        fetch(`${apiUrl}/api/admin/assessments`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${apiUrl}/api/admin/associates?limit=1000`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      if (assessRes.status === 'fulfilled') {
        const d = await assessRes.value.json();
        if (d.success) setAssessments(d.data || []);
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
    setForm({ associate_id: '', skill_name: '', assessment_type: 'self', score: 0, max_score: 100, status: 'pending', assessor: '', feedback: '' });
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: Assessment) => {
    setForm({
      associate_id: a.associate_id,
      skill_name: a.skill_name,
      assessment_type: a.assessment_type,
      score: a.score,
      max_score: a.max_score,
      status: a.status,
      assessor: a.assessor || '',
      feedback: a.feedback || '',
    });
    setEditing(a);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.associate_id || !form.skill_name) {
      toast('error', 'Associate dan Skill Name wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `${apiUrl}/api/admin/assessments/${editing.id}` : `${apiUrl}/api/admin/assessments`;
      const method = editing ? 'PUT' : 'POST';
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          ...form,
          assessor: form.assessor || null,
          feedback: form.feedback || null,
        }),
      });
      const d = await resp.json();
      if (d.success) {
        toast('success', editing ? 'Assessment diperbarui' : 'Assessment dibuat');
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
    if (!confirm('Hapus assessment ini?')) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assessments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await resp.json();
      if (d.success) {
        toast('success', 'Assessment dihapus');
        await fetchData();
      } else {
        toast('error', d.error || 'Gagal menghapus');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  };

  const getAssociateName = (a: Assessment) => a.profile?.full_name || associates.find((x) => x.id === a.associate_id)?.profile?.full_name || '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Assessments</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola penilaian keahlian associate.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A]">
          + Tambah Assessment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{assessments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{assessments.filter((a) => a.status === 'completed').length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avg Score</p>
          <p className="mt-1 text-2xl font-bold text-[#0B2C6B]">
            {assessments.filter((a) => a.status === 'completed').length > 0
              ? Math.round(assessments.filter((a) => a.status === 'completed').reduce((s, a) => s + (a.score / a.max_score) * 100, 0) / assessments.filter((a) => a.status === 'completed').length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => resetForm()}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">{editing ? 'Edit Assessment' : 'Tambah Assessment'}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Associate *</label>
                <select value={form.associate_id} onChange={(e) => setForm({ ...form, associate_id: e.target.value })} disabled={!!editing}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none disabled:bg-slate-50">
                  <option value="">-- Pilih Associate --</option>
                  {associates.map((a) => <option key={a.id} value={a.id}>{a.profile?.full_name || a.email}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Skill Name *</label>
                  <input type="text" value={form.skill_name} onChange={(e) => setForm({ ...form, skill_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select value={form.assessment_type} onChange={(e) => setForm({ ...form, assessment_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none">
                    <option value="self">Self-Assessment</option>
                    <option value="peer">Peer Review</option>
                    <option value="ai">AI Analysis</option>
                    <option value="certification">Certification</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Score</label>
                  <input type="number" min={0} value={form.score} onChange={(e) => setForm({ ...form, score: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Score</label>
                  <input type="number" min={1} value={form.max_score} onChange={(e) => setForm({ ...form, max_score: parseInt(e.target.value) || 100 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none">
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assessor</label>
                <input type="text" value={form.assessor} onChange={(e) => setForm({ ...form, assessor: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Feedback</label>
                <textarea value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:outline-none" />
              </div>
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
      ) : assessments.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="mt-4 text-sm font-medium text-slate-900">Belum ada assessment</p>
          <p className="mt-1 text-xs text-slate-500">Klik &quot;Tambah Assessment&quot; untuk membuat baru.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Associate</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Skill</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {assessments.map((a) => {
                const tc = typeConfig[a.assessment_type] || typeConfig.self;
                const sc = statusConfig[a.status] || statusConfig.pending;
                const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/associates/${a.associate_id}`} className="text-sm font-medium text-slate-900 hover:text-[#0B2C6B]">
                        {getAssociateName(a)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">{a.skill_name}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tc.bg} ${tc.color}`}>{tc.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#0B2C6B] hover:bg-[#0B2C6B]/10">Edit</button>
                        <button onClick={() => handleDelete(a.id)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50">Hapus</button>
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
