import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { assignmentLifecycle, assignmentStatusForApp, assignmentWorkState } from '../packages/domain/dist/index.js';

Object.assign(process.env, {
  NODE_ENV: 'production', SUPABASE_URL: 'https://assignment-fixture.invalid',
  SUPABASE_ANON_KEY: 'synthetic-anon', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
  CORS_ALLOWED_ORIGINS: '', FRONTEND_URL: '', APP_URL: '',
});
const now = Date.parse('2026-11-13T04:00:00Z');
Date.now = () => now;
const userId = '00000000-0000-4000-8000-000000000007';
const adminId = '00000000-0000-4000-8000-000000000008';
const ids = [101, 102, 103, 104, 105].map((number) => '00000000-0000-4000-8000-' + String(number).padStart(12, '0'));
let assignments, memberships, notifications, writes, unexpected;

beforeEach(() => {
  assignments = ids.map((id, index) => ({
    id, title: ['Jadwal sudah lewat', 'Undangan ditolak', 'Penugasan mendatang', 'Penugasan dijeda', 'Menunggu peninjauan'][index],
    status: index === 3 ? 'paused' : 'active', source_system: 'ams',
    client_name: 'Organisasi Contoh', needed_count: 1, needed_roles: ['Observer'],
    external_program_id: null,
    start_date: [0, 4].includes(index) ? '2026-11-05' : '2026-12-01',
    end_date: [0, 4].includes(index) ? '2026-11-06' : '2026-12-02',
    created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-02T00:00:00Z',
  }));
  memberships = ids.map((assignment_id, index) => ({
    id: assignment_id, associate_id: userId, assignment_id,
    status: index === 1 ? 'declined' : index === 4 ? 'completed' : 'accepted',
    role: 'Observer', invited_by: adminId, invited_at: '2026-11-01T00:00:00Z',
    accepted_at: index === 1 ? null : '2026-11-02T00:00:00Z',
    evidence_notes: index === 4 ? 'Ringkasan pekerjaan yang telah diselesaikan.' : null,
    evidence_submitted_at: index === 4 ? '2026-11-07T00:00:00Z' : null,
    updated_at: '2026-11-02T00:00:00Z',
  }));
  notifications = [];
  writes = [];
  unexpected = [];
});

function selected(rows, query) {
  return rows.filter((row) => [...query].every(([key, value]) => {
    if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
    if (value.startsWith('in.(')) return value.slice(4, -1).split(',').includes(String(row[key]));
    if (value === 'is.null') return row[key] == null;
    if (value.startsWith('not.in.(')) return !value.slice(8, -1).split(',').includes(String(row[key]));
    return true;
  }));
}

globalThis.fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(String(input), init);
  const url = new URL(request.url);
  const method = init?.method || request.method;
  const headers = new Headers(init?.headers || request.headers);
  if (url.origin !== 'https://assignment-fixture.invalid') {
    unexpected.push(request.url);
    throw new Error('Unexpected external request');
  }
  if (url.pathname === '/auth/v1/user') {
    const role = headers.get('authorization')?.endsWith('synthetic-admin') ? 'admin' : 'associate';
    return Response.json({ id: role === 'admin' ? adminId : userId, email: 'fixture@example.invalid', app_metadata: { role }, user_metadata: {} });
  }
  if (url.pathname === '/auth/v1/admin/users/' + adminId) {
    return Response.json({ id: adminId, email: 'admin@example.invalid', app_metadata: { role: 'admin' } });
  }
  if (url.pathname === '/rest/v1/rpc/enqueue_transformation_event') {
    writes.push({ table: 'events', data: JSON.parse(init?.body || await request.text()) });
    return Response.json(null);
  }
  const table = url.pathname.split('/').at(-1);
  const tables = {
    assignments, assignment_assignees: memberships, notifications,
    associates: [{ id: userId, status: 'active', email: 'associate@example.invalid', profile: { full_name: 'Rina Contoh' } }],
    associate_profiles: [{ associate_id: userId, full_name: 'Rina Contoh' }],
    associate_reviews: [], email_notification_deliveries: [],
  };
  if (!tables[table]) {
    unexpected.push(method + ' ' + url.pathname);
    throw new Error('Unexpected fixture table');
  }
  let rows = selected(tables[table], url.searchParams);
  if (method === 'PATCH') {
    const data = JSON.parse(init?.body || await request.text());
    writes.push({ table, data });
    rows.forEach((row) => Object.assign(row, data));
  } else if (method === 'POST') {
    const body = JSON.parse(init?.body || await request.text());
    writes.push({ table, data: body });
    rows = table === 'notifications'
      ? (Array.isArray(body) ? body : [body]).map((row, index) => ({ ...row, id: 'notice-' + (notifications.length + index) }))
      : [];
    if (table === 'notifications') notifications.push(...rows);
  } else if (!['GET', 'HEAD'].includes(method)) {
    unexpected.push(method + ' ' + url.pathname);
    throw new Error('Unexpected fixture operation');
  }
  const total = rows.length;
  if (method === 'HEAD') return new Response(null, { headers: { 'content-range': '0-0/' + total } });
  const offset = Number(url.searchParams.get('offset') || 0);
  const limit = Number(url.searchParams.get('limit') || total);
  rows = rows.slice(offset, offset + limit);
  return Response.json(headers.get('accept')?.includes('vnd.pgrst.object') ? rows[0] || null : rows, {
    headers: { 'content-range': '0-' + Math.max(0, rows.length - 1) + '/' + total },
  });
};
const { default: app } = await import('../apps/api/dist/app.js');

async function request(path, { admin = false, body, method = 'GET' } = {}) {
  const response = await app.request('https://assignment-fixture.invalid/api/' + path, {
    method, headers: { authorization: 'Bearer synthetic-' + (admin ? 'admin' : 'associate'), 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.deepEqual(unexpected, []);
  return { response, result };
}

test('schedule ends after the full final day in WIB and predicts the next refresh', () => {
  const assignment = { status: 'active', start_date: '2026-11-12', end_date: '2026-11-13' };
  const member = { status: 'in_progress' };
  const before = assignmentWorkState(assignment, member, [member], Date.parse('2026-11-13T16:59:59.999Z'));
  assert.equal(before.work_status, 'in_progress');
  assert.equal(before.actions.can_log_progress, true);
  assert.equal(before.next_transition_at, '2026-11-13T17:00:00.000Z');
  const after = assignmentWorkState(assignment, member, [member], Date.parse('2026-11-13T17:00:00Z'));
  assert.equal(after.work_status, 'awaiting_report');
  assert.equal(after.work_bucket, 'follow_up');
  assert.equal(after.actions.can_log_progress, false);
  assert.equal(after.actions.can_submit_report, true);
});

test('lifecycle preserves response history, pauses, revisions, and legacy reports', () => {
  const assignment = { status: 'active', start_date: '2026-11-01', end_date: '2026-11-02', needed_count: 1 };
  const cases = [
    [{ status: 'declined' }, 'declined', 'history', false],
    [{ status: 'withdrawn' }, 'withdrawn', 'history', false],
    [{ status: 'invited' }, 'expired', 'history', false],
    [{ status: 'applied' }, 'closed', 'history', false],
    [{ status: 'accepted' }, 'awaiting_report', 'follow_up', true],
    [{ status: 'completed', accepted_at: '2026-11-01' }, 'awaiting_report', 'follow_up', true],
    [{ status: 'completed' }, 'closed', 'history', false],
    [{ status: 'completed', evidence_notes: 'Laporan lama' }, 'under_review', 'follow_up', false],
    [{ status: 'in_progress', evidence_reviewed_at: '2026-11-03', evidence_reviewer_notes: 'Tambahkan hasil kegiatan' }, 'revision_required', 'follow_up', true],
    [{ status: 'reviewed' }, 'completed', 'history', false],
  ];
  for (const [member, status, bucket, canReport] of cases) {
    const state = assignmentWorkState(assignment, member, [member], now);
    assert.equal(state.work_status, status);
    assert.equal(state.work_bucket, bucket);
    assert.equal(state.actions.can_submit_report, canReport);
  }
  for (const status of ['paused', 'cancelled', 'draft']) {
    const state = assignmentWorkState({ ...assignment, status }, { status: 'in_progress' }, [], now);
    assert.equal(state.work_status, status);
    assert.ok(Object.values(state.actions).every((allowed) => !allowed));
  }
  assert.equal(assignmentLifecycle(assignment, [{ status: 'reviewed' }], now).phase, 'completed');
  const scheduled = assignmentWorkState({ ...assignment, start_date: '2026-12-01', end_date: '2026-12-02' }, { status: 'in_progress' }, [], now);
  assert.equal(scheduled.work_status, 'scheduled');
  assert.equal(scheduled.actions.can_start, false);
  assert.equal(scheduled.actions.can_log_progress, false);
  assert.equal(assignmentStatusForApp({ status: 'completed' }, 'invited'), 'cancelled');
  assert.equal(assignmentStatusForApp({ status: 'completed' }, 'applied'), 'cancelled');
  assert.equal(assignmentStatusForApp({ status: 'completed' }, 'reviewed'), 'reviewed');
});

test('list and home summary agree while preserving declined and ended history', async () => {
  const list = await request('associate/assignments');
  assert.equal(list.response.status, 200);
  assert.equal(list.response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(list.result.data.filter((row) => row.work_bucket === 'active').map((row) => row.id), [ids[2]]);
  assert.equal(list.result.data.length, 5);
  const home = await request('associate/me');
  assert.equal(home.response.status, 200);
  assert.deepEqual(home.result.data.assignments, list.result.data);
  assert.equal(home.result.data.assignments_unavailable, false);
  assert.equal(writes.length, 0, 'Reading computed state must preserve stored responses');
});

test('detail allows final reporting after the schedule but disables starting and progress', async () => {
  const { result, response } = await request('associate/assignments/' + ids[0]);
  assert.equal(response.status, 200);
  assert.equal(result.data.my_assignment.status, 'accepted');
  assert.equal(result.data.work_status, 'awaiting_report');
  assert.equal(result.data.actions.can_submit_report, true);
  assert.equal(result.data.actions.can_start, false);
  assert.equal(result.data.actions.can_log_progress, false);
  const lateStart = await request('associate/assignments/' + ids[0] + '/status', { method: 'PATCH', body: { status: 'in_progress' } });
  assert.equal(lateStart.response.status, 409);
  assert.equal(writes.length, 0);
});

test('expired invitations cannot be accepted, and an empty report remains unsent', async () => {
  memberships[0].status = 'invited';
  const expired = await request('associate/assignments/' + ids[0] + '/status', { method: 'PATCH', body: { status: 'accepted' } });
  assert.equal(expired.response.status, 409);
  memberships[0].status = 'accepted';
  const empty = await request('associate/assignments/' + ids[0] + '/status', { method: 'PATCH', body: { status: 'completed', evidence_notes: '' } });
  assert.equal(empty.response.status, 400);
  assert.equal(writes.length, 0);
});

test('a late report enters review and reaches history only after admin approval', async () => {
  const report = await request('associate/assignments/' + ids[0] + '/status', {
    method: 'PATCH', body: { status: 'completed', evidence_notes: 'Pelaksanaan selesai. Catatan dan hasil kegiatan telah dilengkapi.' },
  });
  assert.equal(report.response.status, 200);
  assert.equal(memberships[0].status, 'completed');
  assert.ok(memberships[0].evidence_submitted_at);
  const pending = await request('associate/assignments/' + ids[0]);
  assert.equal(pending.result.data.work_status, 'under_review');
  const review = await request('admin/assignments/' + ids[0] + '/assignees/' + ids[0], {
    admin: true, method: 'PATCH', body: { status: 'reviewed' },
  });
  assert.equal(review.response.status, 200);
  const final = await request('associate/assignments/' + ids[0]);
  assert.equal(final.result.data.work_status, 'completed');
  assert.equal(final.result.data.work_bucket, 'history');
  assert.equal(final.result.data.lifecycle.phase, 'completed');
});

test('admin can pause and resume while outstanding reports prevent premature closure', async () => {
  const pause = await request('admin/assignments/' + ids[2], { admin: true, method: 'PATCH', body: { status: 'paused' } });
  assert.equal(pause.response.status, 200);
  const detail = await request('associate/assignments/' + ids[2]);
  assert.equal(detail.result.data.work_status, 'paused');
  const closed = await request('admin/assignments/' + ids[2], { admin: true, method: 'PATCH', body: { status: 'completed' } });
  assert.equal(closed.response.status, 409);
  const resume = await request('admin/assignments/' + ids[2], { admin: true, method: 'PATCH', body: { status: 'active' } });
  assert.equal(resume.response.status, 200);
  assert.equal(resume.result.data.lifecycle.phase, 'scheduled');
  assert.equal(memberships[2].status, 'accepted');
  const list = await request('admin/assignments?view=follow_up', { admin: true });
  assert.equal(list.response.status, 200);
  assert.deepEqual(new Set(list.result.data.map((row) => row.id)), new Set([ids[0], ids[3], ids[4]]));
});
