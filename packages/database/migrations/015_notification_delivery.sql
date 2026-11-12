-- Run in the AMS database after migration 014. Existing notices are not broadcast again.
begin;
do $$ begin
  if to_regclass('public.consultant_team_memberships') is null or to_regclass('public.email_notification_deliveries') is null then
    raise exception 'Run migration 015 in the AMS database after migrations 011 and 014';
  end if;
end; $$;
alter table public.notifications
  add column if not exists category text not null default 'system',
  add column if not exists action_required boolean not null default false,
  add column if not exists context jsonb not null default '{}',
  add column if not exists reminder_parent uuid references public.notifications(id) on delete cascade,
  add column if not exists reminder_slot text;
create unique index if not exists notifications_reminder_once on public.notifications(reminder_parent,reminder_slot) where reminder_parent is not null;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  agreements boolean not null default true,
  assignments boolean not null default true,
  schedules boolean not null default true,
  reminders boolean not null default true,
  quiet_start integer not null default 21 check(quiet_start between 0 and 23),
  quiet_end integer not null default 7 check(quiet_end between 0 and 23),
  timezone text not null default 'Asia/Jakarta',
  updated_at timestamptz not null default now()
);
create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_role text not null check(recipient_role in ('associate','admin')),
  device_key uuid not null,
  label text not null check(length(label) between 1 and 80),
  endpoint text not null unique check(length(endpoint) between 20 and 2048),
  p256dh text not null, auth text not null,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id,device_key)
);
create table if not exists public.notification_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.notification_devices(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','processing','accepted','failed','skipped')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid, lease_until timestamptz,
  error_code text, accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(notification_id,device_id)
);
create index if not exists notification_push_due on public.notification_push_deliveries(available_at) where status in ('pending','processing');
create index if not exists notification_devices_user on public.notification_devices(user_id) where active;
create table if not exists public.notification_external_sources (
  source_id uuid not null,
  kind text not null check(kind in ('assignment','schedule','task')),
  version bigint not null default 0,
  event_id uuid,
  recipient_id uuid,
  context jsonb not null default '{}',
  active boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(source_id,kind)
);
create table if not exists public.notification_reminders (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  slot text not null,
  due_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','created','skipped')),
  unique(notification_id,slot)
);
create index if not exists notification_reminders_due on public.notification_reminders(due_at) where status='pending';
create table if not exists public.notification_worker_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  state text not null default 'running',
  summary jsonb not null default '{}'
);
create index if not exists notification_worker_runs_latest on public.notification_worker_runs(started_at desc);
revoke all on table public.notifications from public,anon,authenticated;
grant all on table public.notifications to service_role;
drop policy if exists "Allow all access to notifications" on public.notifications;

create or replace function public.ams_notice_current(p_id uuid) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare n public.notifications; source public.notification_external_sources;
begin
  select * into n from public.notifications where id=p_id;
  if not found then return false; end if;
  if n.reminder_parent is not null then
    return public.ams_notice_current(n.reminder_parent)
      and coalesce(n.context->>'kind'<>'schedule' or (n.context->>'startAt')::timestamptz>now(),true);
  end if;
  if n.recipient_role='associate' and not exists(select 1 from public.associates where id=n.recipient_id and status<>'suspended') then return false; end if;
  if n.context ? 'externalSourceId' then
    select * into source from public.notification_external_sources
      where source_id=(n.context->>'externalSourceId')::uuid and kind=n.context->>'kind';
    return coalesce(source.active and source.recipient_id=n.recipient_id and source.version=(n.context->>'version')::bigint
      and exists(select 1 from public.consultant_team_memberships m join public.associates a on a.id=m.associate_id
        where m.associate_id=n.recipient_id and m.membership_id=(source.context->>'membershipId')::uuid
          and m.status='active' and m.accepted_at is not null and a.status='active'),false);
  end if;
  if n.type='invitation' and n.link='/dashboard/consultant' then
    return exists(select 1 from public.consultant_team_memberships where associate_id=n.recipient_id and invitation_id=n.reference_id and status='invited');
  end if;
  if n.type='invitation' and n.link like '/dashboard/assignments/%' then
    return exists(select 1 from public.assignment_assignees aa join public.assignments a on a.id=aa.assignment_id
      where aa.assignment_id=n.reference_id and aa.associate_id=n.recipient_id and aa.status='invited'
        and (aa.invitation_expires_at is null or aa.invitation_expires_at>now()) and a.status not in ('cancelled','archived','completed'));
  end if;
  return true;
end; $$;

create or replace function public.ams_notice_prepare() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.type='invitation' then new.category:='agreements';new.action_required:=true;end if;
  return new;
end; $$;
drop trigger if exists ams_notice_prepare on public.notifications;
create trigger ams_notice_prepare before insert on public.notifications for each row execute function public.ams_notice_prepare();

create or replace function public.ams_notice_enqueue() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  insert into public.notification_push_deliveries(notification_id,device_id)
    select new.id,id from public.notification_devices where active and user_id=new.recipient_id and recipient_role=new.recipient_role
      and (new.context->>'testDeviceKey' is null or device_key::text=new.context->>'testDeviceKey')
    on conflict do nothing;
  if new.type='invitation' then
    insert into public.notification_reminders(notification_id,slot,due_at) values
      (new.id,'24h',new.created_at+interval '24 hours'),(new.id,'72h',new.created_at+interval '72 hours') on conflict do nothing;
  end if;
  if new.context->>'kind'='schedule' and new.context->>'startAt' is not null
    and new.context->>'status'<>'cancelled' and new.reminder_parent is null then
    insert into public.notification_reminders(notification_id,slot,due_at)
    select new.id,s.slot,(new.context->>'startAt')::timestamptz-s.delta
    from (values('day',interval '24 hours'),('hour',interval '1 hour'))s(slot,delta)
    where (new.context->>'startAt')::timestamptz-s.delta>now() on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists ams_notice_enqueue on public.notifications;
create trigger ams_notice_enqueue after insert on public.notifications for each row execute function public.ams_notice_enqueue();

create or replace function public.ams_notification_device(p_user uuid,p_role text,p_key uuid,p_label text,p_endpoint text,p_p256dh text,p_auth text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare device uuid;
begin
  if p_role not in ('admin','associate') or p_key is null or length(p_label) not between 1 and 80 then raise exception 'DEVICE_INVALID';end if;
  if exists(select 1 from public.notification_devices where endpoint=p_endpoint and user_id<>p_user) then raise exception 'DEVICE_ACCOUNT_CHANGED';end if;
  insert into public.notification_devices(user_id,recipient_role,device_key,label,endpoint,p256dh,auth)
    values(p_user,p_role,p_key,p_label,p_endpoint,p_p256dh,p_auth)
    on conflict(user_id,device_key) do update set recipient_role=excluded.recipient_role,label=excluded.label,
      endpoint=excluded.endpoint,p256dh=excluded.p256dh,auth=excluded.auth,active=true,last_seen_at=now()
    returning id into device;
  return device;
end; $$;

create or replace function public.ams_notification_feed(p_user uuid,p_role text,p_filter text default 'all',p_page integer default 0)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  with source as (
    select n.*,(n.action_required or n.type='invitation') and public.ams_notice_current(n.id) as needs_action
    from public.notifications n where recipient_id=p_user and recipient_role=p_role
  ), filtered as(select * from source where p_filter='all' or p_filter='unread' and read_at is null or p_filter='action' and needs_action),
  rows as(select * from filtered order by created_at desc,id limit 30 offset greatest(0,least(p_page,10000))*30)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'type',type,'category',category,
    'title',title,'message',message,'created_at',created_at,'read',read_at is not null,'actionRequired',needs_action,
    'link','/notifications/open?id='||id)) from rows),'[]'::jsonb),
    'total',(select count(*) from filtered),'unread',(select count(*) from source where read_at is null),
    'actionCount',(select count(*) from source where needs_action),'page',greatest(0,p_page),'pageSize',30);
$$;

create or replace function public.ams_notification_external(p_event jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.notification_external_sources; n uuid; u uuid; v_source uuid; v_kind text; v_version bigint;
begin
  v_source:=(p_event->>'sourceId')::uuid;v_kind:=p_event->>'kind';v_version:=(p_event->>'version')::bigint;u:=(p_event->>'associateId')::uuid;
  if v_kind not in ('assignment','schedule','task') or v_version<1 or v_version>9007199254740991 then raise exception 'NOTICE_INVALID';end if;
  insert into public.notification_external_sources(source_id,kind) values(v_source,v_kind) on conflict do nothing;
  select * into s from public.notification_external_sources where source_id=v_source and kind=v_kind for update;
  if s.version>=v_version then return jsonb_build_object('accepted',true,'duplicate',true);end if;
  update public.notification_external_sources set version=v_version,event_id=(p_event->>'eventId')::uuid,
    recipient_id=u,context=p_event,active=coalesce((p_event->>'active')::boolean,false),updated_at=now()
    where source_id=v_source and kind=v_kind;
  if not coalesce((p_event->>'active')::boolean,false) then return jsonb_build_object('accepted',true,'inactive',true);end if;
  if not exists(select 1 from public.consultant_team_memberships m join public.associates a on a.id=m.associate_id
    where m.associate_id=u and m.membership_id=(p_event->>'membershipId')::uuid and m.status='active' and m.accepted_at is not null and a.status='active')
    then return jsonb_build_object('accepted',true,'inactive',true);end if;
  insert into public.notifications(recipient_id,recipient_role,type,title,message,link,reference_id,category,action_required,context)
    values(u,'associate',case when v_kind='schedule' then 'system' else 'assignment' end,
      case when v_kind='assignment' then 'Penugasan konsultasi baru' when v_kind='task' then 'Tugas konsultasi diperbarui'
        when p_event->>'status'='cancelled' then 'Jadwal konsultasi dibatalkan' else 'Jadwal konsultasi diperbarui' end,
      case when v_kind='assignment' then 'Anda ditunjuk sebagai penanggung jawab konsultasi. Buka portal untuk melihat pekerjaan Anda.'
        when v_kind='task' then 'Periksa tugas dan tenggat pekerjaan Anda di Portal Konsultan.'
        else 'Periksa perubahan jadwal konsultasi Anda di Portal Konsultan.' end,
      '/dashboard/consultant/open?lead='||(p_event->>'leadId'),(p_event->>'eventId')::uuid,
      case when v_kind='schedule' then 'schedules' else 'assignments' end,v_kind<>'schedule',
      p_event||jsonb_build_object('externalSourceId',v_source)) returning id into n;
  perform public.enqueue_transformation_event('NotificationEmailRequested','notification',n,jsonb_build_object('notification_id',n,'template_key','consultant-work'));
  return jsonb_build_object('accepted',true,'notificationId',n);
end; $$;

create or replace function public.ams_notification_generate_reminders(p_limit integer default 50) returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r record; n public.notifications; created uuid; total integer:=0; pref public.notification_preferences; local_hour integer;
begin
  delete from public.notification_worker_runs where started_at<now()-interval '14 days' and state<>'retry_requested';
  for r in select * from public.notification_reminders where status='pending' and due_at<=now() order by due_at
    limit greatest(1,least(p_limit,100)) for update skip locked loop
    select * into n from public.notifications where id=r.notification_id;
    select * into pref from public.notification_preferences where user_id=n.recipient_id;
    if not public.ams_notice_current(n.id) or coalesce(pref.reminders,true)=false
      or n.context->>'kind'='schedule' and (n.context->>'startAt')::timestamptz<=now()
      or r.slot='24h' and n.created_at+interval '72 hours'<=now() then
      update public.notification_reminders set status='skipped' where id=r.id;continue;
    end if;
    local_hour:=extract(hour from now() at time zone coalesce(pref.timezone,'Asia/Jakarta'));
    if coalesce(pref.quiet_start,21)<>coalesce(pref.quiet_end,7) and
      (case when coalesce(pref.quiet_start,21)>coalesce(pref.quiet_end,7) then local_hour>=coalesce(pref.quiet_start,21) or local_hour<coalesce(pref.quiet_end,7)
      else local_hour>=pref.quiet_start and local_hour<pref.quiet_end end) then continue;end if;
    created:=null;
    insert into public.notifications(recipient_id,recipient_role,type,title,message,link,reference_id,category,action_required,context,reminder_parent,reminder_slot)
      values(n.recipient_id,n.recipient_role,'reminder',case when n.type='invitation' then 'Undangan Anda belum direspons' else 'Pengingat jadwal konsultasi' end,
        case when n.type='invitation' then 'Tinjau undangan di AMS dan berikan keputusan Anda.' else 'Anda memiliki jadwal konsultasi yang akan datang. Periksa rincian di portal.' end,
        n.link,r.id,n.category,n.action_required,n.context,n.id,r.slot) on conflict do nothing returning id into created;
    if created is not null then
      perform public.enqueue_transformation_event('NotificationEmailRequested','notification',created,jsonb_build_object('notification_id',created,'template_key','notification-reminder'));
      total:=total+1;
    end if;
    update public.notification_reminders set status='created' where id=r.id;
  end loop;
  return total;
end; $$;

create or replace function public.ams_notification_claim(p_lease uuid,p_limit integer default 20) returns setof public.notification_push_deliveries
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  update public.notification_push_deliveries set status='failed',error_code='LEASE_EXPIRED',lease_token=null,lease_until=null
    where status='processing' and lease_until<now() and attempts>=6;
  return query with due as(select id from public.notification_push_deliveries where attempts<6 and
    (status='pending' and available_at<=now() or status='processing' and lease_until<now())
    order by available_at limit greatest(1,least(p_limit,50)) for update skip locked)
  update public.notification_push_deliveries d set status='processing',lease_token=p_lease,lease_until=now()+interval '2 minutes',attempts=attempts+1
    from due where d.id=due.id returning d.*;
end; $$;

create or replace function public.ams_notification_finish(p_id uuid,p_lease uuid,p_status text,p_error text default null,p_wait integer default 0)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if p_status not in ('pending','accepted','failed','skipped') then raise exception 'NOTICE_INVALID';end if;
  update public.notification_push_deliveries set status=case when p_status='pending' and attempts>=6 then 'failed' else p_status end,
    error_code=left(p_error,80),lease_until=null,lease_token=null,available_at=now()+make_interval(secs=>greatest(0,least(p_wait,86400))),
    attempts=case when p_error='QUIET_HOURS' then greatest(0,attempts-1) else attempts end,
    accepted_at=case when p_status='accepted' then now() else accepted_at end where id=p_id and status='processing' and lease_token=p_lease;
  return found;
end; $$;

create or replace function public.ams_notification_test(p_user uuid,p_role text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare notice uuid;
begin
  perform 1 from public.notification_devices where user_id=p_user and recipient_role=p_role and device_key=p_key and active for update;
  if not found or exists(select 1 from public.notifications where recipient_id=p_user and context->>'testDeviceKey'=p_key::text
    and created_at>now()-interval '1 minute') then raise exception 'DEVICE_TEST_UNAVAILABLE';end if;
  insert into public.notifications(recipient_id,recipient_role,type,title,message,context)
    values(p_user,p_role,'system','Notifikasi HP terhubung','Notifikasi uji untuk perangkat Anda.',jsonb_build_object('testDeviceKey',p_key)) returning id into notice;
  return notice;
end; $$;

create or replace function public.ams_notification_operations(p_page integer default 0) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  with delivery as(
    select d.id,'push'::text channel,d.notification_id,d.status,d.attempts,d.created_at,d.accepted_at,d.error_code reason,device.label device_label
      from public.notification_push_deliveries d join public.notification_devices device on device.id=d.device_id
    union all
    select id,'email',notification_id,status,attempts,created_at,sent_at,
      case when status='failed' then 'EMAIL_FAILED' when status='skipped' then 'PREFERENCE_OR_SOURCE' else null end,null
      from public.email_notification_deliveries
  ),rows as(select d.*,n.title,n.read_at from delivery d join public.notifications n on n.id=d.notification_id
    order by d.created_at desc,d.id limit 30 offset greatest(0,least(p_page,10000))*30)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(rows)) from rows),'[]'::jsonb),
    'total',(select count(*) from delivery),'pending',(select count(*) from delivery where status in ('pending','processing')),
    'failed',(select count(*) from delivery where status='failed'),'accepted',(select count(*) from delivery where status in ('accepted','sent')),
    'devices',(select count(*) from public.notification_devices where active),
    'waiting',(select count(*) from public.notifications where type='invitation' and public.ams_notice_current(id)),
    'lastRun',(select to_jsonb(r) from public.notification_worker_runs r where state<>'retry_requested' order by started_at desc limit 1),'page',greatest(0,p_page));
$$;

create or replace function public.ams_notification_retry(p_actor uuid,p_id uuid,p_channel text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare delivery uuid; notice uuid;
begin
  if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='admin') then raise exception 'NOTICE_ADMIN_REQUIRED';end if;
  if p_channel='push' then
    update public.notification_push_deliveries set status='pending',attempts=0,available_at=now(),error_code=null
      where id=p_id and status='failed' returning notification_id into notice;
    if not found then raise exception 'NOTICE_CONFLICT';end if;
  elsif p_channel='email' then
    update public.email_notification_deliveries set status='pending',attempts=0,available_at=now(),last_error=null,updated_at=now()
      where id=p_id and status='failed' returning id,notification_id into delivery,notice;
    if not found then raise exception 'NOTICE_CONFLICT';end if;
    perform public.enqueue_transformation_event('NotificationEmailRequested','notification',notice,jsonb_build_object('delivery_id',delivery));
  else raise exception 'NOTICE_INVALID';end if;
  insert into public.notification_worker_runs(state,finished_at,summary) values('retry_requested',now(),jsonb_build_object('actor',p_actor,'delivery',p_id,'channel',p_channel));
  return true;
end; $$;

do $$ declare t text; f record; begin
  foreach t in array array['notification_preferences','notification_devices','notification_push_deliveries','notification_external_sources','notification_reminders','notification_worker_runs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from public,anon,authenticated',t);
    execute format('grant all on table public.%I to service_role',t);
  end loop;
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and (p.proname like 'ams_notice%' or p.proname like 'ams_notification%') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end; $$;
commit;
