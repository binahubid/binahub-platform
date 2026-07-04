'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../components/ui';

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

type Assignee = {
  id: string;
  assignment_id: string;
  associate_id: string;
  status: string;
  role: string | null;
  notes: string | null;
  invited_at: string;
  accepted_at: string | null;
  associate: { id: string; email: string; status: string } | null;
  profile: { full_name: string; headline: string | null; photo_url: string | null; city: string | null } | null;
};

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

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  invited: { label: 'Diundang', bg: 'bg-amber-50', text: 'text-amber-700' },
  applied: { label: 'Melamar', bg: 'bg-blue-50', text: 'text-blue-700' },
  accepted: { label: 'Diterima', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  declined: { label: 'Ditolak', bg: 'bg-red-50', text: 'text-red-600' },
  in_progress: { label: 'Berjalan', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  completed: { label: 'Selesai', bg: 'bg-slate-100', text: 'text-slate-600' },
  withdrawn: { label: 'Mundur', bg: 'bg-slate-100', text: 'text-slate-400' },
};

const assigneeStatusOptions = [
  { value: 'invited', label: 'Diundang' },
  { value: 'applied', label: 'Melamar' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'declined', label: 'Ditolak' },
  { value: 'in_progress', label: 'Berjalan' },
  { value: 'completed', label: 'Selesai' },
];

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [availableAssociates, setAvailableAssociates] = useState<AvailableAssociate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviting, setInviting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const getHeaders = useCallback(() => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }), [accessToken]);

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
    setInviting(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ associate_ids: selectedIds }),
      });
      const data = await resp.json();
      if (data.success) {
        toast('success', `${data.invited} associate berhasil diundang`);
        setSelectedIds([]);
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

  const handleStatusChange = async (assigneeId: string, newStatus: string) => {
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${id}/assignees/${assigneeId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await resp.json();
      if (data.success) {
        toast('success', 'Status berhasil diubah');
        fetchAssignees();
      } else {
        toast('error', data.error || 'Gagal mengubah status');
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
        toast('success', 'Associate dihapus dari assignment');
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
              {assignment.start_date && <span>Mulai: {new Date(assignment.start_date).toLocaleDateString('id-ID')}</span>}
              {assignment.end_date && <span>Selesai: {new Date(assignment.end_date).toLocaleDateString('id-ID')}</span>}
              {assignment.needed_roles.length > 0 && <span>Role: {assignment.needed_roles.join(', ')}</span>}
              <span>Dibutuhkan: {assignment.needed_count} orang</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (!showInvite) fetchAvailableAssociates();
              setShowInvite(!showInvite);
              setSelectedIds([]);
            }}
            className="flex items-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Undang Associate
          </button>
        </div>
      </div>

      {showInvite && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Pilih Associate untuk Diundang</h3>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, email, skill, atau kota..."
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none w-64"
            />
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredAssociates.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ada associate tersedia</p>
            ) : (
              filteredAssociates.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg border p-4 transition-colors ${selectedIds.includes(a.id) ? 'border-[#0B2C6B] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, a.id]);
                        else setSelectedIds(selectedIds.filter((x) => x !== a.id));
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0B2C6B] focus:ring-[#0B2C6B]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{a.full_name || a.email}</p>
                          {a.roles.length > 0 && <p className="text-xs text-slate-500">{a.roles.join(' & ')}</p>}
                        </div>
                        <Link
                          href={`/admin/associates/${a.id}`}
                          target="_blank"
                          className="rounded-md px-2 py-1 text-[10px] font-medium text-[#0B2C6B] hover:bg-blue-100"
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowInvite(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
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
              return (
                <div key={a.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-[#0B2C6B] flex-shrink-0">
                        {a.profile?.photo_url ? (
                          <img src={a.profile.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                            {(a.profile?.full_name || a.associate?.email || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{a.profile?.full_name || a.associate?.email}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${config.bg} ${config.text}`}>{config.label}</span>
                        </div>
                        <p className="text-xs text-slate-500">{a.associate?.email}</p>
                        {a.role && <p className="text-xs text-slate-400 mt-0.5">Role: {a.role}</p>}
                        {a.notes && <p className="text-xs text-slate-400 mt-0.5">Catatan: {a.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none"
                      >
                        {assigneeStatusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Link
                        href={`/admin/associates/${a.associate_id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Lihat Profil
                      </Link>
                      <button
                        onClick={() => handleRemove(a.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
