import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';

Object.assign(process.env, {
  NODE_ENV:'production', SUPABASE_URL:'https://example.invalid',
  SUPABASE_ANON_KEY:'synthetic-anon', SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',
  CORS_ALLOWED_ORIGINS:'', FRONTEND_URL:'', APP_URL:'',
  APP_INTEGRATION_SECRET:'synthetic-integration-contract-only',
});
let outbound=0,rateChecks=0,associateLookups=0,teamActive=true;
let referralAssociateActive=true;
const referralCommands=[];
let materialReads=0;
let syncedRevision=4, membershipSyncs=0;
const ticketTargets=[];
const accountId='00000000-0000-4000-8000-000000000007';
let preferenceUpdate=null;
globalThis.fetch=async (input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(url.origin==='https://example.invalid'&&url.pathname==='/auth/v1/user'){
    const token=new Headers(init?.headers||input.headers).get('authorization');
    const role=token?.replace('Bearer synthetic-','');
    assert(['associate','reviewer','admin'].includes(role));
    return Response.json({id:accountId,email:'synthetic@example.invalid',app_metadata:{role},user_metadata:{}});
  }
  if(url.origin==='https://example.invalid'&&url.pathname==='/rest/v1/associate_preferences'&&init?.method==='POST'){
    preferenceUpdate=JSON.parse(init.body);
    return Response.json({email_notifications:preferenceUpdate.email_notifications,whatsapp_notifications:false,profile_visibility:'private'});
  }
  if(url.origin==='https://example.invalid'&&url.pathname==='/rest/v1/rpc/consume_rate_limit'){
    rateChecks++;
    return Response.json({allowed:true,remaining:9,reset_at:'2099-01-01T00:00:00Z'});
  }
  if(url.origin==='https://example.invalid'&&url.pathname==='/rest/v1/associates'){
    if(url.searchParams.get('id')) return Response.json([{id:accountId,email:'active_associate@example.com',status:referralAssociateActive?'active':'suspended'}]);
    associateLookups++;
    assert.equal(url.searchParams.get('status'),'eq.active');
    assert.equal(url.searchParams.get('limit'),'2');
    const filter=url.searchParams.get('email');
    if(filter==='ilike.active\\_associate@example.com'){
      return Response.json([{id:'00000000-0000-4000-8000-000000000007',email:'Active_Associate@example.com'}]);
    }
    assert.equal(filter,'ilike.unknown@example.com');
    return Response.json([]);
  }
  if(url.origin==='https://example.invalid'&&url.pathname==='/rest/v1/consultant_team_memberships'){
    if(init?.method==='PATCH') return new Response(null,{status:204});
    return Response.json([{associate_id:'00000000-0000-4000-8000-000000000007',
      membership_id:'00000000-0000-4000-8000-000000000009',status:teamActive?'active':'paused',accepted_at:'2026-11-12T00:00:00Z',
      revision:4,synced_revision:syncedRevision,sync_status:'synced'}]);
  }
  if(url.origin==='https://example.invalid'&&url.pathname==='/rest/v1/associate_profiles'){
    return Response.json([{full_name:'Synthetic Consultant'}]);
  }
  if(url.origin==='https://api.binahub.id'){
    if(url.pathname==='/api/integrations/ams/referrals'){
      const headers=new Headers(init.headers),raw=init.body;
      assert.equal(headers.get('x-binahub-signature'),createHmac('sha256',process.env.APP_INTEGRATION_SECRET).update(`${headers.get('x-binahub-timestamp')}.${raw}`).digest('hex'));
      const payload=JSON.parse(raw);
      referralCommands.push(payload);
      return Response.json({success:true,data:payload.action==='settings'?{code:'BH-AABBCCDDEE',enabled:true}:{total:0,records:[],associates:[]}});
    }
    if(url.pathname==='/api/integrations/ams/consultant-team'){
      membershipSyncs++;
      assert.equal(JSON.parse(init.body).membership.revision,4);
      return Response.json({success:true});
    }
    if(url.pathname==='/api/integrations/ams/access-link'){
      ticketTargets.push(JSON.parse(init.body).nextPath);
      return Response.json({success:true,url:'https://app.binahub.id/auth/ams?ticket=synthetic'});
    }
  }
  if(url.origin==='https://api.binahub.id'&&url.pathname==='/api/integrations/ams/materials'){
    materialReads++;
    const headers=new Headers(init.headers),raw=init.body;
    assert.equal(headers.get('x-binahub-signature'),createHmac('sha256',process.env.APP_INTEGRATION_SECRET).update(`${headers.get('x-binahub-timestamp')}.${raw}`).digest('hex'));
    const input=JSON.parse(raw);assert.equal(input.purpose,'ams-admin-materials');assert.equal(input.requesterId,accountId);
    return Response.json({success:true,data:input.action==='catalog'?{documents:[],videos:[]}:{url:'https://example.supabase.co/storage/v1/object/sign/consultant-materials/approved.pdf?token=synthetic',filename:'approved.pdf',expiresInSeconds:120}});
  }
  outbound++;throw new Error('Unexpected outbound requests are forbidden in the API contract.');
};
const {default:app}=await import('../apps/api/dist/app.js');
const domain=await import('../packages/domain/dist/index.js');

test('associate referral scope comes from the AMS account and private responses are not cached',async()=>{
  const headers={Authorization:'Bearer synthetic-associate'};
  const result=await app.request('/api/associate/referrals?source=inquiry&page=2',{headers});
  assert.equal(result.status,200);
  assert.equal(result.headers.get('Cache-Control'),'private, no-store');
  assert.deepEqual(referralCommands.at(-1),{action:'list',associateId:accountId,source:'inquiry',page:2});
  const code=await app.request('/api/associate/referrals/code',{headers});
  assert.equal(code.status,200);
  assert.equal((await code.json()).data.code,'BH-AABBCCDDEE');
  assert.equal(referralCommands.at(-1).associateId,accountId);
  const forbidden=await app.request('/api/associate/referrals/follow-up',{method:'POST',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify({associateId:'00000000-0000-4000-8000-000000000008',caseId:accountId,requestId:accountId,note:'Text',revisitOn:null,help:false})});
  assert.equal(forbidden.status,400);
  referralAssociateActive=false;
  try{
    const inactive=await app.request('/api/associate/referrals/code',{headers});
    assert.equal(inactive.status,403);
    assert.equal((await inactive.json()).code,'REFERRAL_INACTIVE');
  }finally{referralAssociateActive=true;}
});

test('admin referral review is unavailable to associates and reviewers',async()=>{
  const path='/api/admin/referrals';
  for(const role of ['associate','reviewer']){
    const response=await app.request(path,{headers:{Authorization:'Bearer synthetic-'+role}});
    assert.equal(response.status,403);
  }
  const response=await app.request(path+'?status=review',{headers:{Authorization:'Bearer synthetic-admin'}});
  assert.equal(response.status,200);
  assert.deepEqual(referralCommands.at(-1),{action:'admin_list',adminId:accountId,status:'review',page:1});
});

test('only admins can change referral codes and must confirm the current code', async () => {
  const payload = { associateId: accountId, operation: 'rotate', expectedCode: 'BH-AABBCCDDEE', confirmationCode: 'BH-AABBCCDDEE' };
  const request = (path, role, body) => app.request('/api/' + path + '/referrals/code', {
    method: 'POST',
    headers: { Authorization: 'Bearer synthetic-' + role, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const before = referralCommands.length;
  assert.equal((await request('associate', 'associate', payload)).status, 403);
  assert.equal((await request('admin', 'associate', payload)).status, 403);
  assert.equal((await request('admin', 'reviewer', payload)).status, 403);
  assert.equal((await request('admin', 'admin', { ...payload, confirmationCode: 'BH-FFEEDDCCBB' })).status, 400);
  assert.equal(referralCommands.length, before);
  assert.equal((await request('admin', 'admin', payload)).status, 200);
  assert.deepEqual(referralCommands.at(-1), {
    action: 'admin_settings', adminId: accountId, email: 'active_associate@example.com', ...payload,
  });
});

test('native ESM workspace entry resolves without bundler-specific extension fallback',()=>{
  assert.equal(typeof domain.canSubmit,'function');
  assert.equal(domain.activeConsultantMembership({status:'active',accepted_at:'2026-11-12'},'active'),true);
  assert.equal(domain.activeConsultantMembership({status:'paused',accepted_at:'2026-11-12'},'active'),false);
});

test('built Hono app preserves health version and request/security headers', async()=>{
  const response=await app.request('https://example.invalid/api/health',{headers:{'X-Request-Id':'synthetic-contract'}});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{status:'ok',version:'0.11.2'});
  assert.equal(response.headers.get('X-Request-Id'),'synthetic-contract');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(outbound,0);
});
test('built app rejects malformed registration/login without reaching an auth provider', async()=>{
  for(const route of ['register','login']){
    const response=await app.request('https://example.invalid/api/auth/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,400);
    assert.equal((await response.json()).success,false);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  }
  assert.equal(outbound,0);
  assert.equal(rateChecks,2);
});
test('private associate/admin/worker routes still reject missing authentication', async()=>{
  for(const [route,method] of [['associate/me','GET'],['admin/stats','GET'],['workers/process-events','POST'],
    ['admin/consultant-team','GET'],['admin/consultant-team','POST'],['associate/consultant-team','GET'],['associate/consultant-team/open','POST'],
    ['admin/materials','GET'],['admin/materials/company-profile','GET'],
    ['notifications','GET'],['notifications/devices','POST'],['notifications/open','POST'],['notifications/operations','GET'],
    ['notifications/retry','POST'],['notifications/test','POST'],['workers/notifications','POST'],['workers/notifications/dispatch','POST'],['integrations/app/notifications','POST']]){
    const response=await app.request('https://example.invalid/api/'+route,{method});
    assert.equal(response.status,401,route);
  }
  assert.equal(outbound,0);
});
test('an associate or reviewer cannot send a push test',async()=>{
  for(const role of ['associate','reviewer']){
    const response=await app.request('https://example.invalid/api/notifications/test',{
      method:'POST',headers:{authorization:'Bearer synthetic-'+role,'content-type':'application/json'},
      body:JSON.stringify({deviceKey:accountId}),
    });
    assert.equal(response.status,403,role);
  }
  assert.equal(outbound,0);
});
test('saving email preferences updates the stored column and preserves WhatsApp',async()=>{
  const response=await app.request('https://example.invalid/api/associate/preferences',{
    method:'PUT',headers:{authorization:'Bearer synthetic-associate','content-type':'application/json'},
    body:JSON.stringify({emailNotifications:false}),
  });
  assert.equal(response.status,200);
  assert.equal(preferenceUpdate.associate_id,accountId);
  assert.equal(preferenceUpdate.email_notifications,false);
  assert.equal('whatsapp_notifications' in preferenceUpdate,false);
  assert.equal('profile_visibility' in preferenceUpdate,false);
  assert.equal((await response.json()).data.email_notifications,false);
});
test('signed consultant checks use current membership and matching email',async()=>{
  const url='https://example.invalid/api/integrations/app/consultant-team/check';
  async function check(email='active_associate@example.com'){
    const body=JSON.stringify({associateId:'00000000-0000-4000-8000-000000000007',
      membershipId:'00000000-0000-4000-8000-000000000009',email});
    const timestamp=String(Date.now()),signature=createHmac('sha256',process.env.APP_INTEGRATION_SECRET).update(`${timestamp}.${body}`).digest('hex');
    const response=await app.request(url,{method:'POST',body,headers:{'content-type':'application/json','x-binahub-timestamp':timestamp,'x-binahub-signature':signature}});
    assert.equal(response.status,200);return response.json();
  }
  assert.equal((await check()).active,true);
  assert.equal((await check('other@example.com')).active,false);
  teamActive=false;assert.equal((await check()).active,false);teamActive=true;
  assert.equal(outbound,0);
});
test('opening the portal reuses the current synced revision and still handles pending and paused memberships',async()=>{
  const leadId='00000000-0000-4000-8000-000000000011';
  const open=()=>app.request('https://example.invalid/api/associate/consultant-team/open',{
    method:'POST',headers:{authorization:'Bearer synthetic-associate','content-type':'application/json'},
    body:JSON.stringify({leadId}),
  });
  try {
    assert.equal((await open()).status,200);
    assert.equal(membershipSyncs,0);
    syncedRevision=3;
    assert.equal((await open()).status,200);
    assert.equal(membershipSyncs,1);
    teamActive=false;
    assert.equal((await open()).status,403);
    assert.equal(membershipSyncs,1);
    assert.deepEqual(ticketTargets,Array(2).fill('/konsultan/clients/'+leadId));
    assert.equal(outbound,0);
  } finally {
    syncedRevision=4;
    teamActive=true;
  }
});
test('CORS allows only the approved frontend, not an arbitrary caller', async()=>{
  for(const origin of ['https://ams.binahub.id','https://untrusted.invalid']){
    const response=await app.request('https://example.invalid/api/health',{headers:{Origin:origin}});
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin==='https://ams.binahub.id'?origin:null);
  }
  assert.equal(outbound,0);
});

test('AMS materials are admin-only and cannot be used to request arbitrary files',async()=>{
  for(const role of ['associate','reviewer']){
    for(const path of ['materials','materials/company-profile']){
      const denied=await app.request('https://example.invalid/api/admin/'+path,{headers:{authorization:'Bearer synthetic-'+role}});
      assert.equal(denied.status,403);
    }
  }
  assert.equal(materialReads,0);
  for (const slug of ['company-profile-v1','product-knowledge-v1','other-file']) {
    const invalid=await app.request('https://example.invalid/api/admin/materials/'+slug,{headers:{authorization:'Bearer synthetic-admin'}});
    assert.equal(invalid.status,404);
  }
  assert.equal(materialReads,0);
  for(const path of ['materials','materials/company-profile']){
    const response=await app.request('https://example.invalid/api/admin/'+path,{headers:{authorization:'Bearer synthetic-admin'}});
    assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
    assert.equal((await response.json()).success,true);
  }
  assert.equal(materialReads,2);assert.equal(outbound,0);
});
test('signed eligibility matches full email for active associates only',async()=>{
  const url='https://example.invalid/api/integrations/app/associates/eligible';
  const body=JSON.stringify({emails:['Active_Associate@EXAMPLE.COM','unknown@example.com']});
  const timestamp=String(Date.now());
  const signature=createHmac('sha256',process.env.APP_INTEGRATION_SECRET).update(`${timestamp}.${body}`).digest('hex');
  const request=(headers={})=>app.request(url,{method:'POST',body,headers:{'Content-Type':'application/json',...headers}});
  assert.equal((await request()).status,401);
  assert.equal(associateLookups,0);
  const response=await request({'x-binahub-timestamp':timestamp,'x-binahub-signature':signature});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{success:true,data:[{id:'00000000-0000-4000-8000-000000000007',email:'active_associate@example.com'}]});
  assert.equal(associateLookups,2);
  assert.equal(outbound,0);
});
