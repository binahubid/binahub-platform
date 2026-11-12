import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('scheduler installs disabled, queues only after activation, and reports status without credentials', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;create role authenticated;create role service_role;
      create schema cron;create schema net;create schema vault;
      create table public.notification_devices(id uuid);
      create table cron.job(jobid bigint generated always as identity,jobname text,schedule text,command text,
        username text default current_user,database text default current_database(),active boolean default true);
      create function cron.schedule(text,text,text) returns bigint language sql as $$
        insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid;
      $$;
      create function cron.alter_job(job_id bigint,active boolean) returns void language sql as $$
        update cron.job set active=$2 where jobid=$1;
      $$;
      create table net.http_request_queue(id bigint generated always as identity,url text,headers jsonb);
      create table net._http_response(id bigint,created timestamptz default now(),status_code integer,timed_out boolean,error_msg text);
      create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$
        insert into net.http_request_queue(url,headers) values($1,$2) returning id;
      $$;
      create table vault.secrets(name text,decrypted_secret text);
      create view vault.decrypted_secrets as select * from vault.secrets;
    `);
    const sql = readFileSync('packages/database/migrations/016_notification_scheduler.sql','utf8').replace(/^create extension .*;$/gm, '');
    await db.exec(sql);
    const status = async () => (await db.query('select ams_scheduler.notification_cron_status() value')).rows[0].value;
    assert.deepEqual(await status(), { installed: true, active: false, schedule: '* * * * *', credentialConfigured: false, lastQueuedAt: null, httpStatus: null, httpState: 'never_queued' });
    await assert.rejects(db.query('select ams_scheduler.set_notification_cron_enabled(true)'), /AMS Vault/);
    const secret = 'synthetic-ams-scheduler-fixture-secret';
    await db.query('insert into vault.secrets values($1,$2)', ['ams_notification_worker_secret', secret]);
    await db.query('select ams_scheduler.set_notification_cron_enabled(true)');
    await db.query('select ams_scheduler.dispatch_notifications()');
    await db.query('select ams_scheduler.dispatch_notifications()');
    const {rows} = await db.query('select url,headers from net.http_request_queue');
    assert.equal(rows.length,1);
    assert.equal(new URL(rows[0].url).pathname,'/api/workers/notifications');
    assert.equal(rows[0].headers.Authorization, 'Bearer ' + secret);
    await db.query('insert into net._http_response(id,status_code,timed_out) select id,200,false from net.http_request_queue');
    assert.equal((await status()).httpState,'processed');
    assert.equal(JSON.stringify(await status()).includes(secret), false);
    await db.exec(sql);
    assert.equal((await status()).active,true);
    await db.query('select ams_scheduler.set_notification_cron_enabled(false)');
    assert.equal((await status()).active,false);
  } finally {
    await db.close();
  }
});
