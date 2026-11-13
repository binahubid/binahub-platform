export type AssignmentLifecycle = {
  phase: string;
  group?: 'active' | 'follow_up' | 'draft' | 'history';
  label: string;
  is_active: boolean;
  ended: boolean;
  all_reviewed: boolean;
  filled_count: number;
  schedule_incomplete: boolean;
  next_transition_at: string | null;
};

export type AssignmentWork = {
  lifecycle?: AssignmentLifecycle;
  work_status?: string;
  work_status_label?: string;
  work_bucket?: 'active' | 'follow_up' | 'history';
  next_transition_at?: string | null;
  is_active?: boolean;
  actions?: {
    can_apply: boolean;
    can_accept: boolean;
    can_decline: boolean;
    can_start: boolean;
    can_log_progress: boolean;
    can_submit_report: boolean;
    can_withdraw: boolean;
  };
};

const labels: Record<string, string> = {
  draft: 'Draf', active: 'Aktif', open: 'Terbuka', available: 'Terbuka untuk lamaran',
  scheduled: 'Terjadwal', accepted: 'Siap bertugas', in_progress: 'Berlangsung',
  paused: 'Dijeda', ended: 'Jadwal berakhir', awaiting_report: 'Menunggu laporan',
  under_review: 'Menunggu peninjauan', revision_required: 'Perlu revisi laporan',
  completed: 'Selesai', reviewed: 'Selesai', cancelled: 'Dibatalkan',
  invited: 'Menunggu respons', applied: 'Menunggu keputusan', declined: 'Undangan ditolak',
  withdrawn: 'Mengundurkan diri', expired: 'Undangan berakhir', closed: 'Pendaftaran ditutup',
};

export function assignmentStatusLabel(status: string) {
  return labels[status] || 'Perlu diperiksa';
}

export function assignmentStatusTone(status: string) {
  if (['cancelled', 'declined'].includes(status)) return 'bg-rose-50 text-rose-800';
  if (['completed', 'reviewed', 'in_progress', 'active'].includes(status)) return 'bg-emerald-50 text-emerald-800';
  if (['invited', 'paused', 'awaiting_report', 'revision_required', 'under_review'].includes(status)) return 'bg-amber-50 text-amber-900';
  if (['open', 'available', 'applied', 'scheduled', 'accepted'].includes(status)) return 'bg-blue-50 text-[#0B2C6B]';
  return 'bg-slate-100 text-slate-700';
}

export function formatAssignmentDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' });
}

export function nextAssignmentTransition(rows: { next_transition_at?: string | null }[]) {
  return rows.reduce<string | null>((soonest, row) => {
    const next = row.next_transition_at;
    return next && (!soonest || next < soonest) ? next : soonest;
  }, null);
}
