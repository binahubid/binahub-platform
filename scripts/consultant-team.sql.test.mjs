import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { after,before,beforeEach,test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite(),admin=randomUUID(),alice=randomUUID(),bob=randomUUID(),outsider=randomUUID();
const migration=readFileSync('packages/database/migrations/014_consultant_team.sql','utf8');
const optionalCompensation=readFileSync('packages/database/migrations/018_consultant_team_optional_compensation.sql','utf8');
const rpc=async(actor,associate,action,revision,data={})=>(await db.query(
  'select consultant_team_change($1,$2,$3,$4,$5) value',[actor,associate,action,revision,data],
)).rows[0].value;
const offer={agreementText:'Synthetic agreement for the consultant team. Confidential information stays within the assigned work.',compensationTerms:'Terms agreed in the synthetic fixture.',reviewed:true};
const invite=(id=alice)=>rpc(admin,id,'invite',0,offer);
const accept=(member)=>rpc(member.associate_id,member.associate_id,'accept',member.revision,{
  invitationId:member.invitation_id,agreementHash:member.agreement_hash,consent:true,
});
before(async()=>{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb);
    create table associates(id uuid primary key,email text,status text);
    create table associate_profiles(associate_id uuid primary key,full_name text);
    create table notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid,recipient_role text,type text,title text,message text,link text,reference_id uuid);
    create table event_queue(id uuid default gen_random_uuid(),type text,aggregate_type text,aggregate_id uuid,payload jsonb);
    create function enqueue_transformation_event(text,text,uuid,jsonb) returns uuid language sql as $$
      insert into event_queue(type,aggregate_type,aggregate_id,payload) values($1,$2,$3,$4) returning id;
    $$;`);
  await db.exec(migration);
  await db.exec(optionalCompensation);
});
after(()=>db.close());
beforeEach(async()=>{
  await db.exec('truncate consultant_team_history,consultant_team_memberships,notifications,event_queue,associate_profiles,associates,auth.users cascade');
  for(const [id,name,role] of [[admin,'Admin','admin'],[alice,'Alice','associate'],[bob,'Bob','associate'],[outsider,'Other','associate']]){
    await db.query('insert into auth.users values($1,$2)',[id,{role}]);
    await db.query('insert into associates values($1,$2,$3)',[id,name.toLowerCase()+'@example.com','active']);
    await db.query('insert into associate_profiles values($1,$2)',[id,name]);
  }
});
test('inviting does not grant access and retains a reviewed, hashed agreement snapshot',async()=>{
  const member=await invite();
  assert.equal(member.status,'invited');assert.equal(member.accepted_at,null);
  assert.match(member.agreement_hash,/^[a-f0-9]{64}$/);
  assert.equal((await db.query('select count(*)::int n from notifications')).rows[0].n,1);
  const history=(await db.query('select snapshot from consultant_team_history')).rows[0].snapshot;
  assert.equal(history.agreement_text,offer.agreementText);
  await assert.rejects(invite(),/TEAM_CONFLICT/);
});
test('acceptance requires the current invitation, agreement and explicit consent',async()=>{
  const member=await invite();
  await assert.rejects(rpc(alice,alice,'accept',1,{invitationId:member.invitation_id}),/TEAM_AGREEMENT_REQUIRED/);
  await assert.rejects(rpc(bob,alice,'accept',1,{...member,consent:true}),/TEAM_FORBIDDEN/);
  const result=await accept(member);assert.equal(result.status,'active');assert.ok(result.accepted_at);
  await assert.rejects(accept(member),/TEAM_CONFLICT/);
});
test('non-admins cannot grant membership; unreviewed agreements are rejected',async()=>{
  await assert.rejects(rpc(bob,alice,'invite',0,offer),/TEAM_ADMIN_REQUIRED/);
  await assert.rejects(rpc(admin,alice,'invite',0,{...offer,reviewed:false}),/TEAM_AGREEMENT_REQUIRED/);
  await assert.rejects(rpc(admin,alice,'invite',0,{...offer,agreementText:''}),/TEAM_AGREEMENT_REQUIRED/);
  await db.query("update associates set status='suspended' where id=$1",[alice]);
  await assert.rejects(invite(),/TEAM_ASSOCIATE_INACTIVE/);
});
test('membership survives projects and resumes only on an existing acceptance',async()=>{
  const member=await accept(await invite());
  const paused=await rpc(admin,alice,'pause',member.revision);
  const resumed=await rpc(admin,alice,'resume',paused.revision);
  assert.equal(resumed.status,'active');assert.equal(resumed.accepted_at,member.accepted_at);
  assert.equal(resumed.membership_id,member.membership_id);
  assert.equal('end_date' in resumed,false);
});
test('termination followed by a new invitation keeps old consent and requires consent again',async()=>{
  const member=await accept(await invite());
  const ended=await rpc(admin,alice,'end',member.revision);
  await assert.rejects(rpc(admin,alice,'resume',ended.revision),/TEAM_INVALID_TRANSITION/);
  const next=await rpc(admin,alice,'invite',ended.revision,{...offer,agreementText:offer.agreementText+' New terms.'});
  assert.equal(next.accepted_at,null);assert.notEqual(next.invitation_id,member.invitation_id);
  assert.notEqual(next.agreement_hash,member.agreement_hash);
  const history=(await db.query("select snapshot from consultant_team_history where action='accept'")).rows[0].snapshot;
  assert.equal(history.agreement_text,offer.agreementText);
});
test('directory counts before pagination and candidates exclude pending or active members',async()=>{
  await invite();await invite(bob);
  const result=(await db.query("select consultant_team_directory(0,'Alice','invited') value")).rows[0].value;
  assert.equal(result.total,1);assert.equal(result.members[0].agreement_text,undefined);
  const candidates=(await db.query("select * from consultant_team_candidates('Alice')")).rows;
  assert.equal(candidates.length,0);
  await db.query("update associates set status='suspended' where id=$1",[alice]);
  assert.equal((await db.query("select count(*)::int n from event_queue where type='ConsultantMembershipChanged'")).rows[0].n,3);
});
test('browser roles cannot read terms, alter membership or invoke its service functions',async()=>{
  await invite();
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    try{
      await assert.rejects(db.query('select * from consultant_team_memberships'),/permission denied/);
      await assert.rejects(rpc(admin,alice,'pause',1),/permission denied/);
    }finally{await db.exec('reset role');}
  }
  await db.exec(migration);
  await db.exec(optionalCompensation);
  assert.equal((await db.query('select count(*)::int n from consultant_team_memberships')).rows[0].n,1);
});

test('missing and whitespace compensation terms are stored empty and can be accepted',async()=>{
  const {compensationTerms,...withoutCompensation}=offer;
  const first=await rpc(admin,alice,'invite',0,withoutCompensation);
  assert.equal(first.compensation_terms,'');
  assert.equal((await accept(first)).status,'active');
  const second=await rpc(admin,bob,'invite',0,{...offer,compensationTerms:'   '});
  assert.equal(second.compensation_terms,'');
  const snapshot=(await db.query("select snapshot from consultant_team_history where associate_id=$1",[bob])).rows[0].snapshot;
  assert.equal(snapshot.compensation_terms,'');
});

test('optional compensation accepts short text and retains the maximum length',async()=>{
  const member=await rpc(admin,alice,'invite',0,{...offer,compensationTerms:'  -  '});
  assert.equal(member.compensation_terms,'-');
  await assert.rejects(rpc(admin,bob,'invite',0,{...offer,compensationTerms:'a'.repeat(2001)}),/TEAM_AGREEMENT_REQUIRED/);
  const maximum=await rpc(admin,bob,'invite',0,{...offer,compensationTerms:'a'.repeat(2000)});
  assert.equal(maximum.compensation_terms.length,2000);
});

test('migration preserves existing invitations, consent hashes, and history',async()=>{
  const pending=await invite();
  const active=await accept(await invite(bob));
  const membersBefore=(await db.query('select * from consultant_team_memberships order by associate_id')).rows;
  const before=(await db.query('select * from consultant_team_history order by associate_id,revision')).rows;
  await db.exec(optionalCompensation);
  const rows=(await db.query('select * from consultant_team_memberships order by associate_id')).rows;
  assert.deepEqual(rows,membersBefore);
  assert.equal(rows.find(row=>row.associate_id===alice).agreement_hash,pending.agreement_hash);
  assert.equal(rows.find(row=>row.associate_id===bob).agreement_hash,active.agreement_hash);
  assert.deepEqual((await db.query('select * from consultant_team_history order by associate_id,revision')).rows,before);
  assert.equal((await accept(pending)).status,'active');
});
