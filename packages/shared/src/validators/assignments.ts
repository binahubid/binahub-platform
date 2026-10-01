import { z } from 'zod';

export const compensationBasisSchema = z.enum([
  'fixed_project',
  'per_day',
  'per_session',
  'per_hour',
  'per_deliverable',
  'other',
]);

export const assigneeCompensationUpdateSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('inherit'),
  }).strict(),
  z.object({
    mode: z.literal('override'),
    amount: z.number().finite().min(0).max(1_000_000_000_000_000),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
    basis: compensationBasisSchema,
    notes: z.string().trim().max(2000).nullable().optional(),
  }).strict(),
]);

const feeAmountSchema = z.number().int().finite().min(0).max(1_000_000_000_000_000);

export const assignmentOfferFeeSchema = z.object({
  compensation: feeAmountSchema.positive(),
  transport: feeAmountSchema.nullable().optional(),
  preparation: feeAmountSchema.nullable().optional(),
}).strict();

export const invitationDeadlineSchema = z.string().datetime({ offset: true }).refine((value) => {
  const remaining = new Date(value).getTime() - Date.now();
  return remaining >= 5 * 60_000 && remaining <= 30 * 24 * 60 * 60_000;
}, 'Batas jawaban harus antara 5 menit dan 30 hari dari sekarang.');

export type AssignmentOfferFee = z.infer<typeof assignmentOfferFeeSchema>;

export type AssigneeCompensationUpdate = z.infer<typeof assigneeCompensationUpdateSchema>;
export type CompensationBasis = z.infer<typeof compensationBasisSchema>;
