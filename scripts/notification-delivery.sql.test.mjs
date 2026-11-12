import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { before, after, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite(), alice = randomUUID(), bob = randomUUID(), admin = randomUUID(), membership = randomUUID();
const migration = readFileSync('packages/database/migrations/015_notification_delivery.sql','utf8');
const immediate = readFileSync('packages/database/migrations/017_notification_immediate.sql','utf8');
const rpc = async (name,args=[]) => (await db.query(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;
const device = (user=alice,key=randomUUID(),endpoint='https://fcm.googleapis.com/'+randomUUID()) => rpc('ams_notification_device',[user,user===admin?'admin':'associate',key,'Synthetic phone',endpoint,'k','a']);
const notice = async (user=alice,extra={}) => {
  const {rows} = await db.query(`insert into notifications(recipient_id,recipient_role,type,title,message,link,reference_id,created_at)
    values($1,'associate',$2,'Synthetic title','Synthetic message',$3,$4,$5) returning id`,
    [user,extra.type||'system',extra.link||'/dashboard',extra.reference||randomUUID(),extra.created||new Date().toISOString()]);
  return rows[0].id;
};
before(async()=>{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,raw_app_meta_data jsonb);
    create table associates(id uuid primary key,status text);
    create table consultant_team_memberships(associate_id uuid primary key,membership_id uuid,invitation_id uuid,status text,accepted_at timestamptz);
    create table assignments(id uuid primary key,status text);
    create table assignment_assignees(id uuid,assignment_id uuid,associate_id uuid,status text,invitation_expires_at timestamptz);
    create table notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid,recipient_role text,type text,title text,message text,link text,reference_id uuid,read_at timestamptz,created_at timestamptz not null default now());
    create table email_notification_deliveries(id uuid default gen_random_uuid(),notification_id uuid,status text,attempts int,available_at timestamptz,last_error text,updated_at timestamptz,created_at timestamptz,sent_at timestamptz);
    create table event_queue(id uuid default gen_random_uuid(),type text,aggregate_type text,aggregate_id uuid,payload jsonb);
    create schema ams_scheduler;
    create function ams_scheduler.notification_cron_status() returns jsonb language sql as $$ select '{}'::jsonb $$;
    create schema cron;
    create table cron.job(jobname text,username text,database text,active boolean);
    create schema vault;
    create table vault.decrypted_secrets(name text,decrypted_secret text);
    create schema net;
    create table net.requests(id bigint generated always as identity,url text,body jsonb);
    create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer)
    returns bigint language sql as $$ insert into net.requests(url,body) values($1,$3) returning id $$;
    create function enqueue_transformation_event(text,text,uuid,jsonb) returns uuid language sql as $$
      insert into event_queue(type,aggregate_type,aggregate_id,payload) values($1,$2,$3,$4) returning id;$$;`);
  await db.exec(migration);
  await db.exec(immediate);
});
after(()=>db.close());
beforeEach(async()=>{
  await db.exec('truncate notification_push_deliveries,notification_reminders,notification_devices,notification_preferences,notification_external_sources,notification_worker_runs,email_notification_deliveries,notifications,assignments,assignment_assignees,consultant_team_memberships,associates,auth.users,event_queue cascade');
  await db.exec("truncate net.requests,cron.job,vault.decrypted_secrets; insert into cron.job values('ams-notification-worker',current_user,current_database(),true); insert into vault.decrypted_secrets values('ams_notification_worker_secret','synthetic-notification-dispatch-secret');");
  for(const [id,role] of [[alice,'associate'],[bob,'associate'],[admin,'admin']]){
    await db.query('insert into auth.users values($1,$2)',[id,{role}]);
    await db.query("insert into associates values($1,'active')",[id]);
  }
});
test('only current devices receive new notices; old notices are never broadcast on subscription',async()=>{
  await notice();await device();const bobDevice=await device(bob);
  const id=await notice();
  const rows=(await db.query('select * from notification_push_deliveries')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].notification_id,id);assert.notEqual(rows[0].device_id,bobDevice);
  await db.exec(immediate);assert.equal((await db.query('select count(*)::int n from notification_push_deliveries')).rows[0].n,1);
});
test('one wake-up per notification, scoped to first delivery and safe beside Cron',async()=>{
  await device();await device();
  await notice(bob);
  const first=await notice();
  const second=await notice();
  const requests=(await db.query('select url,body from net.requests order by id')).rows;
  assert.deepEqual(requests.map(row=>row.body),[{id:first},{id:second}]);
  assert.equal(new URL(requests[0].url).pathname,'/api/workers/notifications/dispatch');
  const claimed=(await db.query('select * from ams_notification_claim_new($1,$2,10)',[randomUUID(),second])).rows;
  assert.equal(claimed.length,2);
  assert(claimed.every(row=>row.notification_id===second && row.attempts===1));
  assert.equal((await db.query('select * from ams_notification_claim_new($1,$2,10)',[randomUUID(),second])).rows.length,0);
  const scheduled=(await db.query('select * from ams_notification_claim($1,10)',[randomUUID()])).rows;
  assert.equal(scheduled.length,2);assert(scheduled.every(row=>row.notification_id===first));
});
test('a rollback discards the wake-up and a paused scheduler preserves the durable queue',async()=>{
  await device();
  await db.exec('begin');
  try { await notice(); } finally { await db.exec('rollback'); }
  assert.equal((await db.query('select * from net.requests')).rows.length,0);
  await db.exec('update cron.job set active=false');
  const id=await notice();
  assert.equal((await db.query('select * from net.requests')).rows.length,0);
  assert.equal((await db.query("select * from notification_push_deliveries where notification_id=$1 and status='pending'",[id])).rows.length,1);
});
test('a device endpoint cannot be moved to a different account',async()=>{
  const endpoint='https://fcm.googleapis.com/synthetic-endpoint';await device(alice,randomUUID(),endpoint);
  await assert.rejects(device(bob,randomUUID(),endpoint),/DEVICE_ACCOUNT_CHANGED/);
});
test('per-device leases, expired recovery, and late acknowledgements are isolated',async()=>{
  await device();await device();await notice();const lease=randomUUID();
  const rows=(await db.query('select * from ams_notification_claim($1,10)',[lease])).rows;
  assert.equal(rows.length,2);assert.equal((await db.query('select * from ams_notification_claim($1,10)',[randomUUID()])).rows.length,0);
  assert.equal(await rpc('ams_notification_finish',[rows[0].id,randomUUID(),'accepted',null,0]),false);
  assert.equal(await rpc('ams_notification_finish',[rows[0].id,lease,'accepted',null,0]),true);
  await db.query("update notification_push_deliveries set lease_until=now()-interval '1 minute' where id=$1",[rows[1].id]);
  const recovered=(await db.query('select * from ams_notification_claim($1,10)',[randomUUID()])).rows;
  assert.equal(recovered.length,1);assert.equal(recovered[0].id,rows[1].id);
});
test('reading an invitation does not resolve it; responding stops pending reminders',async()=>{
  const invitation=randomUUID();
  await db.query("insert into consultant_team_memberships values($1,$2,$3,'invited',null)",[alice,membership,invitation]);
  const id=await notice(alice,{type:'invitation',link:'/dashboard/consultant',reference:invitation,created:new Date(Date.now()-25*3600000).toISOString()});
  await db.query('update notifications set read_at=now() where id=$1',[id]);
  let feed=await rpc('ams_notification_feed',[alice,'associate','action',0]);assert.equal(feed.actionCount,1);assert.equal(feed.unread,0);
  await db.query('insert into notification_preferences(user_id,quiet_start,quiet_end) values($1,0,0)',[alice]);
  assert.equal(await rpc('ams_notification_generate_reminders',[30]),1);
  assert.equal(await rpc('ams_notification_generate_reminders',[30]),0);
  await db.query("update consultant_team_memberships set status='active',accepted_at=now() where associate_id=$1",[alice]);
  assert.equal(await rpc('ams_notice_current',[id]),false);
  feed=await rpc('ams_notification_feed',[alice,'associate','action',0]);assert.equal(feed.actionCount,0);
});
test('external source ingestion is idempotent and ignores out-of-order assignments',async()=>{
  await db.query("insert into consultant_team_memberships values($1,$2,$3,'active',now())",[alice,membership,randomUUID()]);
  const event={eventId:randomUUID(),sourceId:randomUUID(),leadId:randomUUID(),kind:'assignment',version:2,associateId:alice,membershipId:membership,active:true,status:'assigned',startAt:null};
  const result=await rpc('ams_notification_external',[event]);assert.ok(result.notificationId);
  assert.equal((await rpc('ams_notification_external',[event])).duplicate,true);
  assert.equal((await rpc('ams_notification_external',[{...event,eventId:randomUUID(),version:1}])).duplicate,true);
  assert.equal(await rpc('ams_notice_current',[result.notificationId]),true);
  await rpc('ams_notification_external',[{...event,eventId:randomUUID(),version:3,active:false}]);
  assert.equal(await rpc('ams_notice_current',[result.notificationId]),false);
});
test('admin test notification targets this device only and is rate limited',async()=>{
  const key=randomUUID();const first=await device(admin,key);await device(admin);
  const associateKey=randomUUID();await device(alice,associateKey);
  await assert.rejects(rpc('ams_notification_test',[alice,'associate',associateKey]),/DEVICE_TEST_FORBIDDEN/);
  await assert.rejects(rpc('ams_notification_test',[alice,'admin',associateKey]),/DEVICE_TEST_FORBIDDEN/);
  const id=await rpc('ams_notification_test',[admin,'admin',key]);
  const rows=(await db.query('select * from notification_push_deliveries where notification_id=$1',[id])).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].device_id,first);
  await assert.rejects(rpc('ams_notification_test',[admin,'admin',key]),/DEVICE_TEST_UNAVAILABLE/);
  await assert.rejects(rpc('ams_notification_test',[admin,'admin',associateKey]),/DEVICE_TEST_UNAVAILABLE/);
});
test('feed counts before pagination, scopes recipients, and preserves pending actions',async()=>{
  await notice(bob);for(let i=0;i<33;i++)await notice();
  let feed=await rpc('ams_notification_feed',[alice,'associate','all',0]);assert.equal(feed.total,33);assert.equal(feed.items.length,30);assert.equal(feed.unread,33);
  feed=await rpc('ams_notification_feed',[alice,'associate','all',1]);assert.equal(feed.items.length,3);
});
test('anonymous/browser roles cannot read subscriptions or invoke service RPCs',async()=>{
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    try {
      await assert.rejects(db.query('select * from notification_devices'),/permission denied/);
      await assert.rejects(rpc('ams_notification_feed',[alice,'associate','all',0]),/permission denied/);
      await assert.rejects(rpc('ams_notification_claim',[randomUUID(),10]),/permission denied/);
      await assert.rejects(rpc('ams_notification_claim_new',[randomUUID(),randomUUID(),10]),/permission denied/);
    } finally {await db.exec('reset role');}
  }
});
