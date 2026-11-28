import { z } from 'zod';

export const referralCodeSchema = z.string().trim().toUpperCase().regex(/^BH-[A-F0-9]{10}$/);
export const referralSources = ['recommendation', 'team_diagnosis', 'individual_diagnosis', 'inquiry', 'booking'] as const;
export const referralStages = ['incoming', 'verified', 'in_progress', 'won', 'completed', 'closed'] as const;
export const referralFilters = z.object({
  status: z.enum([...referralStages, 'review', 'success']).optional(),
  source: z.enum(referralSources).optional(),
  ownerId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
}).strict();
export const referralSettings = z.object({
  operation: z.enum(['enable', 'disable', 'rotate']),
  expectedCode: referralCodeSchema,
}).strict();
export const referralFollowUp = z.object({
  caseId: z.uuid(), requestId: z.uuid(),
  note: z.string().trim().max(1000),
  revisitOn: z.iso.date().nullable(),
  help: z.boolean(),
}).strict().refine((value) => Boolean(value.note || value.revisitOn || value.help));
export const referralReview = z.object({
  caseId: z.uuid(), status: z.enum(['verified', 'rejected']),
  code: referralCodeSchema.optional(), reason: z.string().trim().min(3).max(500),
  expectedAt: z.iso.datetime({ offset: true }),
}).strict().refine((value) => value.status === 'rejected' || Boolean(value.code));
export const referralEligibility = z.object({ associateId: z.uuid() }).strict();

export type ReferralCode = { code: string; enabled: boolean };
export type ReferralSource = typeof referralSources[number];
export type ReferralStage = typeof referralStages[number];
export type ReferralReason = 'manual' | 'existing_contact' | 'existing_organization' | 'conflict' | 'booking_without_code' | 'self_referral';
export type ReferralRow = {
  id: string;
  stage: ReferralStage;
  reviewStatus: 'pending' | 'verified' | 'rejected';
  needsHelp: boolean;
  canShareContact: boolean;
  createdAt: string;
  updatedAt: string;
  company: string | null;
  contact: { name: string | null; email: string | null } | null;
  nextAction: string | null;
  leadId: string | null;
  opportunityStage: string | null;
  associateId: string | null;
  associateCode: string | null;
  reviewReason: ReferralReason | null;
  sources: { channel: ReferralSource; at: string; claimedAssociateId: string | null }[];
  followUps: { note: string; revisitOn: string | null; requestedHelp: boolean; resolvedAt: string | null; at: string }[];
  reviews: { status: string; reason: string; at: string; previousAssociateId: string | null; associateId: string | null }[] | null;
};
export type ReferralDashboardData = {
  totals: { visits: number; incoming: number; verified: number; inProgress: number; successful: number; review: number };
  total: number;
  records: ReferralRow[];
  associates: {
    id: string; name?: string | null; active?: boolean; code: string; enabled: boolean;
    visits: number; referrals: number; meetings: number; proposals: number; won: number;
  }[] | null;
};
