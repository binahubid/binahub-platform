'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../components/ui';
import { ProtectedFileImage, ProtectedFileLink } from '../../../../components/ui/protected-file';
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
  external_program_id?: string | null;
  external_module_key?: string | null;
  integration_status?: 'not_linked' | 'pending' | 'synced' | 'failed';
};

type Assignee = {
  id: string;
  assignment_id: string;
  associate_id: string;
  status: string;
  role: string | null;
  notes: string | null;
  invited_at: string;
  accepted_at: string | null;
  evidence_url: string | null;
  evidence_notes: string | null;
  evidence_submitted_at: string | null;
  evidence_reviewed_at: string | null;
  evidence_reviewer_notes: string | null;
  compensation_amount: number | string | null;
  compensation_currency: string | null;
  compensation_basis: CompensationBasis | null;
  compensation_notes: string | null;
  compensation_updated_at: string | null;
  associate: { id: string; email: string; status: string } | null;
  profile: { full_name: string; headline: string | null; photo_url: string | null; city: string | null } | null;
};

type CompensationBasis = 'fixed_project' | 'per_day' | 'per_session' | 'per_hour' | 'per_deliverable' | 'other';

type CompensationEditor = {
  assigneeId: string;
  mode: 'inherit' | 'override';
  amount: string;
  currency: string;
  basis: CompensationBasis;
  notes: string;
};

type CompensationDraft = Omit<CompensationEditor, 'assigneeId'>;

type AvailableAssociate = {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  city: string | null;
  skills: string[];
  expertises: string[];
  availability: string | null;
};

const availabilityOptions: Record<string, string> = {
  available: 'Tersedia',
  busy: 'Sibuk',
  unavailable: 'Tidak Tersedia',
};

const compensationBasisLabels: Record<CompensationBasis, string> = {
  fixed_project: 'per proyek',
  per_day: 'per hari',
  per_session: 'per sesi',
  per_hour: 'per jam',
  per_deliverable: 'per deliverable',
  other: 'sesuai catatan',
};

const defaultCompensationDraft = (): CompensationDraft => ({
  mode: 'inherit',
  amount: '',
  currency: 'IDR',
  basis: 'fixed_project',
  notes: '',
});

function formatCompensationOverride(assignee: Assignee) {
  if (assignee.compensation_amount === null || assignee.compensation_amount === undefined || !assignee.compensation_currency || !assignee.compensation_basis) return null;
  const amount = Number(assignee.compensation_amount);
  if (!Number.isFinite(amount)) return null;
  return `${new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: assignee.compensation_currency,
    maximumFractionDigits: 0,
  }).format(amount)} ${compensationBasisLabels[assignee.compensation_basis]}`;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  invited: { label: 'Diundang', bg: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20', text: '' },
  applied: { label: 'Melamar', bg: 'bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20', text: '' },
  accepted: { label: 'Diterima', bg: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20', text: '' },
  declined: { label: 'Ditolak', bg: 'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20', text: '' },
  in_progress: { label: 'Berjalan', bg: 'bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/20', text: '' },
  completed: { label: 'Laporan Dikirim', bg: 'bg-blue-500/10 text-blue-800 ring-1 ring-blue-500/20', text: '' },
  reviewed: { label: 'Disetujui', bg: 'bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20', text: '' },
  withdrawn: { label: 'Mundur', bg: 'bg-slate-100 text-slate-400', text: '' },
  cancelled: { label: 'Dibatalkan', bg: 'bg-slate-100 text-slate-500', text: '' },
};

const parseEvidence = (notes: string | null | undefined) => {
  if (!notes) return { photos: [] as string[], report: '' };
  const photoHeaderIdx = notes.indexOf('[FOTO DOKUMENTASI]');
  const reportHeaderIdx = notes.indexOf('[LAPORAN AKHIR]');
  if (photoHeaderIdx !== -1 && reportHeaderIdx !== -1) {
    const photosPart = notes.substring(photoHeaderIdx + '[FOTO DOKUMENTASI]'.length, reportHeaderIdx).trim();
    const reportPart = notes.substring(reportHeaderIdx + '[LAPORAN AKHIR]'.length).trim();
    const photos = photosPart ? photosPart.split(',').filter(Boolean) : [];
    return { photos, report: reportPart };
  }
  return { photos: [] as string[], report: notes };
};

const timelineSteps = [
  { key: 'invited', label: 'Diundang' },
  { key: 'accepted', label: 'Diterima' },
  { key: 'in_progress', label: 'Mulai Kerja' },
  { key: 'completed', label: 'Kirim Laporan' },
  { key: 'reviewed', label: 'Disetujui' }
];

const getStepIndex = (status: string) => {
  if (status === 'invited') return 0;
  if (status === 'accepted') return 1;
  if (status === 'in_progress') return 2;
  if (status === 'completed') return 3;
  if (status === 'reviewed') return 4;
  return -1;
};

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [availableAssociates, setAvailableAssociates] = useState<AvailableAssociate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteCompensations, setInviteCompensations] = useState<Record<string, CompensationDraft>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [inviting, setInviting] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({});
  const [compensationEditor, setCompensationEditor] = useState<CompensationEditor | null>(null);
  const [savingCompensation, setSavingCompensation] = useState(false);
  
  // AI Recommendations State
  const [recommendations, setRecommendations] = useState<Array<{ associate_id: string; score: number; reasoning: string }>>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const [assigneeProgressLogs, setAssigneeProgressLogs] = useState<Record<string, any[]>>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const getHeaders = useCallback(() => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }), [accessToken]);

  const fetchProgressLogsForAssociate = useCallback(async (associateId: string) => {
    if (!accessToken) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/assignees/${associateId}/progress-logs`, { headers: getHeaders() });
      const data = await resp.json();
      if (data.success) {
        setAssigneeProgressLogs(prev => ({ ...prev, [associateId]: data.data || [] }));
      }
    } catch (e) {
      console.error('Failed to fetch progress logs:', e);
    }
  }, [apiUrl, id, accessToken, getHeaders]);

  useEffect(() => {
    if (assignees.length > 0 && accessToken) {
      assignees.forEach((a) => {
        if (a.status === 'in_progress' || a.status === 'completed' || a.status === 'reviewed') {
          fetchProgressLogsForAssociate(a.associate_id);
        }
      });
    }
  }, [assignees, accessToken, fetchProgressLogsForAssociate]);

  const fetchRecommendations = useCallback(async () => {
    if (!accessToken) return;
    setLoadingRecs(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/recommendations`, { headers: getHeaders() });
      const data = await resp.json();
      if (data.success) {
        setRecommendations(data.data || []);
      } else {
        toast('warning', data.error || 'Rekomendasi AI belum dapat dimuat; daftar associate tetap tersedia');
      }
    } catch {
      toast('warning', 'Rekomendasi AI belum dapat dimuat; daftar associate tetap tersedia');
    } finally {
      setLoadingRecs(false);
    }
  }, [apiUrl, id, accessToken, getHeaders, toast]);

  const fetchAssignees = useCallback(async () => {
    if (!accessToken) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/assignees`, { headers: getHeaders() });
      const data = await resp.json();
      if (data.success) {
        setAssignees(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch assignees:', e);
    }
  }, [apiUrl, id, accessToken, getHeaders]);

  useEffect(() => {
    if (!user || !accessToken) return;
    const fetchAll = async () => {
      try {
        const h = getHeaders();
        const [asgnRes, assigneesRes] = await Promise.all([
          fetch(`${apiUrl}/api/admin/assignments`, { headers: h }),
          fetch(`${apiUrl}/api/admin/assignments/${id}/assignees`, { headers: h }),
        ]);
        const [asgnJson, assigneesJson] = await Promise.all([asgnRes.json(), assigneesRes.json()]);
        const found = (asgnJson.data || []).find((a: Assignment) => a.id === id);
        if (found) setAssignment(found);
        if (assigneesJson.success) setAssignees(assigneesJson.data || []);
      } catch (e) {
        console.error('Failed to fetch:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user, accessToken, apiUrl, id, getHeaders]);


  const fetchAvailableAssociates = useCallback(async () => {
    if (!accessToken) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/associates?limit=100`, { headers: getHeaders() });
      const data = await resp.json();
      if (data.success) {
        const alreadyAssigned = new Set(assignees.map((a) => a.associate_id));
        const filtered = (data.data || [])
          .filter((a: { id: string; status: string }) => a.status === 'active' && !alreadyAssigned.has(a.id))
          .map((a: { id: string; email: string; profile?: { full_name?: string; headline?: string; city?: string; roles?: string[]; expertises?: string[] }; skills?: { skill_name: string }[]; availability?: { status?: string }[] }) => ({
            id: a.id,
            email: a.email,
            full_name: a.profile?.full_name || null,
            roles: a.profile?.roles || [],
            city: a.profile?.city || null,
            skills: (a.skills || []).map((s: { skill_name: string }) => s.skill_name),
            expertises: a.profile?.expertises || [],
            availability: a.availability?.[0]?.status || null,
          }));
        setAvailableAssociates(filtered);
      }
    } catch (e) {
      console.error('Failed to fetch associates:', e);
    }
  }, [apiUrl, accessToken, getHeaders, assignees]);

  const handleInvite = async () => {
    if (selectedIds.length === 0) {
      toast('error', 'Pilih minimal satu associate');
      return;
    }
    const compensationByAssociate: Record<string, { mode: 'inherit' } | { mode: 'override'; amount: number; currency: string; basis: CompensationBasis; notes: string | null }> = {};
    for (const associateId of selectedIds) {
      const draft = inviteCompensations[associateId] || defaultCompensationDraft();
      if (draft.mode === 'inherit') {
        compensationByAssociate[associateId] = { mode: 'inherit' };
        continue;
      }
      const amount = Number(draft.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        toast('error', 'Periksa kembali nominal kompensasi khusus yang dipilih');
        return;
      }
      if (!/^[A-Za-z]{3}$/.test(draft.currency.trim())) {
        toast('error', 'Kode mata uang harus tiga huruf, misalnya IDR');
        return;
      }
      compensationByAssociate[associateId] = {
        mode: 'override',
        amount,
        currency: draft.currency.trim().toUpperCase(),
        basis: draft.basis,
        notes: draft.notes.trim() || null,
      };
    }

    setInviting(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ associate_ids: selectedIds, compensation_by_associate: compensationByAssociate }),
      });
      const data = await resp.json();
      if (data.success) {
        if (data.sync?.failed > 0) {
          toast('warning', `${data.invited} associate diundang, tetapi ${data.sync.failed} sinkronisasi APP menunggu retry`);
        } else {
          toast('success', `${data.invited} associate berhasil diundang`);
        }
        setSelectedIds([]);
        setInviteCompensations({});
        setShowInvite(false);
        fetchAssignees();
      } else {
        toast('error', data.error || 'Gagal mengundang associate');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setInviting(false);
    }
  };

  const openCompensationEditor = (assignee: Assignee) => {
    const hasOverride = assignee.compensation_amount !== null
      && assignee.compensation_currency !== null
      && assignee.compensation_basis !== null;
    setCompensationEditor({
      assigneeId: assignee.id,
      mode: hasOverride ? 'override' : 'inherit',
      amount: hasOverride ? String(assignee.compensation_amount) : '',
      currency: assignee.compensation_currency || 'IDR',
      basis: assignee.compensation_basis || 'fixed_project',
      notes: assignee.compensation_notes || '',
    });
  };

  const saveCompensation = async () => {
    if (!compensationEditor) return;
    const amount = Number(compensationEditor.amount);
    if (compensationEditor.mode === 'override' && (!Number.isFinite(amount) || amount < 0)) {
      toast('error', 'Masukkan nominal kompensasi yang valid');
      return;
    }
    if (compensationEditor.mode === 'override' && !/^[A-Za-z]{3}$/.test(compensationEditor.currency.trim())) {
      toast('error', 'Kode mata uang harus tiga huruf, misalnya IDR');
      return;
    }

    setSavingCompensation(true);
    try {
      const response = await fetch(`${apiUrl}/api/admin/assignments/${id}/assignees/${compensationEditor.assigneeId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          compensation: compensationEditor.mode === 'inherit'
            ? { mode: 'inherit' }
            : {
                mode: 'override',
                amount,
                currency: compensationEditor.currency.trim().toUpperCase(),
                basis: compensationEditor.basis,
                notes: compensationEditor.notes.trim() || null,
              },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Kompensasi belum dapat disimpan');
      setAssignees((current) => current.map((item) => item.id === payload.data.id ? { ...item, ...payload.data } : item));
      setCompensationEditor(null);
      toast('success', compensationEditor.mode === 'inherit' ? 'Associate kembali mengikuti kompensasi default' : 'Kompensasi khusus associate disimpan');
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Kompensasi belum dapat disimpan');
    } finally {
      setSavingCompensation(false);
    }
  };

  const handleReviewEvidence = async (assigneeId: string, targetStatus: 'reviewed' | 'in_progress') => {
    const notes = revisionNotes[assigneeId] || '';
    if (targetStatus === 'in_progress' && !notes) {
      toast('warning', 'Tuliskan catatan revisi sebelum meminta revisi');
      return;
    }
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/assignees/${assigneeId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          status: targetStatus,
          evidence_reviewer_notes: notes || (targetStatus === 'reviewed' ? 'Disetujui oleh admin' : '')
        }),
      });
      const data = await resp.json();
      if (data.success) {
        if (data.syncPending) {
          toast('warning', data.message || 'Perubahan tersimpan; sinkronisasi APP menunggu retry');
        } else {
          toast('success', targetStatus === 'reviewed' ? 'Tugas disetujui & selesai!' : 'Revisi tugas telah diminta ke associate');
        }
        fetchAssignees();
      } else {
        toast('error', data.error || 'Gagal mereview');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  };

  const handleRemove = async (assigneeId: string) => {
    if (!confirm('Hapus associate dari assignment ini?')) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/assignees/${assigneeId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await resp.json();
      if (data.success) {
        toast('success', data.message || 'Associate dihapus dari assignment');
        fetchAssignees();
      } else {
        toast('error', data.error || 'Gagal menghapus');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <p className="text-sm font-medium text-slate-900">Assignment tidak ditemukan</p>
        <Link href="/admin/assignments" className="mt-4 text-sm text-[#0B2C6B] hover:underline">Kembali ke daftar</Link>
      </div>
    );
  }

  const filteredAssociates = availableAssociates.filter((a) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    const nameMatch = (a.full_name || '').toLowerCase().includes(term);
    const emailMatch = a.email.toLowerCase().includes(term);
    const skillMatch = a.skills.some((s) => s.toLowerCase().includes(term));
    const cityMatch = (a.city || '').toLowerCase().includes(term);
    const rolesMatch = a.roles.some((r) => r.toLowerCase().includes(term));
    return nameMatch || emailMatch || skillMatch || cityMatch || rolesMatch;
  });

  const associatesWithRanks = filteredAssociates.map((a) => {
    const rec = recommendations.find((r) => r.associate_id === a.id);
    return {
      ...a,
      score: rec ? rec.score : null,
      reasoning: rec ? rec.reasoning : null,
    };
  }).sort((a, b) => {
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/admin/assignments" className="text-slate-500 hover:text-slate-700">Assignments</Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-900">{assignment.title}</span>
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{assignment.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{assignment.client_name}</p>
            {assignment.description && <p className="mt-3 text-sm text-slate-600">{assignment.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className={`rounded-full px-2.5 py-1 font-bold ${assignment.status === 'active' ? 'bg-emerald-50 text-emerald-700' : assignment.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'}`}>
                {assignment.status}
              </span>
              {assignment.external_program_id && assignment.external_module_key && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">
                  Terhubung APP · {assignment.external_module_key.toUpperCase()}
                </span>
              )}
              {assignment.start_date && <span>Mulai: {new Date(assignment.start_date).toLocaleDateString('id-ID')}</span>}
              {assignment.end_date && <span>Selesai: {new Date(assignment.end_date).toLocaleDateString('id-ID')}</span>}
              {assignment.needed_roles.length > 0 && <span>Role: {assignment.needed_roles.join(', ')}</span>}
              <span>Dibutuhkan: {assignment.needed_count} orang</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (assignment.status !== 'active') {
                toast('error', 'Aktifkan proyek terlebih dahulu sebelum mengundang associate.');
                return;
              }
              if (!showInvite) {
                fetchAvailableAssociates();
                fetchRecommendations();
              }
              setShowInvite(!showInvite);
              setSelectedIds([]);
              setInviteCompensations({});
            }}
            disabled={assignment.status !== 'active'}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              assignment.status === 'active'
                ? 'bg-[#0B2C6B] hover:bg-[#0A255A]'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
            title={assignment.status !== 'active' ? 'Aktifkan proyek terlebih dahulu' : 'Undang Associate'}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {assignment.status !== 'active' ? 'Proyek Belum Aktif' : 'Undang Associate'}
          </button>
        </div>
      </div>

      {/* Draft Warning Banner */}
      {assignment.status === 'draft' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Proyek masih berstatus Draft</p>
            <p className="text-xs text-amber-700 mt-0.5">Ubah status proyek menjadi <strong>Active</strong> terlebih dahulu sebelum mengundang associate. Undangan tidak dapat dikirim saat proyek masih draft, dan associate yang sudah diundang tidak dapat memulai pekerjaan sampai proyek diaktifkan.</p>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Pilih Associate untuk Diundang</h3>
              <p className="mt-0.5 text-xs text-slate-500">Setiap orang dapat mengikuti kompensasi default atau menerima nilai khusus sebelum undangan dikirim.</p>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, email, skill, atau kota..."
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none w-64"
            />
          </div>
          {loadingRecs && (
            <div className="flex items-center justify-center gap-2 py-3 bg-blue-50/50 rounded-lg border border-blue-100 mb-4 text-xs font-semibold text-[#0B2C6B] animate-pulse">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI sedang menganalisis kecocokan kandidat berdasarkan detail proyek...
            </div>
          )}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {associatesWithRanks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ada associate tersedia</p>
            ) : (
              associatesWithRanks.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg border p-4 transition-colors ${selectedIds.includes(a.id) ? 'border-[#0B2C6B] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, a.id]);
                          setInviteCompensations((current) => ({
                            ...current,
                            [a.id]: current[a.id] || defaultCompensationDraft(),
                          }));
                        } else {
                          setSelectedIds(selectedIds.filter((x) => x !== a.id));
                          setInviteCompensations((current) => {
                            const next = { ...current };
                            delete next[a.id];
                            return next;
                          });
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0B2C6B] focus:ring-[#0B2C6B]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{a.full_name || a.email}</p>
                            {a.score !== null && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                a.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                a.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                🎯 AI Match: {a.score}%
                              </span>
                            )}
                          </div>
                          {a.roles.length > 0 && <p className="text-xs text-slate-500 mt-0.5">{a.roles.join(' & ')}</p>}
                        </div>
                        <Link
                          href={`/admin/associates/${a.id}`}
                          target="_blank"
                          className="rounded-md px-2 py-1 text-[10px] font-medium text-[#0B2C6B] hover:bg-blue-100 flex-shrink-0"
                        >
                          Lihat Profil
                        </Link>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        {a.city && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                            {a.city}
                          </span>
                        )}
                        {a.availability && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.availability === 'available' ? 'bg-emerald-50 text-emerald-700' : a.availability === 'busy' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {availabilityOptions[a.availability] || a.availability}
                          </span>
                        )}
                      </div>
                      {a.expertises.length > 0 && (
                        <div className="mt-1">
                          <span className="text-[10px] font-medium text-slate-400">Keahlian: </span>
                          {a.expertises.map((e, i) => (
                            <span key={i} className="text-[10px] font-medium text-indigo-600">{e}{i < a.expertises.length - 1 ? ', ' : ''}</span>
                          ))}
                        </div>
                      )}
                      {a.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.skills.slice(0, 5).map((s, i) => (
                            <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{s}</span>
                          ))}
                          {a.skills.length > 5 && (
                            <span className="text-[10px] text-slate-400">+{a.skills.length - 5}</span>
                          )}
                        </div>
                      )}
                      {a.reasoning && (
                        <div className="mt-3 rounded-lg bg-[#0B2C6B]/[0.03] border border-[#0B2C6B]/10 p-2.5 flex items-start gap-2">
                          <span className="text-xs">💡</span>
                          <p className="text-xs italic text-slate-600 leading-normal">
                            <strong className="text-[#0B2C6B] not-italic font-bold">AI Rekomendasi:</strong> &ldquo;{a.reasoning}&rdquo;
                          </p>
                        </div>
                      )}
                      {selectedIds.includes(a.id) && (() => {
                        const draft = inviteCompensations[a.id] || defaultCompensationDraft();
                        const updateDraft = (changes: Partial<CompensationDraft>) => setInviteCompensations((current) => ({
                          ...current,
                          [a.id]: { ...(current[a.id] || defaultCompensationDraft()), ...changes },
                        }));
                        return (
                          <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-900">Kompensasi untuk {a.full_name || a.email}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">Nilai ini tampil sebelum associate menerima undangan.</p>
                              </div>
                              <div className="inline-flex rounded-lg bg-slate-100 p-1 text-[11px] font-semibold">
                                <button type="button" onClick={() => updateDraft({ mode: 'inherit' })} className={`rounded-md px-2.5 py-1.5 ${draft.mode === 'inherit' ? 'bg-white text-[#0B2C6B] shadow-sm' : 'text-slate-500'}`}>Ikuti default</button>
                                <button type="button" onClick={() => updateDraft({ mode: 'override' })} className={`rounded-md px-2.5 py-1.5 ${draft.mode === 'override' ? 'bg-white text-[#0B2C6B] shadow-sm' : 'text-slate-500'}`}>Nilai khusus</button>
                              </div>
                            </div>
                            {draft.mode === 'inherit' ? (
                              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{assignment.compensation || 'Kompensasi default belum ditetapkan'}</p>
                            ) : (
                              <div className="mt-3 grid gap-2 sm:grid-cols-[1.2fr_0.55fr_0.8fr]">
                                <label className="text-[11px] font-semibold text-slate-600">Nominal
                                  <input type="number" min="0" step="1000" value={draft.amount} onChange={(event) => updateDraft({ amount: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-normal outline-none focus:border-[#0B2C6B]" placeholder="5000000" />
                                </label>
                                <label className="text-[11px] font-semibold text-slate-600">Mata uang
                                  <input maxLength={3} value={draft.currency} onChange={(event) => updateDraft({ currency: event.target.value.toUpperCase() })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-normal uppercase outline-none focus:border-[#0B2C6B]" />
                                </label>
                                <label className="text-[11px] font-semibold text-slate-600">Satuan
                                  <select value={draft.basis} onChange={(event) => updateDraft({ basis: event.target.value as CompensationBasis })} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-normal outline-none focus:border-[#0B2C6B]">
                                    {Object.entries(compensationBasisLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                  </select>
                                </label>
                                <label className="text-[11px] font-semibold text-slate-600 sm:col-span-3">Catatan kesepakatan <span className="font-normal text-slate-400">(opsional)</span>
                                  <textarea rows={2} maxLength={2000} value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-normal leading-5 outline-none focus:border-[#0B2C6B]" placeholder="Contoh: termasuk transport lokal, dibayarkan setelah laporan disetujui." />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowInvite(false); setSelectedIds([]); setInviteCompensations({}); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
            <button onClick={handleInvite} disabled={inviting || selectedIds.length === 0} className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A255A] disabled:opacity-50">
              {inviting ? 'Mengundang...' : `Undang ${selectedIds.length} Associate`}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Tim Assignment ({assignees.length})</h2>
        </div>
        {assignees.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center">
            <p className="text-sm font-medium text-slate-900">Belum ada associate diundang</p>
            <p className="mt-1 text-xs text-slate-500">Klik &quot;Undang Associate&quot; untuk menambah anggota</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignees.map((a) => {
              const config = statusConfig[a.status] || statusConfig.invited;
              const { photos, report } = parseEvidence(a.evidence_notes);
              const compensationOverride = formatCompensationOverride(a);
              const compensationLocked = !['invited', 'applied'].includes(a.status);
              const avatarSrc = a.profile?.photo_url 
                ? `${apiUrl}/api/files/view-path?path=${encodeURIComponent(a.profile.photo_url)}` 
                : undefined;

              return (
                <div key={a.id} className="px-6 py-5 hover:bg-slate-50/50 transition-colors space-y-4">
                  {/* Top Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-[#0B2C6B] flex-shrink-0 border border-slate-200">
                        {avatarSrc ? (
                          <ProtectedFileImage src={avatarSrc} accessToken={accessToken} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                            {(a.profile?.full_name || a.associate?.email || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{a.profile?.full_name || a.associate?.email}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{a.associate?.email}</p>
                        {a.role && <p className="text-xs text-slate-400 mt-0.5 font-medium">Sebagai: <strong className="text-slate-600 font-semibold">{a.role}</strong></p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      <Link
                        href={`/admin/associates/${a.associate_id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Lihat Profil
                      </Link>
                      <button
                        onClick={() => handleRemove(a.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-slate-100 hover:border-red-100"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="ml-0 rounded-xl border border-slate-200 bg-white p-4 sm:ml-13">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Kompensasi associate</p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${compensationOverride ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {compensationOverride ? 'Nilai khusus' : 'Mengikuti default'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-900">{compensationOverride || assignment.compensation || 'Belum ditetapkan'}</p>
                        {a.compensation_notes && <p className="mt-1 text-xs leading-5 text-slate-500">{a.compensation_notes}</p>}
                        {compensationLocked && <p className="mt-1 text-[10px] font-medium text-amber-700">Terkunci karena undangan sudah diterima atau pekerjaan telah dimulai.</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => openCompensationEditor(a)}
                        disabled={compensationLocked}
                        className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-[#0B2C6B] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Atur kompensasi
                      </button>
                    </div>

                    {compensationEditor?.assigneeId === a.id && (
                      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setCompensationEditor({ ...compensationEditor, mode: 'inherit' })}
                            className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${compensationEditor.mode === 'inherit' ? 'border-[#0B2C6B] bg-blue-50 text-[#0B2C6B]' : 'border-slate-200 text-slate-600'}`}
                          >
                            Ikuti default assignment
                            <span className="mt-1 block font-normal text-slate-500">{assignment.compensation || 'Default belum ditetapkan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompensationEditor({ ...compensationEditor, mode: 'override' })}
                            className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${compensationEditor.mode === 'override' ? 'border-[#0B2C6B] bg-blue-50 text-[#0B2C6B]' : 'border-slate-200 text-slate-600'}`}
                          >
                            Gunakan nilai khusus
                            <span className="mt-1 block font-normal text-slate-500">Hanya berlaku untuk associate ini</span>
                          </button>
                        </div>

                        {compensationEditor.mode === 'override' && (
                          <div className="grid gap-3 sm:grid-cols-[1.2fr_0.55fr_0.8fr]">
                            <label className="text-xs font-semibold text-slate-600">Nominal
                              <input type="number" min="0" step="1000" value={compensationEditor.amount} onChange={(event) => setCompensationEditor({ ...compensationEditor, amount: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#0B2C6B]" placeholder="5000000" />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Mata uang
                              <input maxLength={3} value={compensationEditor.currency} onChange={(event) => setCompensationEditor({ ...compensationEditor, currency: event.target.value.toUpperCase() })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal uppercase outline-none focus:border-[#0B2C6B]" />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Satuan
                              <select value={compensationEditor.basis} onChange={(event) => setCompensationEditor({ ...compensationEditor, basis: event.target.value as CompensationBasis })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#0B2C6B]">
                                {Object.entries(compensationBasisLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600 sm:col-span-3">Catatan kesepakatan <span className="font-normal text-slate-400">(opsional)</span>
                              <textarea rows={2} maxLength={2000} value={compensationEditor.notes} onChange={(event) => setCompensationEditor({ ...compensationEditor, notes: event.target.value })} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal leading-5 outline-none focus:border-[#0B2C6B]" placeholder="Contoh: termasuk transport lokal, dibayarkan setelah laporan disetujui." />
                            </label>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setCompensationEditor(null)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600">Batal</button>
                          <button type="button" onClick={() => void saveCompensation()} disabled={savingCompensation} className="min-h-9 rounded-lg bg-[#0B2C6B] px-4 text-xs font-semibold text-white disabled:opacity-50">{savingCompensation ? 'Menyimpan…' : 'Simpan kompensasi'}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Stepper & Milestone Timestamps */}
                  <div className="ml-0 sm:ml-13 bg-slate-50/30 rounded-xl border border-slate-100 p-4 space-y-4">
                    {/* Stepper Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Progres Tugas
                      </span>
                    </div>

                    {/* Stepper Timeline Visual */}
                    <div className="relative flex items-center justify-between w-full pt-2 px-2">
                      {/* Connection Line */}
                      <div className="absolute top-[18px] left-[5%] right-[5%] h-0.5 bg-slate-200 -z-0">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${(getStepIndex(a.status) / (timelineSteps.length - 1)) * 100}%` }}
                        />
                      </div>

                      {/* Stepper Nodes */}
                      {timelineSteps.map((step, idx) => {
                        const currentIdx = getStepIndex(a.status);
                        const isCompleted = idx < currentIdx;
                        const isActive = idx === currentIdx;
                        
                        return (
                          <div key={step.key} className="flex flex-col items-center relative z-10">
                            {/* Node Circle */}
                            <div 
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors border ${
                                isCompleted 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                  : isActive 
                                    ? 'bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 shadow-sm' 
                                    : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}
                            >
                              {isCompleted ? '✓' : idx + 1}
                            </div>
                            {/* Node Label */}
                            <span 
                              className={`text-[9px] font-bold mt-1.5 transition-colors ${
                                isActive ? 'text-indigo-600 font-extrabold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Milestone Timestamps Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-semibold">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">1. Diundang</span>
                        <span>{a.invited_at ? new Date(a.invited_at).toLocaleDateString('id-ID') : '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">2. Diterima</span>
                        <span>{a.accepted_at ? new Date(a.accepted_at).toLocaleDateString('id-ID') : 'Menunggu...'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">3. Mulai Kerja</span>
                        <span>{a.status === 'in_progress' || getStepIndex(a.status) > 2 ? 'Sedang Berjalan' : 'Belum Mulai'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">4. Kirim Laporan</span>
                        <span>{a.evidence_submitted_at ? new Date(a.evidence_submitted_at).toLocaleDateString('id-ID') : 'Belum Kirim'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Submission Evidence Panel */}
                  {(a.evidence_submitted_at || photos.length > 0 || report || a.evidence_url || (assigneeProgressLogs[a.associate_id] && assigneeProgressLogs[a.associate_id].length > 0)) && (
                    <div className="ml-0 sm:ml-13 rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Dokumen & Bukti Pekerjaan
                        </span>
                        {a.evidence_submitted_at && (
                          <span className="text-[10px] text-slate-400 font-semibold">Kirim Laporan: {new Date(a.evidence_submitted_at).toLocaleString('id-ID')}</span>
                        )}
                      </div>

                      {/* Progress Logs Timeline for Admin */}
                      {assigneeProgressLogs[a.associate_id] && assigneeProgressLogs[a.associate_id].length > 0 && (
                        <div className="space-y-3 pb-2 border-b border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Log Aktivitas & Progres Lapangan ({assigneeProgressLogs[a.associate_id].length})</p>
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {assigneeProgressLogs[a.associate_id].map((log: any) => (
                              <div key={log.id} className="rounded-lg bg-white border border-slate-200 p-3 text-xs space-y-1.5 shadow-sm">
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                  <span>Log Kegiatan</span>
                                  <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                                </div>
                                <p className="text-slate-700 whitespace-pre-wrap">{log.notes}</p>
                                {log.photo_urls && Array.isArray(log.photo_urls) && log.photo_urls.length > 0 && (
                                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-1">
                                    {log.photo_urls.map((photoUrl: string, pIdx: number) => (
                                      <ProtectedFileLink
                                        key={pIdx} 
                                        href={photoUrl}
                                        accessToken={accessToken}
                                        onOpenError={(message) => toast('error', message)}
                                        className="relative rounded overflow-hidden border border-slate-200 aspect-square bg-slate-50 block hover:opacity-85 transition"
                                      >
                                        <ProtectedFileImage src={photoUrl} accessToken={accessToken} alt="Progres" className="w-full h-full object-cover" />
                                      </ProtectedFileLink>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Photos Documentation */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foto Dokumentasi Kegiatan (Saat Kerja)</p>
                        {photos.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                            {photos.map((pUrl, pIdx) => (
                              <ProtectedFileLink key={pIdx} href={pUrl} accessToken={accessToken} onOpenError={(message) => toast('error', message)} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100 hover:opacity-90 transition shadow-sm">
                                <ProtectedFileImage src={pUrl} accessToken={accessToken} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-white text-[10px] font-bold">Buka Foto ↗</span>
                                </div>
                              </ProtectedFileLink>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Belum ada foto kegiatan diunggah</p>
                        )}
                      </div>

                      {/* Written Report */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ringkasan Laporan Akhir (Setelah Kerja)</p>
                        {report ? (
                          <div className="rounded-lg bg-white border border-slate-200 p-3.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                            {report}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Belum ada ulasan/catatan laporan akhir</p>
                        )}
                      </div>

                      {/* File attachment */}
                      {a.evidence_url && (
                        <div className="pt-2">
                          <ProtectedFileLink
                            href={a.evidence_url}
                            accessToken={accessToken}
                            onOpenError={(message) => toast('error', message)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                          >
                            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download / Buka Berkas Laporan Akhir
                          </ProtectedFileLink>
                        </div>
                      )}

                      {/* Admin Review Console */}
                      {a.status === 'completed' && (
                        <div className="pt-4 border-t border-slate-200 space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Penilaian / Feedback Review Admin</label>
                          <textarea
                            rows={2}
                            placeholder="Tulis umpan balik penilaian kerja atau detail yang perlu direvisi..."
                            value={revisionNotes[a.id] || ''}
                            onChange={(e) => setRevisionNotes({ ...revisionNotes, [a.id]: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 resize-none transition shadow-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleReviewEvidence(a.id, 'reviewed')}
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              ✓ Setujui Laporan
                            </button>
                            <button
                              onClick={() => handleReviewEvidence(a.id, 'in_progress')}
                              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              ⚠ Minta Revisi
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Feedback Display if already reviewed or notes present */}
                      {a.evidence_reviewer_notes && (
                        <div className="rounded-xl border border-emerald-100 p-3.5 bg-emerald-50/50 text-xs text-slate-700 flex items-start gap-2 pt-3 border-t border-slate-200">
                          <span className="text-xs">✓</span>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">Umpan Balik Terakhir Admin</p>
                            <p className="text-slate-600 italic">&ldquo;{a.evidence_reviewer_notes}&rdquo;</p>
                            {a.evidence_reviewed_at && (
                              <p className="text-[9px] text-slate-400 mt-1 font-semibold">Tinjau Tanggal: {new Date(a.evidence_reviewed_at).toLocaleDateString('id-ID')}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
