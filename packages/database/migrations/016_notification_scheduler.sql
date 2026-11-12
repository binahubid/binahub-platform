-- Run in the AMS database after 015. The job starts disabled.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;
create schema if not exists ams_scheduler;
revoke all on schema ams_scheduler from public, anon, authenticated, service_role;

create table if not exists ams_scheduler.notification_dispatch (
  singleton boolean primary key default true check(singleton),
  request_id bigint,
  queued_at timestamptz
);
insert into ams_scheduler.notification_dispatch(singleton) values(true) on conflict do nothing;

create or replace function ams_scheduler.dispatch_notifications() returns bigint
language plpgsql security invoker set search_path=pg_catalog as $$
declare state ams_scheduler.notification_dispatch; worker_secret text; queued_request bigint;
begin
  if not exists(select 1 from cron.job where jobname='ams-notification-worker' and username=current_user
    and database=current_database() and active) then return null;end if;
  select * into state from ams_scheduler.notification_dispatch where singleton for update;
  if state.queued_at>clock_timestamp()-interval '55 seconds' then return null;end if;
  if state.request_id is not null and exists(select 1 from net.http_request_queue q where q.id=state.request_id) then return null;end if;
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='ams_notification_worker_secret';
  if worker_secret is null or length(worker_secret) not between 32 and 512 or worker_secret ~ '[[:space:][:cntrl:]]' then
    raise exception 'AMS notification worker secret is not configured in Vault';
  end if;
  select net.http_post(
    url:='https://binahub-platform-api-prl5.vercel.app/api/workers/notifications',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_secret),
    body:='{}'::jsonb,timeout_milliseconds:=55000
  ) into queued_request;
  update ams_scheduler.notification_dispatch set request_id=queued_request,queued_at=clock_timestamp() where singleton;
  return queued_request;
end; $$;

create or replace function ams_scheduler.notification_cron_status() returns jsonb
language sql stable security invoker set search_path=pg_catalog as $$
  select jsonb_build_object('installed',j.jobid is not null,'active',coalesce(j.active,false),'schedule',j.schedule,
    'credentialConfigured',exists(select 1 from vault.secrets where name='ams_notification_worker_secret'),
    'lastQueuedAt',s.queued_at,'httpStatus',r.status_code,
    'httpState',case when s.request_id is null then 'never_queued' when r.id is null then 'pending_or_unknown'
      when r.timed_out then 'timeout' when r.error_msg is not null then 'transport_error'
      when r.status_code=200 then 'processed' else 'http_error' end)
  from ams_scheduler.notification_dispatch s
  left join cron.job j on j.jobname='ams-notification-worker' and j.username=current_user and j.database=current_database()
  left join lateral(select id,status_code,timed_out,error_msg from net._http_response where id=s.request_id order by created desc limit 1) r on true
  where s.singleton;
$$;

create or replace function ams_scheduler.set_notification_cron_enabled(p_enabled boolean) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare job bigint; valid_secret boolean;
begin
  select jobid into job from cron.job where jobname='ams-notification-worker' and username=current_user and database=current_database();
  if job is null then raise exception 'Run AMS migration 016 before enabling its scheduler';end if;
  if p_enabled then
    select exists(select 1 from vault.decrypted_secrets where name='ams_notification_worker_secret'
      and length(decrypted_secret) between 32 and 512 and decrypted_secret !~ '[[:space:][:cntrl:]]') into valid_secret;
    if not valid_secret then raise exception 'Configure ams_notification_worker_secret in AMS Vault first';end if;
  end if;
  perform cron.alter_job(job_id:=job,active:=coalesce(p_enabled,false));
  return ams_scheduler.notification_cron_status();
end; $$;

revoke all on all tables in schema ams_scheduler from public,anon,authenticated,service_role;
revoke all on all functions in schema ams_scheduler from public,anon,authenticated,service_role;
do $$ declare job bigint; begin
  if to_regclass('public.notification_devices') is null then raise exception 'Run AMS migration 015 in this database first';end if;
  if not exists(select 1 from cron.job where jobname='ams-notification-worker' and username=current_user and database=current_database()) then
    select cron.schedule('ams-notification-worker','* * * * *','select ams_scheduler.dispatch_notifications();') into job;
    perform cron.alter_job(job_id:=job,active:=false);
  end if;
end; $$;
commit;
