'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { StatusBadge, useToast } from '../../../components/ui';

type ReviewItem = {
  id: string;
  email: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  profile?: { full_name: string; headline?: string; photo_url?: string } | null;
  reviews?: Array<{
    id: string;
    reviewer_id: string;
    status: string;
    notes?: string;
    decision_at?: string;
    created_at: string;
  }> | null;
};

export default function AdminReviewsPage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending_review');
  // Inline review state
  const [inlineReviewId, setInlineReviewId] = useState<string | null>(null);
  const [inlineNotes, setInlineNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchItems = useCallback(async () => {
    if (!user || !accessToken) return;
    setLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/associates?status=${activeTab}&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await resp.json();
      if (d?.success) {
        setItems(d.data || []);
      } else {
        toast('error', d?.error || 'Gagal memuat data');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken, activeTab, apiUrl, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleInlineReview = async (associateId: string, status: 'approved' | 'rejected') => {
    if (!accessToken) return;
    setReviewing(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/associates/${associateId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status, notes: inlineNotes }),
      });
      const d = await resp.json();
      if (d?.success) {
        toast('success', status === 'approved' ? 'Associate disetujui' : 'Associate ditolak');
        setInlineReviewId(null);
        setInlineNotes('');
        await fetchItems();
      } else {
        toast('error', d?.error || 'Gagal memproses review');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setReviewing(false);
    }
  };

  const tabs = [
    { id: 'pending_review', label: 'Pending' },
    { id: 'active', label: 'Disetujui' },
    { id: 'draft', label: 'Ditolak / Draft' },
  ];

  const statusColors: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const statusLabels: Record<string, string> = {
    approved: 'Disetujui',
    rejected: 'Ditolak',
    pending: 'Pending',
  };

  // For draft tab, separate rejected (has rejected review) from pure draft (no review)
  const filteredItems = activeTab === 'draft'
    ? items.filter((a) => {
        const hasRejectedReview = a.reviews?.some((r) => r.status === 'rejected');
        return hasRejectedReview;
      })
    : activeTab === 'active'
    ? items
    : items;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola review associate: setujui atau tolak pendaftaran.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setInlineReviewId(null); }}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'border-[#0B2C6B] text-[#0B2C6B]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="mt-4 text-sm text-slate-500">
            {activeTab === 'pending_review' ? 'Tidak ada associate yang perlu direview' : activeTab === 'active' ? 'Belum ada associate yang disetujui' : 'Tidak ada associate yang ditolak'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((a) => {
            const latestReview = a.reviews?.[0];
            const isInlineOpen = inlineReviewId === a.id;
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0B2C6B]/10 text-xs font-semibold text-[#0B2C6B]">
                    {(a.profile?.full_name || a.email).substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/associates/${a.id}`} className="text-sm font-semibold text-slate-900 hover:text-[#0B2C6B]">
                      {a.profile?.full_name || a.email}
                    </Link>
                    <p className="text-xs text-slate-500">{a.profile?.headline || a.email}</p>
                  </div>
                  <StatusBadge status={a.status} />
                  {a.submitted_at && (
                    <span className="hidden sm:inline text-xs text-slate-400">
                      {new Date(a.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {/* Inline review button for pending items */}
                  {activeTab === 'pending_review' && !isInlineOpen && (
                    <button
                      onClick={() => { setInlineReviewId(a.id); setInlineNotes(latestReview?.notes || ''); }}
                      className="rounded-lg bg-[#0B2C6B] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0A255A]"
                    >
                      Review
                    </button>
                  )}
                  <Link href={`/admin/associates/${a.id}`} className="text-slate-400 hover:text-slate-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Inline Review Panel */}
                {isInlineOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
                    <textarea
                      value={inlineNotes}
                      onChange={(e) => setInlineNotes(e.target.value)}
                      placeholder="Catatan review (opsional)..."
                      rows={2}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0B2C6B] focus:outline-none focus:ring-1 focus:ring-[#0B2C6B]/20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleInlineReview(a.id, 'approved')}
                        disabled={reviewing}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {reviewing ? 'Memproses...' : 'Setujui'}
                      </button>
                      <button
                        onClick={() => handleInlineReview(a.id, 'rejected')}
                        disabled={reviewing}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => { setInlineReviewId(null); setInlineNotes(''); }}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Notes (for approved/rejected items) */}
                {!isInlineOpen && latestReview?.notes && (
                  <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${statusColors[latestReview.status] || statusColors.pending}`}>
                        {statusLabels[latestReview.status] || latestReview.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-600">{latestReview.notes}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {latestReview.decision_at
                            ? `Keputusan: ${new Date(latestReview.decision_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            : `Direview: ${new Date(latestReview.created_at).toLocaleDateString('id-ID')}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
