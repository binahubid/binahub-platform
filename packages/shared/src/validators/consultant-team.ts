import { z } from 'zod';

export const teamQuerySchema = z.object({
  page: z.coerce.number().int().min(0).max(10000).default(0),
  search: z.string().trim().max(150).default(''),
  status: z.enum(['all','invited','active','paused','ended','declined']).default('all'),
});
const agreementField = (length: number) => z.string().trim().min(2).max(length)
  .refine((value) => !/[\r\n\u0000-\u001f]/.test(value) && !value.includes('[['));
const agreementProfile = z.object({
  address: agreementField(400),
  identityNumber: agreementField(60),
  npwp: z.string().trim().max(24).regex(/^[0-9. -]*$/).optional().default(''),
  bankName: agreementField(100),
  bankHolder: agreementField(160),
  bankAccount: z.string().trim().min(3).max(38).regex(/^[0-9 -]+$/),
  signerName: agreementField(160),
  signerTitle: agreementField(120),
}).strict();
export const teamAgreementPreviewSchema = z.object({
  associateId: z.string().uuid(),
  revision: z.number().int().min(0),
  profile: agreementProfile,
  compensationTerms: z.string().trim().max(2000).optional().default(''),
}).strict();

export const teamAdminSchema = z.discriminatedUnion('action', [
  z.object({
    ...teamAgreementPreviewSchema.shape,
    action: z.literal('invite'),
    previewHash: z.string().regex(/^[a-f0-9]{64}$/),
    reviewed: z.literal(true),
  }).strict(),
  z.object({
    action: z.enum(['pause','resume','end','retry_sync']), associateId: z.string().uuid(), revision: z.number().int().min(1),
  }).strict(),
]);
export const teamResponseSchema = z.object({
  action: z.enum(['accept','decline']), revision: z.number().int().min(1), invitationId: z.string().uuid(),
  agreementHash: z.string().regex(/^[a-f0-9]{64}$/).optional(), consent: z.boolean().optional(),
}).strict().refine((v) => v.action !== 'accept' || (v.consent === true && !!v.agreementHash), {
  message: 'Baca dan setujui perjanjian sebelum melanjutkan.',
});
export const teamCheckSchema = z.object({
  associateId: z.string().uuid(), membershipId: z.string().uuid().optional(),
  email: z.string().trim().email().max(320).optional(),
}).strict();
export const teamEmailSchema = z.object({
  emails: z.array(z.string().trim().max(254).email().refine((v) => !v.includes('*')).transform((v)=>v.toLowerCase())).min(1).max(100),
}).strict();
