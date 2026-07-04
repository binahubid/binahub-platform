'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../components/ui';
import { useParams, useRouter } from 'next/navigation';

type Review = {
  id: string;
  project_name: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: string;
  capability_updates?: CapabilityUpdate[];
};

type CapabilityUpdate = {
  skill_name: string;
  old_score: number;
  new_score: number;
};

export default function ReviewDetailPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!accessToken || !id) return;
    fetch(`${apiUrl}/api/associate/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const reviews = d?.data?.reviews || [];
        const found = reviews.find((r: Review) => r.id === id);
        setReview(found || null);
      })
      .catch((e) => console.error('Failed to fetch review:', e))
      .finally(() => setLoading(false));
  }, [accessToken, id, apiUrl]);

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

  if (!review) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-slate-900">Review not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Reviews
      </button>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{review.project_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Reviewed by {review.reviewer_name}</p>
            <p className="text-xs text-slate-400">
              {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`h-6 w-6 ${i < review.rating ? 'text-amber-400' : 'text-slate-200'}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Feedback</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Capability Updates */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Capability Updates</h3>
            {review.capability_updates && review.capability_updates.length > 0 ? (
              <div className="space-y-3">
                {review.capability_updates.map((update, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-sm font-medium text-slate-700">{update.skill_name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-400">{update.old_score}</span>
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="text-xs font-semibold text-[#0B2C6B]">{update.new_score}</span>
                      <span className="text-[11px] font-medium text-emerald-600">
                        +{update.new_score - update.old_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-4">No capability updates</p>
            )}
          </div>

          {/* AI Insight */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#D9A441]/10">
                <svg className="h-3.5 w-3.5 text-[#D9A441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">AI Insight</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Based on this review, consider focusing on improving your documentation skills and seek opportunities to lead larger projects.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
