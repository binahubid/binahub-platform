'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';
import Link from 'next/link';

type Review = {
  id: string;
  project_name: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  capability_updates?: CapabilityUpdate[];
};

type CapabilityUpdate = {
  skill_name: string;
  old_score: number;
  new_score: number;
};

export default function ReviewsPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${apiUrl}/api/associate/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setReviews(d?.data?.reviews || []);
      })
      .catch((e) => console.error('Failed to fetch reviews:', e))
      .finally(() => setLoading(false));
  }, [accessToken, apiUrl]);

  const stats = {
    total: reviews.length,
    average: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0',
    approved: reviews.filter((r) => r.status === 'approved').length,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reviews & Feedback</h1>
        <p className="mt-1 text-sm text-slate-500">Feedback from clients and reviewers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Reviews</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Average Rating</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-bold text-amber-500">{stats.average}</p>
            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </div>
      </div>

      {/* Review List */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <svg className="h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No Reviews Yet</h2>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
              After completing assignments, you&apos;ll receive feedback from clients and reviewers here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Link
              key={review.id}
              href={`/dashboard/reviews/${review.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0B2C6B]/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{review.project_name}</h3>
                  <p className="text-sm text-slate-500">by {review.reviewer_name}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? 'text-amber-400' : 'text-slate-200'}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600 line-clamp-2">{review.comment}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {review.capability_updates && review.capability_updates.length > 0 && (
                  <span className="text-[#0B2C6B] font-medium">+{review.capability_updates.length} skill updates</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
