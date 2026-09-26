'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  mandays?: number;
  compensation?: string | null;
  created_at: string;
  source_system?: 'ams' | 'app-binahub';
  integration_status?: 'not_linked' | 'pending' | 'synced' | 'failed';
  external_module_key?: string | null;
  external_program_id?: string | null;
};

type AppProgramModule = {
  key: 'tbos' | 'lep';
  label: string;
  defaultRole: string;
  workspaceUrl: string;
};

type AppProgram = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  modules: AppProgramModule[];
};

const EMPTY_FORM = {
  title: '',
  client_name: '',
  description: '',
  start_date: '',
  end_date: '',
  needed_roles: [] as string[],
  needed_count: '1',
  mandays: '0',
  compensation: '',
};

type FormType = typeof EMPTY_FORM;

const ROLE_OPTIONS = [
  'Fasilitator T-BOS', 'Pembicara LEP', 'Trainer', 'Facilitator', 'Coach', 'Mentor', 'Consultant', 'Assessor', 'Speaker',
  'Game Master', 'Tour Leader', 'Project Manager', 'EO', 'MC', 
  'Photographer', 'Videographer', 'Affiliate Marketer', 'AI Consultant'
];

function FormFields({ form, setForm, lockIdentity = false }: { form: FormType; setForm: (f: FormType) => void; lockIdentity?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nama Proyek *</label>
        <input disabled={lockIdentity} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Klien *</label>
        <input disabled={lockIdentity} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600" />
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
      
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-2">Role yang Dibutuhkan *</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-lg bg-slate-50/50">
          {ROLE_OPTIONS.map((role) => {
            const isChecked = form.needed_roles.includes(role);
            return (
              <label key={role} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...form.needed_roles, role]
                      : form.needed_roles.filter((r) => r !== role);
                    setForm({ ...form, needed_roles: next });
                  }}
                  className="rounded text-[#0B2C6B] focus:ring-[#0B2C6B]"
                />
                {role}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah Associate Dibutuhkan *</label>
        <input type="number" min="1" max="10000" value={form.needed_count} onChange={(e) => setForm({ ...form, needed_count: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Durasi (Mandays) *</label>
        <input type="number" min="0" value={form.mandays} onChange={(e) => setForm({ ...form, mandays: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1">Kompensasi *</label>
        <input value={form.compensation} onChange={(e) => setForm({ ...form, compensation: e.target.value })} placeholder="Contoh: Rp 5.000.000 / Proyek" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none" />
      </div>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormType>({ ...EMPTY_FORM, needed_roles: [] });
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormType>({ ...EMPTY_FORM, needed_roles: [] });
  const [assignmentMode, setAssignmentMode] = useState<'program' | 'standalone'>('program');
  const [appPrograms, setAppPrograms] = useState<AppProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedModuleKey, setSelectedModuleKey] = useState<'tbos' | 'lep' | ''>('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = useMemo(() => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }), [accessToken]);

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
  }, [user, accessToken, apiUrl, headers, toast]);

  const fetchAppPrograms = useCallback(async () => {
    if (!user || !accessToken) return;
    setLoadingPrograms(true);
    try {
      const response = await fetch(`${apiUrl}/api/admin/app-programs`, { headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        toast('error', payload?.error || 'Program APP belum dapat dimuat');
        return;
      }
      setAppPrograms(payload.data || []);
    } catch {
      toast('error', 'Gagal terhubung ke katalog program APP');
    } finally {
      setLoadingPrograms(false);
    }
  }, [user, accessToken, apiUrl, headers, toast]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  useEffect(() => {
    if (showForm && assignmentMode === 'program' && appPrograms.length === 0) void fetchAppPrograms();
  }, [showForm, assignmentMode, appPrograms.length, fetchAppPrograms]);

  const chooseModule = (program: AppProgram, programModule: AppProgramModule) => {
    setSelectedModuleKey(programModule.key);
    setForm((current) => ({
      ...current,
      title: program.title,
      client_name: program.clientName,
      start_date: program.startDate || '',
      end_date: program.endDate || '',
      needed_roles: [programModule.defaultRole],
    }));
  };

  const chooseProgram = (programId: string) => {
    setSelectedProgramId(programId);
    const program = appPrograms.find((item) => item.id === programId);
    if (!program) {
      setSelectedModuleKey('');
      return;
    }
    const firstModule = program.modules[0];
    if (firstModule) chooseModule(program, firstModule);
  };

  const resetCreateForm = () => {
    setForm({ ...EMPTY_FORM, needed_roles: [] });
    setSelectedProgramId('');
    setSelectedModuleKey('');
    setAssignmentMode('program');
  };

  const handleCreate = async () => {
    if (assignmentMode === 'program' && (!selectedProgramId || !selectedModuleKey)) {
      toast('warning', 'Pilih program dan modul yang akan ditugaskan');
      return;
    }
    if (!form.title || !form.client_name) {
      toast('warning', 'Nama Proyek dan Klien wajib diisi');
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
          needed_roles: form.needed_roles,
          needed_count: Math.max(1, parseInt(form.needed_count, 10) || 1),
          mandays: parseInt(form.mandays) || 0,
          compensation: form.compensation || null,
          app_program_id: assignmentMode === 'program' ? selectedProgramId : undefined,
          app_module_key: assignmentMode === 'program' ? selectedModuleKey : undefined,
        }),
      });
      const d = await resp.json();
      if (d?.success) {
        toast(d.duplicate ? 'warning' : 'success', d.message || (assignmentMode === 'program'
          ? 'Assignment program siap. Pilih kandidat terbaik dengan rekomendasi AI.'
          : 'Assignment berhasil dibuat'));
        setShowForm(false);
        resetCreateForm();
        if (d.data?.id) router.push(`/admin/assignments/${d.data.id}`);
        else await fetchAssignments();
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
        toast('success', 'Assignment deleted');
        await fetchAssignments();
      } else {
        toast('error', d?.error || 'Gagal menghapus');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  };

  const retryAppSync = async (id: string) => {
    setSyncingId(id);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/sync-app`, {
        method: 'POST',
        headers,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        toast('error', data?.error || 'Sinkronisasi APP belum berhasil');
      } else {
        toast('success', 'Assignment berhasil disinkronkan ke APP');
      }
      await fetchAssignments();
    } catch {
      toast('error', 'Gagal terhubung ke layanan sinkronisasi');
    } finally {
      setSyncingId(null);
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
      needed_roles: a.needed_roles || [],
      needed_count: String(a.needed_count),
      mandays: String(a.mandays || 0),
      compensation: a.compensation || '',
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
          needed_roles: editForm.needed_roles,
          needed_count: Math.max(1, parseInt(editForm.needed_count, 10) || 1),
          mandays: parseInt(editForm.mandays) || 0,
          compensation: editForm.compensation || null,
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
    return buttons;
  };

  const selectedProgram = appPrograms.find((program) => program.id === selectedProgramId) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D9A441]">Talent Operations</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">Assignments</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola semua project dan penugasan BinaHub.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/20 transition-all hover:from-[#0A255A] hover:to-[#071A33] hover:shadow-xl hover:shadow-[#0B2C6B]/30">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Assignment
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-900">Assignment Baru</h3>
            <p className="mt-1 text-xs text-slate-500">Hubungkan associate ke program BinaHub, atau buat pekerjaan mandiri yang tidak memerlukan akses APP.</p>
          </div>

          <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Jenis assignment">
            <button
              type="button"
              onClick={() => setAssignmentMode('program')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${assignmentMode === 'program' ? 'bg-white text-[#0B2C6B] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Program BinaHub
            </button>
            <button
              type="button"
              onClick={() => {
                setAssignmentMode('standalone');
                setSelectedProgramId('');
                setSelectedModuleKey('');
                setForm({ ...EMPTY_FORM, needed_roles: [] });
              }}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${assignmentMode === 'standalone' ? 'bg-white text-[#0B2C6B] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Assignment mandiri
            </button>
          </div>

          {assignmentMode === 'program' && (
            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Program APP *</label>
                  <select
                    value={selectedProgramId}
                    onChange={(event) => chooseProgram(event.target.value)}
                    disabled={loadingPrograms}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] disabled:cursor-wait disabled:text-slate-400"
                  >
                    <option value="">{loadingPrograms ? 'Memuat program...' : 'Pilih program aktif'}</option>
                    {appPrograms.map((program) => (
                      <option key={program.id} value={program.id}>{program.title} · {program.clientName}</option>
                    ))}
                  </select>
                  {!loadingPrograms && appPrograms.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-700">Belum ada program aktif dengan modul T-BOS atau LEP.</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Modul dan peran *</label>
                  <select
                    value={selectedModuleKey}
                    disabled={!selectedProgram}
                    onChange={(event) => {
                      const programModule = selectedProgram?.modules.find((item) => item.key === event.target.value);
                      if (selectedProgram && programModule) chooseModule(selectedProgram, programModule);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Pilih modul</option>
                    {selectedProgram?.modules.map((programModule) => (
                      <option key={programModule.key} value={programModule.key}>{programModule.label} · {programModule.defaultRole}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedProgram && selectedModuleKey && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-white/80 px-3 py-2.5 text-xs text-slate-600">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <p>Assignment akan langsung aktif. Setelah dibuat, AMS membuka daftar kandidat beserta peringkat AI; akses APP baru aktif setelah associate menerima undangan.</p>
                </div>
              )}
            </div>
          )}

          <FormFields form={form} setForm={setForm} lockIdentity={assignmentMode === 'program'} />
          <div className="mt-4 flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-[#0A255A] hover:to-[#071A33] disabled:opacity-50 disabled:shadow-none">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => { setShowForm(false); resetCreateForm(); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
                        {a.external_program_id && a.external_module_key && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {a.source_system === 'app-binahub' ? 'Dari APP' : 'Terhubung APP'} · {a.external_module_key.toUpperCase()}
                          </span>
                        )}
                        {a.external_program_id && a.external_module_key && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.integration_status === 'synced'
                              ? 'bg-emerald-50 text-emerald-700'
                              : a.integration_status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}>
                            {a.integration_status === 'synced'
                              ? 'Tersinkron'
                              : a.integration_status === 'failed'
                                ? 'Sinkronisasi gagal'
                                : a.integration_status === 'not_linked'
                                  ? 'Siap pilih associate'
                                  : 'Menunggu sinkronisasi'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{a.client_name}</p>
                      {a.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{a.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                        {a.start_date && <span>Mulai: {new Date(a.start_date).toLocaleDateString('id-ID')}</span>}
                        {a.end_date && <span>Selesai: {new Date(a.end_date).toLocaleDateString('id-ID')}</span>}
                        {a.needed_roles.length > 0 && <span>Role: {a.needed_roles.join(', ')}</span>}
                        {a.mandays && a.mandays > 0 ? <span>Durasi: {a.mandays} Hari</span> : null}
                        {a.compensation && <span>Kompensasi: {a.compensation}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/admin/assignments/${a.id}`} className="rounded-lg bg-[#0B2C6B] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#0A255A]">Lihat Tim</Link>
                      {a.external_program_id && a.external_module_key && a.integration_status === 'failed' && (
                        <button
                          onClick={() => void retryAppSync(a.id)}
                          disabled={syncingId === a.id}
                          className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {syncingId === a.id ? 'Menyinkronkan...' : 'Sync ulang APP'}
                        </button>
                      )}
                      {renderStatusButtons(a).map((btn) => (
                        <button
                          key={btn.status}
                          onClick={() => handleStatusChange(a.id, btn.status)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${btn.cls}`}
                        >
                          {btn.label}
                        </button>
                      ))}
                      {!a.external_program_id && (
                        <button
                          onClick={() => startEdit(a)}
                          className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                      )}
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
