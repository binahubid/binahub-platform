-- Run on the AMS database. No invitations, emails or memberships are created by installation.
begin;
do $$ begin
  if to_regclass('public.associates') is null or to_regclass('public.notifications') is null then
    raise exception 'Use the AMS database for migration 014, not the APP database';
  end if;
end $$;

create table if not exists public.consultant_team_memberships (
  associate_id uuid primary key references public.associates(id),
  membership_id uuid not null unique default gen_random_uuid(),
  invitation_id uuid not null unique default gen_random_uuid(),
  status text not null check(status in ('invited','active','paused','ended','declined')),
  revision integer not null default 1 check(revision>0),
  agreement_text text not null check(length(btrim(agreement_text)) between 40 and 16000),
  compensation_terms text not null check(length(btrim(compensation_terms)) between 5 and 2000),
  agreement_hash text not null,
  invited_by uuid not null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid not null,
  sync_status text not null default 'pending' check(sync_status in ('pending','synced','failed')),
  synced_revision integer,
  sync_error text
);
create table if not exists public.consultant_team_history (
  id uuid primary key default gen_random_uuid(),
  associate_id uuid not null references public.consultant_team_memberships(associate_id),
  revision integer not null,
  action text not null,
  actor_id uuid not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(associate_id,revision)
);
alter table public.consultant_team_memberships enable row level security;
alter table public.consultant_team_history enable row level security;
revoke all on public.consultant_team_memberships,public.consultant_team_history from public,anon,authenticated;
grant all on public.consultant_team_memberships,public.consultant_team_history to service_role;

create or replace function public.consultant_team_change(
  p_actor uuid,p_associate uuid,p_action text,p_revision integer,p_data jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.consultant_team_memberships; actor_admin boolean; v_status text; v_name text;
begin
  select coalesce(raw_app_meta_data->>'role','')='admin' into actor_admin from auth.users where id=p_actor;
  if p_action in ('accept','decline') then
    if p_actor<>p_associate then raise exception 'TEAM_FORBIDDEN'; end if;
  elsif not coalesce(actor_admin,false) then raise exception 'TEAM_ADMIN_REQUIRED';
  end if;
  perform 1 from public.associates where id=p_associate for update;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  select * into m from public.consultant_team_memberships where associate_id=p_associate for update;
  if coalesce(m.revision,0) is distinct from p_revision then raise exception 'TEAM_CONFLICT'; end if;
  if p_action='invite' then
    if m.status in ('active','invited') then raise exception 'TEAM_ALREADY_INVITED'; end if;
    if not exists(select 1 from public.associates where id=p_associate and status='active') then
      raise exception 'TEAM_ASSOCIATE_INACTIVE';
    end if;
    if p_data->>'agreementText' is null or length(btrim(p_data->>'agreementText')) not between 40 and 16000
      or p_data->>'compensationTerms' is null or length(btrim(p_data->>'compensationTerms')) not between 5 and 2000
      or (p_data->>'reviewed') is distinct from 'true' then raise exception 'TEAM_AGREEMENT_REQUIRED'; end if;
    insert into public.consultant_team_memberships(
      associate_id,status,revision,agreement_text,compensation_terms,agreement_hash,invited_by,updated_by
    ) values(p_associate,'invited',p_revision+1,btrim(p_data->>'agreementText'),btrim(p_data->>'compensationTerms'),
      encode(sha256(convert_to(jsonb_build_object('text',btrim(p_data->>'agreementText'),
        'compensation',btrim(p_data->>'compensationTerms'))::text,'utf8')),'hex'),p_actor,p_actor)
    on conflict(associate_id) do update set status='invited',revision=excluded.revision,
      invitation_id=gen_random_uuid(),agreement_text=excluded.agreement_text,compensation_terms=excluded.compensation_terms,
      agreement_hash=excluded.agreement_hash,invited_by=p_actor,invited_at=now(),accepted_at=null,
      updated_by=p_actor,updated_at=now(),sync_status='pending',sync_error=null returning * into m;
    insert into public.notifications(recipient_id,recipient_role,type,title,message,link,reference_id)
      values(p_associate,'associate','invitation','Undangan Tim Konsultan BinaHub',
        'BinaHub mengundang Anda untuk bergabung sebagai tim konsultan. Tinjau perjanjian kerja sama dan ketentuan kompensasi sebelum memberi keputusan.',
        '/dashboard/consultant',m.invitation_id);
  else
    if m.associate_id is null then raise exception 'TEAM_NOT_FOUND'; end if;
    if p_action in ('accept','decline') then
      if m.status<>'invited' or (p_data->>'invitationId') is distinct from m.invitation_id::text
        then raise exception 'TEAM_CONFLICT'; end if;
      if p_action='accept' then
        if (p_data->>'consent') is distinct from 'true' or (p_data->>'agreementHash') is distinct from m.agreement_hash
          then raise exception 'TEAM_AGREEMENT_REQUIRED'; end if;
        if not exists(select 1 from public.associates where id=p_associate and status='active')
          then raise exception 'TEAM_ASSOCIATE_INACTIVE'; end if;
      end if;
      v_status:=case when p_action='accept' then 'active' else 'declined' end;
    elsif p_action='pause' and m.status='active' then v_status:='paused';
    elsif p_action='resume' and m.status='paused' and m.accepted_at is not null then
      if not exists(select 1 from public.associates where id=p_associate and status='active')
        then raise exception 'TEAM_ASSOCIATE_INACTIVE'; end if;
      v_status:='active';
    elsif p_action='end' and m.status in ('active','paused','invited') then v_status:='ended';
    else raise exception 'TEAM_INVALID_TRANSITION'; end if;
    update public.consultant_team_memberships set status=v_status,revision=revision+1,
      accepted_at=case when p_action='accept' then now() else accepted_at end,
      updated_at=now(),updated_by=p_actor,sync_status='pending',sync_error=null
      where associate_id=p_associate returning * into m;
  end if;
  insert into public.consultant_team_history(associate_id,revision,action,actor_id,snapshot)
    values(p_associate,m.revision,p_action,p_actor,to_jsonb(m)-'sync_error');
  perform public.enqueue_transformation_event(
    'ConsultantMembershipChanged','associate',p_associate,jsonb_build_object('associateId',p_associate));
  return to_jsonb(m);
end; $$;
revoke all on function public.consultant_team_change(uuid,uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.consultant_team_change(uuid,uuid,text,integer,jsonb) to service_role;

create or replace function public.consultant_team_directory(p_page integer default 0,p_search text default '',p_status text default 'all')
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
  if p_page not between 0 and 10000 or length(p_search)>150
    or p_status not in ('all','invited','active','paused','ended','declined') then raise exception 'TEAM_INVALID'; end if;
  with matched as(
    select m.*,a.email,a.status associate_status,coalesce(p.full_name,a.email) full_name
    from public.consultant_team_memberships m join public.associates a on a.id=m.associate_id
    left join public.associate_profiles p on p.associate_id=a.id
    where (p_status='all' or m.status=p_status)
      and (p_search='' or strpos(lower(a.email||' '||coalesce(p.full_name,'')),lower(p_search))>0)
  ) select jsonb_build_object('total',(select count(*) from matched),'page',p_page,'pageSize',20,
    'members',coalesce((select jsonb_agg(to_jsonb(t)-'agreement_text'-'compensation_terms'-'agreement_hash'-'sync_error')
      from (select * from matched order by updated_at desc,associate_id limit 20 offset p_page*20)t),'[]'::jsonb))
    into result;
  return result;
end; $$;
revoke all on function public.consultant_team_directory(integer,text,text) from public,anon,authenticated;
grant execute on function public.consultant_team_directory(integer,text,text) to service_role;

create or replace function public.consultant_team_candidates(p_search text default '')
returns table(id uuid,email text,full_name text,revision integer,membership_status text)
language sql stable security definer set search_path=pg_catalog,public as $$
  select a.id,a.email,coalesce(p.full_name,a.email),coalesce(m.revision,0),m.status
  from public.associates a left join public.associate_profiles p on p.associate_id=a.id
  left join public.consultant_team_memberships m on m.associate_id=a.id
  where a.status='active' and coalesce(m.status,'') not in ('active','invited')
    and length(p_search)<=150
    and (p_search='' or strpos(lower(a.email||' '||coalesce(p.full_name,'')),lower(p_search))>0)
  order by coalesce(p.full_name,a.email),a.id limit 20;
$$;
revoke all on function public.consultant_team_candidates(text) from public,anon,authenticated;
grant execute on function public.consultant_team_candidates(text) to service_role;

create or replace function public.consultant_team_associate_changed()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if (new.status is distinct from old.status or new.email is distinct from old.email)
    and exists(select 1 from public.consultant_team_memberships where associate_id=new.id) then
    update public.consultant_team_memberships set sync_status='pending' where associate_id=new.id;
    perform public.enqueue_transformation_event(
      'ConsultantMembershipChanged','associate',new.id,jsonb_build_object('associateId',new.id));
  end if;
  return new;
end; $$;
revoke all on function public.consultant_team_associate_changed() from public,anon,authenticated;
drop trigger if exists consultant_team_associate_sync on public.associates;
create trigger consultant_team_associate_sync after update of status,email on public.associates
  for each row execute function public.consultant_team_associate_changed();
commit;
