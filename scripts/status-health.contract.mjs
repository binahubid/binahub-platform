import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {classifyAPIHealth} from '../apps/web/src/lib/status-health.ts';

test('valid patched and future release versions are not false outages',()=>{
  for(const version of ['0.10.1','0.11.2','0.11.3','1.2.3-rc.1+build.2'])assert.equal(classifyAPIHealth({status:'ok',version}).status,'ok');
});
test('unknown, malformed or degraded evidence is never a green basic check',()=>{
  for(const input of [null,{}, {status:'degraded',version:'0.11.2'}, {status:'ok'}, {status:'ok',version:'<img src=x>'}, {status:'ok',version:123}])assert.equal(classifyAPIHealth(input).status,'error');
});
test('public copy does not claim database, queue or provider readiness',()=>{
  const source=readFileSync('apps/web/src/app/status/page.tsx','utf8');
  assert(!source.includes('EXPECTED_API_VERSION'));assert(!source.includes('Semua Sistem Beroperasi Normal'));
  assert(source.includes('belum diperiksa di halaman ini'));
});
