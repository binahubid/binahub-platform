import assert from 'node:assert/strict';
import test from 'node:test';
import { RegisterSchema, LoginSchema } from '../packages/validation/dist/schemas.js';
import { updateProfileSchema, importCVSchema, createExperienceSchema, createEducationSchema } from '../packages/shared/dist/validators/associate.js';
import { fileRegistrationSchema, presignedUrlRequestSchema } from '../packages/shared/dist/validators/files.js';
import { assignmentOfferFeeSchema } from '../packages/shared/dist/validators/assignments.js';
import { appAssignmentRequestSchema } from '../packages/shared/dist/validators/integration.js';
import { updateReviewSchema } from '../packages/shared/dist/validators/reviews.js';

const id = '11111111-1111-4111-8111-111111111111';

test('registration/login preserve accepted fields, reject malformed input and strip extras', () => {
  const input = { email: 'synthetic@example.invalid', full_name: 'Peserta Uji', password: 'test-only-password', role: 'admin' };
  assert.deepEqual(RegisterSchema.parse(input), { email: input.email, full_name: input.full_name, password: input.password });
  assert.equal(RegisterSchema.safeParse({ ...input, password: 'short' }).success, false);
  assert.equal(LoginSchema.safeParse({ email: 'not-an-email', password: 'test' }).success, false);
  assert.equal(LoginSchema.safeParse({ email: input.email, password: 'test' }).success, true);
});

test('partial profile writes do not populate omitted fields or change null semantics', () => {
  assert.deepEqual(updateProfileSchema.parse({}), {});
  assert.deepEqual(updateProfileSchema.parse({ phone: null }), { phone: null });
  assert.deepEqual(updateProfileSchema.parse({ headline: 'Facilitator', status: 'active' }), { headline: 'Facilitator' });
});

test('CV empty defaults are parsed, including nested roles and expertises', () => {
  const expected = { profile: { roles: [], expertises: [] }, experiences: [], educations: [], skills: [], languages: [], certifications: [], portfolios: [] };
  assert.deepEqual(importCVSchema.parse({}), expected);
  assert.deepEqual(importCVSchema.parse({ profile: {} }), expected);
  assert.equal(importCVSchema.safeParse({ profile: { unknownField: 'no' } }).success, false);
});

test('CV limits, date validity and unknown-field rejection remain enforced', () => {
  assert.equal(importCVSchema.safeParse({ skills: Array.from({ length: 201 }, () => ({ skillName: 'Synthetic' })) }).success, false);
  assert.equal(importCVSchema.safeParse({ profile: { dateOfBirth: '2023-02-30' } }).success, false);
  assert.equal(importCVSchema.safeParse({ profile: { dateOfBirth: '2000-02-29' } }).success, true);
  assert.equal(importCVSchema.safeParse({ approvedBy: 'admin' }).success, false);
});

test('file metadata remains an optional string-keyed record of unknown values', () => {
  const input = { ownerId: id, ownerType: 'associate', category: 'cv', path: `${id}/synthetic.pdf`, originalName: 'synthetic.pdf', mime: 'application/pdf', size: 128 };
  assert.deepEqual(fileRegistrationSchema.parse(input), { ...input, visibility: 'private' });
  const metadata = { pages: 2, label: 'Synthetic', reviewed: false, optional: null, nested: { ok: true } };
  assert.deepEqual(fileRegistrationSchema.parse({ ...input, metadata }).metadata, metadata);
  assert.equal(fileRegistrationSchema.safeParse({ ...input, path: '../outside.pdf' }).success, false);
  assert.equal(fileRegistrationSchema.safeParse({ ...input, metadata: [] }).success, false);
});

test('upload limits and owner identifiers retain validation', () => {
  const input = { ownerId: id, ownerType: 'associate', category: 'cv', fileName: 'synthetic.pdf', fileType: 'application/pdf', fileSize: 128 };
  assert.equal(presignedUrlRequestSchema.safeParse(input).success, true);
  assert.equal(presignedUrlRequestSchema.safeParse({ ...input, fileSize: 51 * 1024 * 1024 }).success, false);
  assert.equal(presignedUrlRequestSchema.safeParse({ ...input, ownerId: 'not-an-id' }).success, false);
});

test('experience, education and review refinements keep their rules', () => {
  assert.equal(createExperienceSchema.safeParse({ organization: 'Synthetic', position: 'Trainer', startDate: '2020-01-01' }).success, false);
  assert.equal(createExperienceSchema.safeParse({ organization: 'Synthetic', position: 'Trainer', startDate: '2020-01-01', isCurrent: true }).success, true);
  assert.equal(createEducationSchema.safeParse({ institution: 'Synthetic', degree: 'S1', startYear: 2020, endYear: 2019 }).success, false);
  assert.equal(updateReviewSchema.safeParse({}).success, false);
  assert.equal(updateReviewSchema.safeParse({ rating: 5 }).success, true);
});

test('APP assignment handoff preserves defaults, fee boundaries and dates', () => {
  const input = { requestId: id, program: { id, title: 'Synthetic', clientName: 'Synthetic', url: 'https://example.invalid', moduleKey: 'peta' }, role: 'Trainer', associateIds: [id], fee: { compensation: 150000 }, invitationExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString() };
  assert.equal(appAssignmentRequestSchema.safeParse(input).success, true);
  assert.deepEqual(appAssignmentRequestSchema.parse(input).scope, {});
  assert.equal(assignmentOfferFeeSchema.safeParse({ compensation: 0 }).success, false);
  assert.equal(assignmentOfferFeeSchema.safeParse({ compensation: 1e15 + 1 }).success, false);
  assert.equal(appAssignmentRequestSchema.safeParse({ ...input, startDate: '2026-11-02', endDate: '2026-11-01' }).success, false);
});
