'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type User = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: Record<string, unknown>;
};

export default function AdminUsersPage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchUsers = async () => {
    if (!user || !accessToken) return;
    try {
      const resp = await fetch(`${apiUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await resp.json();
      if (d?.success) setUsers(d.data || []);
      else toast('error', d?.error || 'Gagal memuat data');
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user, accessToken, apiUrl]);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    ((u.user_metadata?.full_name as string) || '').toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter((u) => u.role === 'admin');
  const reviewers = filtered.filter((u) => u.role === 'reviewer');
  const associates = filtered.filter((u) => u.role === 'associate');

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'reviewer' | 'associate') => {
    if (!accessToken) return;
    setChangingRole(userId);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ role: newRole }),
      });
      const d = await resp.json();
      if (d?.success) {
        toast('success', `Role berhasil diubah ke ${newRole}`);
        await fetchUsers();
      } else {
        toast('error', d?.error || 'Gagal mengubah role');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setChangingRole(null);
    }
  };

  const roleBadge = (r: string) => {
    switch (r) {
      case 'admin': return { cls: 'bg-purple-50 text-purple-700', label: 'ADMIN' };
      case 'reviewer': return { cls: 'bg-amber-50 text-amber-700', label: 'REVIEWER' };
      default: return { cls: 'bg-slate-100 text-slate-600', label: 'ASSOCIATE' };
    }
  };

  const RoleDropdown = ({ u }: { u: User }) => {
    const currentRole = u.role;
    const isChanging = changingRole === u.id;
    const isSelf = u.id === user?.id;

    if (isSelf) {
      const badge = roleBadge(currentRole);
      return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>;
    }

    return (
      <select
        value={currentRole}
        onChange={(e) => handleChangeRole(u.id, e.target.value as 'admin' | 'reviewer' | 'associate')}
        disabled={isChanging}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B2C6B] disabled:opacity-50"
      >
        <option value="associate">Associate</option>
        <option value="reviewer">Reviewer</option>
        <option value="admin">Admin</option>
      </select>
    );
  };

  const UserRow = ({ u }: { u: User }) => (
    <div className="flex items-center gap-4 px-5 py-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${
        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
        u.role === 'reviewer' ? 'bg-amber-100 text-amber-700' :
        'bg-[#0B2C6B]/10 text-[#0B2C6B]'
      }`}>
        {((u.user_metadata?.full_name as string) || u.email).substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{(u.user_metadata?.full_name as string) || u.email}</p>
        <p className="text-xs text-slate-500">{u.email}</p>
      </div>
      <RoleDropdown u={u} />
      <div className="text-right hidden sm:block">
        <p className="text-[11px] text-slate-400">
          Bergabung: {new Date(u.created_at).toLocaleDateString('id-ID')}
        </p>
        {u.last_sign_in_at && (
          <p className="text-[11px] text-slate-400">
            Login: {new Date(u.last_sign_in_at).toLocaleDateString('id-ID')}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users & Reviewers</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola pengguna dan reviewer sistem. Ubah role melalui dropdown di setiap user.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cari email atau nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Admin</p>
          <p className="mt-1 text-lg font-bold text-purple-700">{admins.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Reviewer</p>
          <p className="mt-1 text-lg font-bold text-amber-600">{reviewers.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Associate</p>
          <p className="mt-1 text-lg font-bold text-[#0B2C6B]">{associates.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-4">
          {admins.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Admin ({admins.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {admins.map((u) => <UserRow key={u.id} u={u} />)}
              </div>
            </div>
          )}

          {reviewers.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Reviewer ({reviewers.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {reviewers.map((u) => <UserRow key={u.id} u={u} />)}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Associate ({associates.length})</h2>
            </div>
            {associates.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-slate-500">Tidak ada associate ditemukan</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {associates.map((u) => <UserRow key={u.id} u={u} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
