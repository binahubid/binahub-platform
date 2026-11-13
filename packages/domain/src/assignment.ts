export type AssignmentRecord = {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  needed_count?: number | null;
  external_program_id?: string | null;
  external_module_key?: string | null;
};

export type AssigneeRecord = {
  status?: string | null;
  accepted_at?: string | null;
  invitation_expires_at?: string | null;
  evidence_url?: string | null;
  evidence_notes?: string | null;
  evidence_submitted_at?: string | null;
  evidence_reviewed_at?: string | null;
  evidence_reviewer_notes?: string | null;
};

function boundary(value: string | null | undefined, end = false): number | null {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    const utc = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== value) return null;
  }
  const parsed = Date.parse(dateOnly ? value + 'T00:00:00+07:00' : value);
  return Number.isFinite(parsed) ? parsed + (dateOnly && end ? 86_400_000 : 0) : null;
}

const phaseLabels: Record<string, string> = {
  draft: 'Draf', open: 'Terbuka', scheduled: 'Terjadwal', in_progress: 'Berlangsung',
  ended: 'Jadwal berakhir', awaiting_report: 'Menunggu laporan', under_review: 'Menunggu peninjauan',
  paused: 'Dijeda', completed: 'Selesai', cancelled: 'Dibatalkan', unknown: 'Perlu diperiksa',
};

const workLabels: Record<string, string> = {
  ...phaseLabels, available: 'Terbuka untuk lamaran', invited: 'Menunggu respons', applied: 'Menunggu keputusan',
  accepted: 'Siap bertugas', declined: 'Undangan ditolak', withdrawn: 'Mengundurkan diri',
  expired: 'Undangan berakhir', closed: 'Pendaftaran ditutup', revision_required: 'Perlu revisi laporan',
};

export function hasAssignmentReport(assignee: AssigneeRecord): boolean {
  return Boolean(assignee.evidence_submitted_at || assignee.evidence_url?.trim() || assignee.evidence_notes?.trim());
}

function engagedAssignee(assignee: AssigneeRecord) {
  if (assignee.status === 'completed') return Boolean(assignee.accepted_at || hasAssignmentReport(assignee));
  return ['accepted', 'in_progress', 'reviewed'].includes(assignee.status || '');
}

export function assignmentLifecycle(assignment: AssignmentRecord, team: AssigneeRecord[] = [], now = Date.now()) {
  const start = boundary(assignment.start_date);
  const end = boundary(assignment.end_date, true);
  const ended = end !== null && now >= end;
  const engaged = team.filter(engagedAssignee);
  const allReviewed = engaged.length > 0 && (ended || engaged.length >= (assignment.needed_count || 1)) && engaged.every((row) => row.status === 'reviewed');
  const awaitingReport = engaged.some((row) => ['accepted', 'in_progress'].includes(row.status || '') || (row.status === 'completed' && !hasAssignmentReport(row)));
  const underReview = engaged.some((row) => row.status === 'completed' && hasAssignmentReport(row));
  let phase: string;
  if (['draft', 'paused', 'cancelled', 'completed'].includes(assignment.status || '')) phase = assignment.status!;
  else if (assignment.status !== 'active') phase = 'unknown';
  else if (allReviewed) phase = 'completed';
  else if (ended) phase = awaitingReport ? 'awaiting_report' : underReview ? 'under_review' : 'ended';
  else if (engaged.length >= (assignment.needed_count || 1) && !awaitingReport && underReview) phase = 'under_review';
  else if (start !== null && now < start) phase = 'scheduled';
  else if (start !== null) phase = 'in_progress';
  else phase = 'open';

  const active = ['open', 'scheduled', 'in_progress'].includes(phase);
  const group: 'active' | 'follow_up' | 'draft' | 'history' = active ? 'active'
    : ['paused', 'awaiting_report', 'under_review'].includes(phase) ? 'follow_up'
    : phase === 'draft' ? 'draft' : 'history';
  const next = active ? [start, end].filter((value): value is number => value !== null && value > now).sort((a, b) => a - b)[0] : undefined;
  return {
    phase, label: phaseLabels[phase], is_active: active, ended,
    group,
    all_reviewed: allReviewed, filled_count: engaged.length,
    schedule_incomplete: start === null || end === null,
    next_transition_at: next === undefined ? null : new Date(next).toISOString(),
  };
}

export function assignmentWorkState(assignment: AssignmentRecord, assignee: AssigneeRecord | null, team: AssigneeRecord[] = [], now = Date.now()) {
  const lifecycle = assignmentLifecycle(assignment, team, now);
  const raw = assignee?.status || '';
  const expired = Boolean(assignee?.invitation_expires_at && (boundary(assignee.invitation_expires_at) ?? Infinity) <= now);
  const report = assignee ? hasAssignmentReport(assignee) : false;
  const revision = raw === 'in_progress' && Boolean(assignee?.evidence_reviewed_at && assignee.evidence_reviewer_notes?.trim());
  let status: string;
  if (['declined', 'withdrawn', 'cancelled', 'expired'].includes(raw)) status = raw;
  else if (raw === 'reviewed') status = 'completed';
  else if (lifecycle.phase === 'cancelled') status = 'cancelled';
  else if (['invited', 'applied'].includes(raw) && (expired || lifecycle.ended || ['completed', 'under_review'].includes(lifecycle.phase))) status = raw === 'invited' ? 'expired' : 'closed';
  else if (lifecycle.phase === 'paused') status = 'paused';
  else if (['draft', 'unknown'].includes(lifecycle.phase)) status = lifecycle.phase;
  else if (raw === 'completed' && report) status = 'under_review';
  else if (revision) status = 'revision_required';
  else if (raw === 'completed') status = assignee?.accepted_at ? 'awaiting_report' : 'closed';
  else if (['accepted', 'in_progress'].includes(raw) && (lifecycle.ended || lifecycle.phase === 'completed')) status = 'awaiting_report';
  else if (['accepted', 'in_progress'].includes(raw) && lifecycle.phase === 'scheduled') status = 'scheduled';
  else if (raw === 'accepted') status = 'accepted';
  else if (['invited', 'applied', 'in_progress'].includes(raw)) status = raw;
  else if (!assignee) status = lifecycle.is_active && !assignment.external_program_id && lifecycle.filled_count < (assignment.needed_count || 1) ? 'available' : 'closed';
  else status = 'unknown';

  const bucket = ['available', 'invited', 'applied', 'accepted', 'scheduled', 'in_progress'].includes(status)
    ? 'active' : ['paused', 'awaiting_report', 'under_review', 'revision_required'].includes(status) ? 'follow_up' : 'history';
  const canWork = !['cancelled', 'draft', 'paused', 'unknown'].includes(lifecycle.phase);
  const start = boundary(assignment.start_date);
  const started = start === null || now >= start;
  const deadline = raw === 'invited' && !expired ? boundary(assignee?.invitation_expires_at) : null;
  const next = [lifecycle.next_transition_at ? Date.parse(lifecycle.next_transition_at) : null, deadline]
    .filter((value): value is number => value !== null && value > now).sort((a, b) => a - b)[0];
  return {
    lifecycle, work_status: status, work_status_label: workLabels[status] || phaseLabels.unknown,
    work_bucket: bucket, is_active: bucket === 'active',
    next_transition_at: next === undefined ? null : new Date(next).toISOString(),
    actions: {
      can_apply: status === 'available',
      can_accept: raw === 'invited' && lifecycle.is_active && !expired && lifecycle.filled_count < (assignment.needed_count || 1),
      can_decline: raw === 'invited' && !expired && !lifecycle.ended && ['open', 'scheduled', 'in_progress', 'paused'].includes(lifecycle.phase),
      can_start: raw === 'accepted' && lifecycle.is_active && started,
      can_log_progress: raw === 'in_progress' && lifecycle.is_active && started,
      can_submit_report: canWork && started && (raw === 'in_progress' || status === 'awaiting_report'),
      can_withdraw: (lifecycle.is_active || lifecycle.phase === 'paused') && !lifecycle.ended && ['accepted', 'in_progress'].includes(raw),
    },
  };
}

export function assignmentStatusForApp(assignment: AssignmentRecord, participation: string) {
  if (!['invited', 'applied', 'accepted', 'in_progress'].includes(participation)) return participation;
  if (assignment.status === 'cancelled') return 'cancelled';
  if (assignment.status === 'completed') return ['invited', 'applied'].includes(participation) ? 'cancelled' : 'completed';
  return participation;
}
