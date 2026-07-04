'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';

type AssignmentDetail = {
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
  my_assignment: {
    id: string;
    status: string;
    role: string | null;
    notes: string | null;
    invited_at: string;
    accepted_at: string | null;
  } | null;
  accepted_count: number;
  total_assignees: number;
};

const statusBadge: Record<string, string> = {
  invited: 'bg-amber-50 text-amber-700',
  applied: 'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-600',
  in_progress: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-slate-100 text-slate-600',
  withdrawn: 'bg-slate-100 text-slate-400',
};

const statusLabel: Record<string, string> = {
  invited: 'Diundang',
  applied: 'Melamar',
  accepted: 'Diterima',
  declined: 'Ditolak',
  in_progress: 'Berjalan',
  completed: 'Selesai',
  withdrawn: 'Mundur',
};

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const fetchDetail = async () => {
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}`, { headers });
      const data = await resp.json();
      if (data.success) {
        setAssignment(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch assignment:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchDetail();
  }, [accessToken, apiUrl, id]);

  const handleApply = async () => {
    setActing(true);
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.success) {
        fetchDetail();
      } else {
        alert(data.error || 'Gagal apply');
      }
    } catch {
      alert('Gagal terhubung ke server');
    } finally {
      setActing(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setActing(true);
    try {
      const resp = await fetch(`${apiUrl}/api/associate/assignments/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await resp.json();
      if (data.success) {
        fetchDetail();
      } else {
        alert(data.error || 'Gagal mengubah status');
      }
    } catch {
      alert('Gagal terhubung ke server');
    } finally {
      setActing(false);
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
        <Link href="/dashboard/assignments" className="mt-4 text-sm text-[#0B2C6B] hover:underline">Kembali</Link>
      </div>
    );
  }

  const myStatus = assignment.my_assignment?.status;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/assignments" className="text-slate-500 hover:text-slate-700">Assignments</Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-900">{assignment.title}</span>
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-slate-900">{assignment.title}</h1>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${assignment.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {assignment.status}
              </span>
              {myStatus && (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusBadge[myStatus] || 'bg-slate-100 text-slate-600'}`}>
                  {statusLabel[myStatus] || myStatus}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">{assignment.client_name}</p>
            {assignment.description && <p className="mt-3 text-sm text-slate-600">{assignment.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {assignment.start_date && <span>Mulai: {new Date(assignment.start_date).toLocaleDateString('id-ID')}</span>}
              {assignment.end_date && <span>Selesai: {new Date(assignment.end_date).toLocaleDateString('id-ID')}</span>}
              {assignment.needed_roles.length > 0 && <span>Role: {assignment.needed_roles.join(', ')}</span>}
              <span>Dibutuhkan: {assignment.needed_count} orang</span>
              <span>Tim: {assignment.accepted_count}/{assignment.total_assignees} diterima</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Status Partisipasi Anda</h2>
        {!assignment.my_assignment ? (
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-sm text-slate-600 mb-4">Anda belum terdaftar di assignment ini</p>
            <button
              onClick={handleApply}
              disabled={acting || assignment.status !== 'active'}
              className="rounded-lg bg-[#0B2C6B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0A255A] disabled:opacity-50"
            >
              {acting ? 'Mengirim...' : 'Apply ke Assignment'}
            </button>
            {assignment.status !== 'active' && (
              <p className="mt-2 text-xs text-slate-400">Assignment ini belum aktif</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">Status Anda</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{statusLabel[myStatus!] || myStatus}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">Role</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{assignment.my_assignment.role || 'Belum ditentukan'}</p>
              </div>
            </div>
            {assignment.my_assignment.notes && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">Catatan dari Admin</p>
                <p className="mt-1 text-sm text-slate-600">{assignment.my_assignment.notes}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {myStatus === 'invited' && (
                <>
                  <button onClick={() => handleStatusUpdate('accepted')} disabled={acting} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Terima Undangan</button>
                  <button onClick={() => handleStatusUpdate('declined')} disabled={acting} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">Tolak</button>
                </>
              )}
              {myStatus === 'applied' && (
                <button onClick={() => handleStatusUpdate('withdrawn')} disabled={acting} className="rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Tarik Lamaran</button>
              )}
              {myStatus === 'accepted' && (
                <button onClick={() => handleStatusUpdate('in_progress')} disabled={acting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">Mulai Kerja</button>
              )}
              {myStatus === 'in_progress' && (
                <button onClick={() => handleStatusUpdate('completed')} disabled={acting} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Tandai Selesai</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
