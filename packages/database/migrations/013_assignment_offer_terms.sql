begin;

alter table public.assignment_assignees
  add column if not exists transport_amount numeric(18, 2),
  add column if not exists preparation_amount numeric(18, 2),
  add column if not exists invitation_expires_at timestamptz;

alter table public.assignment_assignees
  drop constraint if exists assignment_assignees_transport_amount_check,
  add constraint assignment_assignees_transport_amount_check check (transport_amount is null or transport_amount >= 0),
  drop constraint if exists assignment_assignees_preparation_amount_check,
  add constraint assignment_assignees_preparation_amount_check check (preparation_amount is null or preparation_amount >= 0);

update public.assignment_assignees set role = 'Observer' where role = 'Fasilitator T-BOS';
update public.assignment_assignees set role = 'Pembicara' where role = 'Pembicara LEP';
update public.assignments as assignment set needed_roles = (
  select jsonb_agg(
    case role.value
      when 'Fasilitator T-BOS' then 'Observer'
      when 'Pembicara LEP' then 'Pembicara'
      else role.value
    end order by role.position
  )
  from jsonb_array_elements_text(assignment.needed_roles) with ordinality as role(value, position)
)
where assignment.needed_roles ? 'Fasilitator T-BOS' or assignment.needed_roles ? 'Pembicara LEP';

create or replace function public.guard_assignment_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required_count integer;
  filled_count integer;
begin
  if new.status <> 'accepted' or old.status = 'accepted' then
    return new;
  end if;
  if old.status not in ('invited', 'applied') then
    raise exception 'Undangan tidak lagi dapat diterima';
  end if;
  if new.invitation_expires_at is not null and new.invitation_expires_at <= now() then
    raise exception 'Batas waktu undangan telah lewat';
  end if;
  select needed_count into required_count
  from public.assignments where id = new.assignment_id for update;
  if required_count is null then
    raise exception 'Assignment tidak tersedia';
  end if;
  select count(*) into filled_count from public.assignment_assignees
  where assignment_id = new.assignment_id
    and id <> new.id
    and status in ('accepted', 'in_progress', 'completed', 'reviewed');
  if filled_count >= required_count then
    raise exception 'Seluruh posisi assignment sudah terisi';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_assignment_acceptance() from public;
drop trigger if exists assignment_assignees_acceptance_guard on public.assignment_assignees;
create trigger assignment_assignees_acceptance_guard
before update of status on public.assignment_assignees
for each row
when (new.status = 'accepted' and old.status is distinct from new.status)
execute function public.guard_assignment_acceptance();

create or replace function public.guard_assignment_needed_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  filled_count integer;
begin
  select count(*) into filled_count from public.assignment_assignees
  where assignment_id = new.id
    and status in ('accepted', 'in_progress', 'completed', 'reviewed');
  if new.needed_count < filled_count then
    raise exception 'Jumlah kebutuhan tidak boleh lebih kecil dari posisi terisi';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_assignment_needed_count() from public;
drop trigger if exists assignments_needed_count_guard on public.assignments;
create trigger assignments_needed_count_guard
before update of needed_count on public.assignments
for each row
when (new.needed_count is distinct from old.needed_count)
execute function public.guard_assignment_needed_count();

commit;
