begin;

alter table public.assignments
  add column if not exists source_system text not null default 'ams',
  add column if not exists external_reference text,
  add column if not exists external_program_id uuid,
  add column if not exists external_program_url text,
  add column if not exists external_module_key text,
  add column if not exists external_scope jsonb not null default '{}'::jsonb,
  add column if not exists integration_status text not null default 'not_linked';

alter table public.assignments drop constraint if exists assignments_source_system_check;
alter table public.assignments add constraint assignments_source_system_check
  check (source_system in ('ams', 'app-binahub'));
alter table public.assignments drop constraint if exists assignments_external_module_key_check;
alter table public.assignments add constraint assignments_external_module_key_check
  check (external_module_key is null or external_module_key ~ '^[a-z][a-z0-9_-]{1,49}$');
alter table public.assignments drop constraint if exists assignments_integration_status_check;
alter table public.assignments add constraint assignments_integration_status_check
  check (integration_status in ('not_linked', 'pending', 'synced', 'failed'));

create unique index if not exists assignments_external_reference_unique
  on public.assignments(source_system, external_reference)
  where external_reference is not null;
create index if not exists assignments_external_program_idx
  on public.assignments(external_program_id, external_module_key)
  where external_program_id is not null;

create table if not exists public.email_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  recipient_email text not null,
  template_key text not null,
  idempotency_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_notification_deliveries_pending_idx
  on public.email_notification_deliveries(status, available_at)
  where status in ('pending', 'processing');

alter table public.email_notification_deliveries enable row level security;
revoke all on table public.email_notification_deliveries from public, anon, authenticated;
grant all on table public.email_notification_deliveries to service_role;

commit;
