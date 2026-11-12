-- Apply to the AMS database. Compensation terms for consultant-team membership are optional.
begin;

do $$ begin
  if to_regclass('public.consultant_team_memberships') is null
    or to_regprocedure('public.consultant_team_change(uuid,uuid,text,integer,jsonb)') is null
  then raise exception 'Apply AMS migration 014 before 018'; end if;
end; $$;

alter table public.consultant_team_memberships
  alter column compensation_terms set default '',
  drop constraint if exists consultant_team_memberships_compensation_terms_check,
  add constraint consultant_team_memberships_compensation_terms_check
    check(length(btrim(compensation_terms))<=2000);

create or replace function public.consultant_team_change(
  p_actor uuid,p_associate uuid,p_action text,p_revision integer,p_data jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.consultant_team_memberships; actor_admin boolean; v_status text; v_name text; v_compensation text;
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
    v_compensation:=btrim(coalesce(p_data->>'compensationTerms',''));
    if m.status in ('active','invited') then raise exception 'TEAM_ALREADY_INVITED'; end if;
    if not exists(select 1 from public.associates where id=p_associate and status='active') then
      raise exception 'TEAM_ASSOCIATE_INACTIVE';
    end if;
    if p_data->>'agreementText' is null or length(btrim(p_data->>'agreementText')) not between 40 and 16000
      or length(v_compensation)>2000
      or (p_data->>'reviewed') is distinct from 'true' then raise exception 'TEAM_AGREEMENT_REQUIRED'; end if;
    insert into public.consultant_team_memberships(
      associate_id,status,revision,agreement_text,compensation_terms,agreement_hash,invited_by,updated_by
    ) values(p_associate,'invited',p_revision+1,btrim(p_data->>'agreementText'),v_compensation,
      encode(sha256(convert_to(jsonb_build_object('text',btrim(p_data->>'agreementText'),
        'compensation',v_compensation)::text,'utf8')),'hex'),p_actor,p_actor)
    on conflict(associate_id) do update set status='invited',revision=excluded.revision,
      invitation_id=gen_random_uuid(),agreement_text=excluded.agreement_text,compensation_terms=excluded.compensation_terms,
      agreement_hash=excluded.agreement_hash,invited_by=p_actor,invited_at=now(),accepted_at=null,
      updated_by=p_actor,updated_at=now(),sync_status='pending',sync_error=null returning * into m;
    insert into public.notifications(recipient_id,recipient_role,type,title,message,link,reference_id)
      values(p_associate,'associate','invitation','Undangan Tim Konsultan BinaHub',
        'BinaHub mengundang Anda untuk bergabung sebagai tim konsultan. Tinjau perjanjian kerja sama sebelum memberi keputusan.',
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

commit;
