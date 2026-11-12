-- AMS only. Start delivery for new queued notifications using the existing worker secret.
begin;
do $$ begin
  if to_regclass('public.notification_push_deliveries') is null
    or to_regprocedure('ams_scheduler.notification_cron_status()') is null
  then raise exception 'Apply AMS migrations 015 and 016 before 017'; end if;
end; $$;

create or replace function public.ams_notification_claim_new(
  p_lease uuid, p_notice uuid, p_limit integer default 10
) returns setof public.notification_push_deliveries
language sql security definer set search_path=pg_catalog,public as $$
  with ready as (
    select id
    from public.notification_push_deliveries
    where notification_id=p_notice and status='pending' and attempts=0 and available_at<=now()
    order by available_at,id
    limit greatest(1,least(p_limit,10))
    for update skip locked
  )
  update public.notification_push_deliveries d
  set status='processing', lease_token=p_lease, lease_until=now()+interval '2 minutes', attempts=d.attempts+1
  from ready where d.id=ready.id
  returning d.*;
$$;
revoke all on function public.ams_notification_claim_new(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.ams_notification_claim_new(uuid,uuid,integer) to service_role;

create or replace function ams_scheduler.dispatch_new_notifications()
returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare worker_secret text; notice uuid;
begin
  if not exists(select 1 from new_deliveries where status='pending' and attempts=0 and available_at<=now()) then return null; end if;
  if not exists(select 1 from cron.job where jobname='ams-notification-worker'
    and username=current_user and database=current_database() and active) then return null; end if;

  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='ams_notification_worker_secret';
  if worker_secret is null or length(worker_secret) not between 32 and 512 or worker_secret ~ '[[:space:][:cntrl:]]' then return null; end if;

  for notice in select distinct notification_id from new_deliveries where status='pending' and attempts=0 and available_at<=now() loop
    perform net.http_post(
      url:='https://binahub-platform-api-prl5.vercel.app/api/workers/notifications/dispatch',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_secret),
      body:=jsonb_build_object('id',notice),
      timeout_milliseconds:=25000
    );
  end loop;
  return null;
exception when others then
  raise log 'AMS notification wake-up deferred to Cron (%).', sqlstate;
  return null;
end; $$;
revoke all on function ams_scheduler.dispatch_new_notifications() from public,anon,authenticated,service_role;
drop trigger if exists ams_push_dispatch_new on public.notification_push_deliveries;
create trigger ams_push_dispatch_new after insert on public.notification_push_deliveries
referencing new table as new_deliveries for each statement execute function ams_scheduler.dispatch_new_notifications();

create or replace function public.ams_notification_test(p_user uuid,p_role text,p_key uuid)
returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare notice uuid;
begin
  if p_role is distinct from 'admin' or not exists(
    select 1 from auth.users where id=p_user and raw_app_meta_data->>'role'='admin'
  ) then raise exception 'DEVICE_TEST_FORBIDDEN' using errcode='42501'; end if;

  perform 1 from public.notification_devices where user_id=p_user and recipient_role='admin' and device_key=p_key and active for update;
  if not found or exists(
    select 1 from public.notifications where recipient_id=p_user and context->>'testDeviceKey'=p_key::text
      and created_at>now()-interval '1 minute'
  ) then raise exception 'DEVICE_TEST_UNAVAILABLE'; end if;

  insert into public.notifications(recipient_id,recipient_role,type,title,message,context)
  values(p_user,'admin','system','Notifikasi HP terhubung','Notifikasi uji untuk perangkat Anda.',jsonb_build_object('testDeviceKey',p_key))
  returning id into notice;
  return notice;
end; $$;
revoke all on function public.ams_notification_test(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.ams_notification_test(uuid,text,uuid) to service_role;
commit;
