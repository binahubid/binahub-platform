import './minimatch-compat.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, existsSync} from 'node:fs';
import {test} from 'node:test';

const require = createRequire(import.meta.url);
const plugins = createRequire(require.resolve('eslint-config-next'));
const lock = readFileSync(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');
const minimum = {minimatch:'11.0.1', esbuild:'0.28.1', browserslist:'4.28.7', 'baseline-browser-mapping':'2.11.0', 'postcss-selector-parser':'6.1.5'};
const atLeast = (value, expected) => {
  const a=value.split('.').map(Number), b=expected.split('.').map(Number);
  for (let i=0;i<3;i++) { if (a[i]!==b[i]) return a[i]>b[i]; }
  return true;
};
test('the pnpm lock contains only patched versions along every affected dependency path', () => {
  const seen = new Set();
  for (const [, name, raw] of lock.matchAll(/^  '?(minimatch|esbuild|browserslist|baseline-browser-mapping|postcss-selector-parser)@([^:\s']+)'?:/gm)) {
    const version = raw.split('(')[0];
    assert(/^\d+\.\d+\.\d+$/.test(version), name+': '+raw);
    const required=name==='postcss-selector-parser'&&Number(version.split('.')[0])>=7?'7.1.6':minimum[name];
    assert(atLeast(version, required), name+': '+version); seen.add(name);
  }
  assert.deepEqual([...seen].sort(), Object.keys(minimum).sort());
  const manifest=JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.packageManager, 'pnpm@9.15.0');
  assert(!existsSync(new URL('../.pnpmfile.cjs', import.meta.url)));
});
test('legacy plugins all use the callable patched matcher, including defaults and makeRe', () => {
  for (const name of ['eslint-plugin-react','eslint-plugin-import','eslint-plugin-jsx-a11y']) {
    const consumer=createRequire(plugins.resolve(name)), match=consumer('minimatch');
    assert.equal(typeof match, 'function', name);
    assert.equal(match('src/page.tsx', '**/*.tsx'), true);
    assert.equal(match('src/page.tsx', '**/*.sql'), false);
    assert.equal(new match.Minimatch('**/*.tsx').match('src/page.tsx'), true);
    assert.equal(match.makeRe('**/*.tsx').test('src/page.tsx'), true);
    assert.deepEqual(match.match(['a.ts','b.js'], '*.ts'), ['a.ts']);
    assert.equal(match.defaults({nocase:true})('FOO.TS','*.ts'), true);
  }
});
test('glob-dependent lint rules execute for valid and invalid fixtures', async () => {
  const {ESLint}=require('eslint'), lint=new ESLint({overrideConfigFile:true, overrideConfig:{
    files:['**/*.jsx'],languageOptions:{ecmaVersion:2022,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}},
    plugins:{react:plugins('eslint-plugin-react'),import:plugins('eslint-plugin-import'),'jsx-a11y':plugins('eslint-plugin-jsx-a11y')},
    settings:{react:{version:'19.2'}},rules:{
      'react/jsx-pascal-case':['error',{ignore:['my_*']}],
      'react/no-unstable-nested-components':'error',
      'jsx-a11y/label-has-associated-control':['error',{controlComponents:['Input*']}],
      'import/order':['error',{pathGroups:[{pattern:'@/**',group:'internal'}]}],
    },
  }});
  const [valid]=await lint.lintText('import value from "@/value";\nconst View=()=> <div><my_widget/><label>Nama<InputField/></label><Item renderContent={()=> <span/>}/></div>;',{filePath:'compat-fixture.jsx'});
  assert.deepEqual(valid.messages,[]);
  const [invalid]=await lint.lintText('const View=()=> <label><InputField/></label>;',{filePath:'compat-fixture.jsx'});
  assert(invalid.messages.some(message=>message.ruleId==='jsx-a11y/label-has-associated-control'));
  const boundary=new ESLint({overrideConfigFile:true,overrideConfig:{files:['**/*.js'],plugins:{import:plugins('eslint-plugin-import')},rules:{'import/no-internal-modules':['error',{forbid:['forbidden/**']}]}}});
  const [blocked]=await boundary.lintText('import hidden from "forbidden/internal";',{filePath:'boundary-fixture.js'});
  assert(blocked.messages.some(message=>message.ruleId==='import/no-internal-modules'));
});
test('the real Next15 FlatCompat configuration loads through its supported CommonJS entry', async () => {
  const {ESLint}=require('eslint'), lint=new ESLint();
  const [result]=await lint.lintText('export const Sample = () => <button type="button">Lanjut</button>;', {filePath:'apps/web/src/compat-fixture.tsx'});
  assert.deepEqual(result.messages, []);
});
