import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const root = new URL('../apps/web/src/app/admin/', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
test('CV printing preserves the protected admin data path and original assets', () => {
  const page = read('associates/[id]/cv/page.tsx');
  const document = read('associates/[id]/cv/cv-document.tsx');
  assert.match(page, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(page, /window\.print\(\)/);
  assert.match(document, /src="\/full-logo\.png"/);
  assert.match(document, /ProtectedFileImage/);
  for (const section of ['experiences', 'educations', 'certifications', 'portfolios', 'skills', 'languages', 'availability', 'social_links']) assert.match(document, new RegExp(section));
  assert.doesNotMatch(document, /dangerouslySetInnerHTML/);
});
test('print styling keeps content legible and defines native page counters', () => {
  const css = read('associates/[id]/cv/cv-document.module.css');
  assert.match(css, /size:A4/);
  assert.match(css, /@bottom-right/);
  assert.match(css, /counter\(page\)/);
  assert.match(css, /counter\(pages\)/);
  assert.match(css, /display:table-header-group/);
  assert.match(css, /font-size:10\.5pt!important/);
  assert.match(css, /break-after:avoid-page/);
  assert.match(css, /overflow-wrap:anywhere/);
});
test('admin navigation and offset do not enter the printed CV', () => {
  const layout = read('layout.tsx');
  assert.match(layout, /lg:flex print:hidden/);
  assert.match(layout, /lg:hidden print:hidden/);
  assert.match(layout, /print:!pl-0/);
  assert.match(layout, /print:!p-0/);
});
