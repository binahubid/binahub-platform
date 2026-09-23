import { readFile, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

const apiUrl = (process.env.AMS_API_URL || '').replace(/\/$/, '');
const email = process.env.AMS_ADMIN_EMAIL || '';
const password = process.env.AMS_ADMIN_PASSWORD || '';
const associateId = process.env.AMS_TARGET_ASSOCIATE_ID || '';
const cvPath = process.env.AMS_CV_FILE ? resolve(process.env.AMS_CV_FILE) : '';
const mutationEnabled = process.env.AMS_ADMIN_CV_MUTATION_TEST === 'true';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const countKeys = [
  'experiencesAdded',
  'educationsAdded',
  'skillsAdded',
  'languagesAdded',
  'certificationsAdded',
  'portfoliosAdded',
];
let failures = 0;

function report(ok, label, detail = '') {
  process.stdout.write(`${ok ? '[PASS]' : '[FAIL]'} ${label}${detail ? ` — ${detail}` : ''}\n`);
  if (!ok) failures += 1;
}

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(70_000),
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { response, body };
}

function collectionCounts(data) {
  return {
    experiencesAdded: data?.experiences?.length || 0,
    educationsAdded: data?.educations?.length || 0,
    skillsAdded: data?.skills?.length || 0,
    languagesAdded: data?.languages?.length || 0,
    certificationsAdded: data?.certifications?.length || 0,
    portfoliosAdded: data?.portfolios?.length || 0,
  };
}

if (!mutationEnabled) {
  process.stdout.write('[SKIP] UAT admin CV tidak dijalankan. Set AMS_ADMIN_CV_MUTATION_TEST=true hanya untuk associate UAT khusus yang boleh diubah.\n');
  process.exit(0);
}

if (!apiUrl || !/^https:\/\//i.test(apiUrl) || !email || !password || !uuidPattern.test(associateId) || !cvPath) {
  process.stderr.write('Wajib: AMS_API_URL HTTPS, AMS_ADMIN_EMAIL, AMS_ADMIN_PASSWORD, AMS_TARGET_ASSOCIATE_ID UUID, AMS_CV_FILE, dan AMS_ADMIN_CV_MUTATION_TEST=true.\n');
  process.exit(1);
}

const extension = extname(cvPath).toLowerCase();
const mime = extension === '.pdf'
  ? 'application/pdf'
  : extension === '.docx'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : '';

if (!mime) {
  process.stderr.write('AMS_CV_FILE harus PDF atau DOCX.\n');
  process.exit(1);
}

try {
  report(true, 'target API memakai HTTPS');
  const fileStat = await stat(cvPath);
  report(fileStat.size > 0 && fileStat.size <= 10 * 1024 * 1024, 'berkas UAT berukuran 1 byte–10 MB');
  if (failures) throw new Error('Berkas UAT tidak valid');

  const login = await jsonRequest(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = login.body?.data?.access_token;
  report(login.response.ok && typeof token === 'string' && token.length > 20, 'administrator memperoleh sesi sementara');
  if (!token) throw new Error('Login administrator gagal');

  const authHeaders = { Authorization: `Bearer ${token}` };
  const before = await jsonRequest(`${apiUrl}/api/admin/associates/${associateId}/cv`, { headers: authHeaders });
  report(before.response.ok && before.body?.success === true, 'associate UAT target dapat dibaca');
  if (!before.response.ok) throw new Error('Associate UAT target tidak tersedia');
  const beforeCounts = collectionCounts(before.body?.data);

  const prepare = await jsonRequest(`${apiUrl}/api/files/associate/${associateId}/cv`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: basename(cvPath), fileType: mime, fileSize: fileStat.size }),
  });
  const fileId = prepare.body?.data?.fileId;
  const signedUrl = prepare.body?.data?.presignedUrl;
  report(prepare.response.ok && uuidPattern.test(fileId || '') && signedUrl, 'admin menyiapkan upload privat untuk associate target');
  if (!fileId || !signedUrl) throw new Error('Persiapan upload gagal');

  const file = await readFile(cvPath);
  const upload = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: file,
    signal: AbortSignal.timeout(70_000),
  });
  report(upload.ok, 'binary CV tersimpan di storage', `HTTP ${upload.status}`);
  if (!upload.ok) throw new Error('Upload storage gagal');

  const confirm = await jsonRequest(`${apiUrl}/api/files/associate/${associateId}/cv/confirm`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });
  report(confirm.response.ok && confirm.body?.success === true, 'CV dikonfirmasi dan siap dianalisis');
  if (!confirm.response.ok) throw new Error('Konfirmasi CV gagal');

  const parse = await jsonRequest(`${apiUrl}/api/ai/parse-cv`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: fileId, force: true }),
  });
  const parsed = parse.body?.data;
  const completeShape = parsed
    && Array.isArray(parsed.roles)
    && Array.isArray(parsed.expertises)
    && Array.isArray(parsed.experience)
    && Array.isArray(parsed.education)
    && Array.isArray(parsed.skills)
    && Array.isArray(parsed.languages)
    && Array.isArray(parsed.certifications)
    && Array.isArray(parsed.portfolios);
  report(parse.response.ok && completeShape, 'AI menghasilkan struktur CV lengkap dan tervalidasi');
  if (!completeShape) throw new Error('Analisis AI tidak menghasilkan struktur lengkap');

  const apply = await jsonRequest(`${apiUrl}/api/admin/associates/${associateId}/cv/apply`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId: fileId }),
  });
  const merge = apply.body?.data;
  report(apply.response.ok && apply.body?.success === true && merge?.profileUpdated === true, 'admin menerapkan draft yang telah ditinjau');
  if (!apply.response.ok) throw new Error('Penerapan CV gagal');

  const after = await jsonRequest(`${apiUrl}/api/admin/associates/${associateId}/cv`, { headers: authHeaders });
  report(after.response.ok && after.body?.success === true, 'profil hasil enrichment dapat dibaca kembali');
  const afterCounts = collectionCounts(after.body?.data);
  for (const key of countKeys) {
    const added = Number(merge?.[key] || 0);
    report(afterCounts[key] === beforeCounts[key] + added, `jumlah ${key.replace('Added', '')} konsisten setelah merge`);
  }

  const detail = await jsonRequest(`${apiUrl}/api/admin/associates/${associateId}`, { headers: authHeaders });
  const currentDocument = detail.body?.data?.documents?.find((document) => document.id === fileId);
  report(detail.response.ok && currentDocument?.parsed_data, 'hasil analisis tersimpan pada dokumen CV aktif');

  const retry = await jsonRequest(`${apiUrl}/api/admin/associates/${associateId}/cv/apply`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId: fileId }),
  });
  const retryCountsAreZero = countKeys.every((key) => Number(retry.body?.data?.[key] || 0) === 0);
  report(retry.response.ok && retry.body?.success === true && retryCountsAreZero, 'retry penerapan idempoten dan tidak menggandakan koleksi');
} catch (error) {
  report(false, 'UAT admin CV selesai tanpa exception', error instanceof Error ? error.message : 'unknown error');
}

if (failures === 0) {
  process.stdout.write(`\nUAT admin CV enrichment lulus terhadap ${apiUrl}.\n`);
  process.stdout.write('Runner mengganti CV aktif dan melengkapi profil associate UAT target. Jangan gunakan akun produksi nyata.\n');
} else {
  process.stdout.write(`\nUAT admin CV enrichment gagal pada ${failures} pemeriksaan.\n`);
  process.exitCode = 1;
}
