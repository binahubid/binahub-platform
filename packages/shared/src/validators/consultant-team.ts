import { z } from 'zod';

export const teamQuerySchema = z.object({
  page: z.coerce.number().int().min(0).max(10000).default(0),
  search: z.string().trim().max(150).default(''),
  status: z.enum(['all','invited','active','paused','ended','declined']).default('all'),
});
export const teamAdminSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('invite'), associateId: z.string().uuid(), revision: z.number().int().min(0),
    agreementText: z.string().trim().min(40).max(16000),
    compensationTerms: z.string().trim().min(5).max(2000), reviewed: z.literal(true),
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
