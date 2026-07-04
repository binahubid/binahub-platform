'use client';

import { Avatar } from './avatar';

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export function ReviewerFeedback({ reviews }: { reviews: Review[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Reviewer Feedback</h3>
      <div className="mt-4 space-y-4">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <svg className="h-10 w-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="mt-2 text-xs text-slate-400">No feedback yet</p>
          </div>
        ) : reviews.map((review) => (
          <div key={review.id} className="rounded-lg border border-slate-100 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={review.reviewer_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{review.reviewer_name}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`h-3.5 w-3.5 ${i < review.rating ? 'text-amber-400' : 'text-slate-200'}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
