'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { Avatar, StatusBadge, Tabs, SearchInput, useToast } from '../../../components/ui';

type Associate = {
  id: string;
  email: string;
  status: string;
  completeness: number;
  profile?: { full_name: string; headline?: string; photo_url?: string; phone?: string; city?: string; roles?: string[]; expertises?: string[] } | null;
  skills?: { skill_name: string }[];
  availability?: { status: string }[];
  created_at: string;
};

function ActionMenu({ associate, onInvite }: { associate: Associate; onInvite: (a: Associate) => void }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const phone = associate.profile?.phone || '';
  const waNumber = phone.replace(/[^0-9]/g, '');
  const waFormatted = waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => setOpen(false));
  };

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 208 });
    }
    setOpen(!open);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => { onInvite(associate); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Undang ke Project
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => copyToClipboard(associate.email)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Email
            </button>
            <a
              href={`mailto:${associate.email}`}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Kirim Email
            </a>
            {phone && (
              <>
                <button
                  onClick={() => copyToClipboard(phone)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Copy Nomor Telepon
                </button>
                {waFormatted && (
                  <a
                    href={`https://wa.me/${waFormatted}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.212-3.741.981.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.99 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M15.5 1.705C7.255 1.705.485 8.475.485 16.72c0 2.622.686 5.187 1.986 7.441L.395 24.5l4.469-1.17a14.453 14.453 0 006.636 1.614h.005c8.245 0 15.015-6.77 15.015-15.015 0-4.008-1.578-7.775-4.44-10.642A14.82 14.82 0 0015.5 1.705z" />
                    </svg>
                    Chat WhatsApp
                  </a>
                )}
              </>
            )}
            <div className="border-t border-slate-100 my-1" />
            <Link
              href={`/admin/associates/${associate.id}`}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[#0B2C6B] font-medium hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Lihat Profil
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminAssociatesPage() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [counts, setCounts] = useState({ all: 0, active: 0, pending_review: 0, draft: 0 });
  const itemsPerPage = 10;
  const [inviteAssociate, setInviteAssociate] = useState<Associate | null>(null);
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string; client_name: string; status: string }>>([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [inviting, setInviting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const tabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'pending_review', label: 'Under Review', count: counts.pending_review },
    { id: 'draft', label: 'Draft', count: counts.draft },
  ];

  // Fetch counts for all tabs (separate lightweight request)
  useEffect(() => {
    if (!user || !accessToken) return;
    fetch(`${apiUrl}/api/admin/associates?limit=1000`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data)) {
          setCounts({
            all: d.total || d.data.length,
            active: d.data.filter((a: Associate) => a.status === 'active').length,
            pending_review: d.data.filter((a: Associate) => a.status === 'pending_review').length,
            draft: d.data.filter((a: Associate) => a.status === 'draft').length,
          });
        }
      })
      .catch((e) => console.error('Failed to fetch counts:', e));
  }, [user, accessToken, apiUrl]);

  const fetchAssociates = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (activeTab !== 'all') params.set('status', activeTab);
    params.set('limit', '100');
    params.set('offset', '0');

    try {
      const resp = await fetch(`${apiUrl}/api/admin/associates?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await resp.json();
      if (data?.success) {
        setAssociates(data.data || []);
        setTotal(data.total || 0);
      } else {
        toast('error', data?.error || 'Gagal memuat data associate');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAssociates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, activeTab, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAssociates();
  };

  const handleOpenInvite = async (associate: Associate) => {
    setInviteAssociate(associate);
    setSelectedAssignment('');
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await resp.json();
      if (data?.success) setAssignments(data.data || []);
    } catch (e) {
      console.error('Failed to fetch assignments:', e);
    }
  };

  const handleSendInvite = async () => {
    if (!selectedAssignment || !inviteAssociate) {
      toast('error', 'Pilih assignment terlebih dahulu');
      return;
    }
    setInviting(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/assignments/${selectedAssignment}/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ associate_ids: [inviteAssociate.id] }),
      });
      const data = await resp.json();
      if (data?.success) {
        toast('success', `${inviteAssociate.profile?.full_name || inviteAssociate.email} berhasil diundang`);
        setInviteAssociate(null);
      } else {
        toast('error', data?.error || 'Gagal mengundang');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setInviting(false);
    }
  };

  const paginatedAssociates = associates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(associates.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Associates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola dan lihat semua associate di organisasi.
          </p>
        </div>
        <button
          onClick={() => {
            const url = `${window.location.origin}/auth/register`;
            navigator.clipboard.writeText(url).then(
              () => toast('success', 'Link pendaftaran berhasil disalin ke clipboard'),
              () => toast('error', 'Gagal menyalin link')
            );
          }}
          className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Bagikan Link Pendaftaran
        </button>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(t) => { setActiveTab(t); setCurrentPage(1); }} />
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama, skill, role..."
            className="w-full sm:w-64"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Cari
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : associates.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="mt-4 text-sm text-slate-500">
            {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada associate'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nama</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Bidang</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ketersediaan</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Bergabung</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedAssociates.map((associate) => (
                <tr key={associate.id} className="transition-colors hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={associate.profile?.full_name || associate.email} src={associate.profile?.photo_url} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{associate.profile?.full_name || '-'}</p>
                        <p className="text-xs text-slate-500">{associate.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm text-slate-700">{associate.profile?.roles?.join(', ') || '-'}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={associate.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {associate.availability && associate.availability.length > 0 ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${associate.availability[0].status === 'available' ? 'bg-emerald-50 text-emerald-700' : associate.availability[0].status === 'busy' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {associate.availability[0].status === 'available' ? 'Tersedia' : associate.availability[0].status === 'busy' ? 'Sibuk' : 'Tidak Tersedia'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-xs text-slate-500">
                      {new Date(associate.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/admin/associates/${associate.id}`)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#0B2C6B] transition-colors hover:bg-[#0B2C6B]/10"
                      >
                        Detail
                      </button>
                      <ActionMenu associate={associate} onInvite={handleOpenInvite} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-slate-500">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, associates.length)} dari {total} hasil
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    currentPage === page ? 'bg-[#0B2C6B] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteAssociate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInviteAssociate(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">Undang ke Project</h3>
            <p className="mt-1 text-sm text-slate-500">
              Associate: <span className="font-medium text-slate-700">{inviteAssociate.profile?.full_name || inviteAssociate.email}</span>
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Pilih Assignment</label>
              <select
                value={selectedAssignment}
                onChange={(e) => setSelectedAssignment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B] outline-none"
              >
                <option value="">— Pilih Assignment —</option>
                {assignments.filter((a) => a.status === 'active' || a.status === 'draft').map((a) => (
                  <option key={a.id} value={a.id}>{a.title} ({a.client_name})</option>
                ))}
              </select>
              {assignments.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">Belum ada assignment. Buat assignment dulu di halaman Assignments.</p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setInviteAssociate(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
              <button
                onClick={handleSendInvite}
                disabled={inviting || !selectedAssignment}
                className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A255A] disabled:opacity-50"
              >
                {inviting ? 'Mengirim...' : 'Kirim Undangan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
