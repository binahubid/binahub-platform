// ============================================
// REVIEW TYPES
// ============================================

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'revision_needed';

export interface AssociateReview {
  id: string;
  associateId: string;
  reviewerId: string;
  rating: number | null;
  strengths: string | null;
  improvements: string | null;
  notes: string | null;
  status: ReviewStatus;
  decisionAt: string | null;
  createdAt: string;
}

// ============================================
// REVIEW WITH RELATIONS
// ============================================

export interface ReviewWithReviewer extends AssociateReview {
  reviewer: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

// ============================================
// REVIEW FILTER TYPES
// ============================================

export interface ReviewFilter {
  associateId?: string;
  reviewerId?: string;
  status?: ReviewStatus;
  ratingMin?: number;
  ratingMax?: number;
}

// ============================================
// REVIEW STATISTICS
// ============================================

export interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  averageRating: number | null;
}
