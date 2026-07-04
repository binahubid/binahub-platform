import { z } from 'zod';

// ============================================
// REVIEW VALIDATORS
// ============================================

export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'revision_needed']);

// ============================================
// CREATE REVIEW VALIDATORS
// ============================================

export const createReviewSchema = z.object({
  associateId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  strengths: z.string().max(5000).optional(),
  improvements: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional()
});

// ============================================
// UPDATE REVIEW VALIDATORS
// ============================================

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  strengths: z.string().max(5000).optional(),
  improvements: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  status: reviewStatusSchema.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'Minimal satu field harus diisi'
  }
);

// ============================================
// REVIEW FILTER VALIDATORS
// ============================================

export const reviewFilterSchema = z.object({
  associateId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  status: reviewStatusSchema.optional(),
  ratingMin: z.number().int().min(1).max(5).optional(),
  ratingMax: z.number().int().min(1).max(5).optional()
}).refine(
  (data) => {
    if (data.ratingMin && data.ratingMax && data.ratingMin > data.ratingMax) {
      return false;
    }
    return true;
  },
  {
    message: 'Rating minimum tidak boleh lebih besar dari rating maksimum',
    path: ['ratingMax']
  }
);

// ============================================
// REVIEW STATISTICS VALIDATORS
// ============================================

export const reviewStatsFilterSchema = z.object({
  associateId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});
