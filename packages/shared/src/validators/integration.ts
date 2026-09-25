import { z } from 'zod';

export const appAssignmentRequestSchema = z.object({
  requestId: z.string().uuid(),
  program: z.object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    clientName: z.string().trim().min(1).max(200),
    url: z.string().url().max(1000),
    moduleKey: z.string().regex(/^[a-z][a-z0-9_-]{1,49}$/),
  }),
  role: z.string().trim().min(1).max(100),
  scope: z.record(z.string(), z.unknown()).default({}),
  associateIds: z.array(z.string().uuid()).min(1).max(100),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
  path: ['endDate'],
});

export const appAssociateSearchSchema = z.object({
  query: z.string().trim().max(200).default(''),
  role: z.string().trim().max(100).optional(),
  limit: z.number().int().min(1).max(100).default(30),
});
