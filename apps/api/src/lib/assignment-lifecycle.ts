import { assignmentLifecycle, assignmentWorkState, type AssignmentRecord, type AssigneeRecord } from '@ams/domain';
import { getDb } from './database.js';

type Row = AssignmentRecord & Record<string, unknown> & { id?: string; created_at?: string };
type Participant = AssigneeRecord & {
  assignment_id: string;
  role?: string | null;
  notes?: string | null;
  invited_at?: string | null;
};
const assignmentColumns = 'id,status,start_date,end_date,needed_count';

export async function loadAssignmentTeams(db: ReturnType<typeof getDb>, ids: string[]) {
  const teams = new Map<string, Participant[]>();
  if (!ids.length) return teams;
  for (let first = 0; first < ids.length; first += 100) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from('assignment_assignees')
        .select('assignment_id,status,accepted_at,evidence_url,evidence_notes,evidence_submitted_at')
        .in('assignment_id', ids.slice(first, first + 100))
        .in('status', ['accepted', 'in_progress', 'completed', 'reviewed'])
        .order('id').range(offset, offset + 499);
      if (error) throw new Error('Assignment participants could not be read');
      for (const row of (data || []) as Participant[]) {
        const team = teams.get(row.assignment_id);
        if (team) team.push(row);
        else teams.set(row.assignment_id, [row]);
      }
      if ((data?.length || 0) < 500) break;
    }
  }
  return teams;
}

export function assignmentReadModel(row: Row, participant: Participant | null, team: Participant[], now = Date.now()) {
  const safe = { ...row };
  delete safe.external_scope;
  delete safe.external_reference;
  delete safe.integration_status;
  return {
    ...safe, ...assignmentWorkState(row, participant, team, now),
    my_status: participant?.status || null, my_role: participant?.role || null,
    my_notes: participant?.notes || null, my_invited_at: participant?.invited_at || null,
  };
}

export async function loadAssociateAssignments(db: ReturnType<typeof getDb>, associateId: string) {
  const participants: Participant[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('assignment_assignees')
      .select('assignment_id,status,role,notes,invited_at,accepted_at,invitation_expires_at,evidence_url,evidence_notes,evidence_submitted_at,evidence_reviewed_at,evidence_reviewer_notes')
      .eq('associate_id', associateId).order('id').range(offset, offset + 499);
    if (error) throw new Error('Assignment invitations could not be read');
    participants.push(...((data || []) as Participant[]));
    if ((data?.length || 0) < 500) break;
  }
  const participantMap = new Map(participants.map((row) => [row.assignment_id, row]));
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const { data: open, error: openError } = await db.from('assignments').select('*')
    .eq('status', 'active').eq('source_system', 'ams').is('external_program_id', null)
    .or(`end_date.is.null,end_date.gte.${today}`).limit(100).order('created_at', { ascending: false });
  if (openError) throw new Error('Open assignments could not be read');
  const rows = new Map<string, Row>(((open || []) as Row[]).map((row) => [String(row.id), row]));
  const ownIds = [...participantMap.keys()];
  for (let first = 0; first < ownIds.length; first += 100) {
    const { data: own, error: ownError } = await db.from('assignments').select('*')
      .in('id', ownIds.slice(first, first + 100));
    if (ownError) throw new Error('Assignment history could not be read');
    for (const row of (own || []) as Row[]) rows.set(String(row.id), row);
  }
  const teams = await loadAssignmentTeams(db, [...rows.keys()]);
  const now = Date.now();
  return [...rows.values()].map((row) => assignmentReadModel(row, participantMap.get(String(row.id)) || null, teams.get(String(row.id)) || [], now))
    .filter((row) => row.my_status || row.work_status === 'available')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export function adminAssignmentReadModel(row: Row, team: Participant[], now = Date.now()) {
  return { ...row, lifecycle: assignmentLifecycle(row, team, now) };
}

export async function assignmentPhaseCounts(db: ReturnType<typeof getDb>) {
  const counts = { draft: 0, active: 0, paused: 0, follow_up: 0, ended: 0, completed: 0, cancelled: 0, unknown: 0 };
  const now = Date.now();
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.from('assignments').select(assignmentColumns).order('id').range(offset, offset + 99);
    if (error) throw new Error('Assignment totals could not be read');
    const rows = data || [];
    const teams = await loadAssignmentTeams(db, rows.filter((row) => row.status === 'active').map((row) => row.id));
    for (const row of rows) {
      const lifecycle = assignmentLifecycle(row, teams.get(row.id), now);
      if (lifecycle.is_active) counts.active++;
      else if (lifecycle.phase === 'awaiting_report' || lifecycle.phase === 'under_review') counts.follow_up++;
      else if (Object.hasOwn(counts, lifecycle.phase)) counts[lifecycle.phase as keyof typeof counts]++;
    }
    if (rows.length < 100) break;
  }
  return counts;
}

export async function queueAssignmentSync(db: ReturnType<typeof getDb>, assignmentId: string, assigneeId: string) {
  const { error } = await db.rpc('enqueue_transformation_event', {
    p_type: 'AssignmentAssigneeChanged', p_aggregate_type: 'assignment',
    p_aggregate_id: assignmentId, p_payload: { assignee_id: assigneeId },
  });
  if (error) throw new Error('Assignment synchronization could not be queued');
}

export async function assignmentInvitationIsCurrent(assignmentId: string, associateId: string) {
  const db = getDb();
  const [{ data: assignment, error: assignmentError }, { data: member, error: memberError }] = await Promise.all([
    db.from('assignments').select(assignmentColumns).eq('id', assignmentId).maybeSingle(),
    db.from('assignment_assignees').select('status,invitation_expires_at').eq('assignment_id', assignmentId).eq('associate_id', associateId).maybeSingle(),
  ]);
  if (assignmentError || memberError) throw new Error('Assignment notification context could not be read');
  if (!assignment || !member) return false;
  const teams = await loadAssignmentTeams(db, [assignmentId]);
  return assignmentWorkState(assignment, member, teams.get(assignmentId)).actions.can_accept;
}
