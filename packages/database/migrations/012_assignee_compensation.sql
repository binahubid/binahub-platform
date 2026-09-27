begin;

alter table public.assignment_assignees
  add column if not exists compensation_amount numeric(18, 2),
  add column if not exists compensation_currency text,
  add column if not exists compensation_basis text,
  add column if not exists compensation_notes text,
  add column if not exists compensation_updated_at timestamptz,
  add column if not exists compensation_updated_by uuid;

alter table public.assignment_assignees
  drop constraint if exists assignment_assignees_compensation_amount_check,
  add constraint assignment_assignees_compensation_amount_check
    check (compensation_amount is null or compensation_amount >= 0),
  drop constraint if exists assignment_assignees_compensation_currency_check,
  add constraint assignment_assignees_compensation_currency_check
    check (compensation_currency is null or compensation_currency ~ '^[A-Z]{3}$'),
  drop constraint if exists assignment_assignees_compensation_basis_check,
  add constraint assignment_assignees_compensation_basis_check
    check (compensation_basis is null or compensation_basis in (
      'fixed_project',
      'per_day',
      'per_session',
      'per_hour',
      'per_deliverable',
      'other'
    )),
  drop constraint if exists assignment_assignees_compensation_override_check,
  add constraint assignment_assignees_compensation_override_check
    check (
      (compensation_amount is null and compensation_currency is null and compensation_basis is null)
      or
      (compensation_amount is not null and compensation_currency is not null and compensation_basis is not null)
    ),
  drop constraint if exists assignment_assignees_compensation_notes_check,
  add constraint assignment_assignees_compensation_notes_check
    check (compensation_notes is null or char_length(compensation_notes) <= 2000);

comment on column public.assignment_assignees.compensation_amount is
  'Nilai kompensasi khusus associate. NULL berarti mengikuti kompensasi default assignment.';
comment on column public.assignment_assignees.compensation_basis is
  'Satuan kompensasi khusus: fixed_project, per_day, per_session, per_hour, per_deliverable, atau other.';

create table if not exists public.assignment_compensation_history (
  id uuid primary key default gen_random_uuid(),
  assignment_assignee_id uuid references public.assignment_assignees(id) on delete set null,
  assignment_id uuid not null,
  associate_id uuid not null,
  previous_amount numeric(18, 2),
  previous_currency text,
  previous_basis text,
  previous_notes text,
  new_amount numeric(18, 2),
  new_currency text,
  new_basis text,
  new_notes text,
  change_type text not null check (change_type in ('override_set', 'override_updated', 'inherit_default')),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists assignment_compensation_history_assignee_idx
  on public.assignment_compensation_history(assignment_assignee_id, changed_at desc);
create index if not exists assignment_compensation_history_assignment_idx
  on public.assignment_compensation_history(assignment_id, changed_at desc);

alter table public.assignment_compensation_history enable row level security;
revoke all on table public.assignment_compensation_history from public, anon, authenticated;
grant all on table public.assignment_compensation_history to service_role;

create or replace function public.record_assignment_compensation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.assignment_compensation_history (
    assignment_assignee_id,
    assignment_id,
    associate_id,
    previous_amount,
    previous_currency,
    previous_basis,
    previous_notes,
    new_amount,
    new_currency,
    new_basis,
    new_notes,
    change_type,
    changed_by,
    changed_at
  ) values (
    new.id,
    new.assignment_id,
    new.associate_id,
    old.compensation_amount,
    old.compensation_currency,
    old.compensation_basis,
    old.compensation_notes,
    new.compensation_amount,
    new.compensation_currency,
    new.compensation_basis,
    new.compensation_notes,
    case
      when new.compensation_amount is null then 'inherit_default'
      when old.compensation_amount is null then 'override_set'
      else 'override_updated'
    end,
    new.compensation_updated_by,
    coalesce(new.compensation_updated_at, now())
  );
  return new;
end;
$$;

revoke all on function public.record_assignment_compensation_change() from public;

drop trigger if exists assignment_assignees_compensation_audit on public.assignment_assignees;
create trigger assignment_assignees_compensation_audit
after update of compensation_amount, compensation_currency, compensation_basis, compensation_notes
on public.assignment_assignees
for each row
when (
  old.compensation_amount is distinct from new.compensation_amount
  or old.compensation_currency is distinct from new.compensation_currency
  or old.compensation_basis is distinct from new.compensation_basis
  or old.compensation_notes is distinct from new.compensation_notes
)
execute function public.record_assignment_compensation_change();

create or replace function public.record_initial_assignment_compensation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.compensation_amount is null then
    return new;
  end if;

  insert into public.assignment_compensation_history (
    assignment_assignee_id,
    assignment_id,
    associate_id,
    previous_amount,
    previous_currency,
    previous_basis,
    previous_notes,
    new_amount,
    new_currency,
    new_basis,
    new_notes,
    change_type,
    changed_by,
    changed_at
  ) values (
    new.id,
    new.assignment_id,
    new.associate_id,
    null,
    null,
    null,
    null,
    new.compensation_amount,
    new.compensation_currency,
    new.compensation_basis,
    new.compensation_notes,
    'override_set',
    new.compensation_updated_by,
    coalesce(new.compensation_updated_at, now())
  );
  return new;
end;
$$;

revoke all on function public.record_initial_assignment_compensation() from public;

drop trigger if exists assignment_assignees_initial_compensation_audit on public.assignment_assignees;
create trigger assignment_assignees_initial_compensation_audit
after insert on public.assignment_assignees
for each row
when (new.compensation_amount is not null)
execute function public.record_initial_assignment_compensation();

commit;
