import { readFile, stat } from 'node:fs/promises';
import { extname, basename, resolve } from 'node:path';

const apiUrl = (process.env.AMS_API_URL || '').replace(/\/$/, '');
const email = process.env.AMS_ASSOCIATE_EMAIL || '';
const password = process.env.AMS_ASSOCIATE_PASSWORD || '';
const cvPath = process.env.AMS_CV_FILE ? resolve(process.env.AMS_CV_FILE) : '';
const mutationEnabled = process.env.AMS_CV_MUTATION_TEST === 'true';
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

function skillCategory(value) {
  if (['technical', 'soft_skill', 'industry', 'other'].includes(value)) return value;
  return ['facilitation', 'training', 'coaching'].includes(value) ? 'soft_skill' : 'other';
}

function skillProficiency(value) {
  return ['beginner', 'intermediate', 'advanced', 'expert'].includes(value) ? value : 'intermediate';
}

function languageProficiency(value) {
  return ['basic', 'conversational', 'fluent', 'native'].includes(value) ? value : 'conversational';
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

if (!mutationEnabled) {
  process.stdout.write('[SKIP] UAT CV tidak dijalankan. Set AMS_CV_MUTATION_TEST=true hanya untuk akun associate UAT khusus.\n');
  process.exit(0);
}

if (!apiUrl || !/^https:\/\//i.test(apiUrl) || !email || !password || !cvPath) {
  process.stderr.write('Wajib: AMS_API_URL HTTPS, AMS_ASSOCIATE_EMAIL, AMS_ASSOCIATE_PASSWORD, AMS_CV_FILE, dan AMS_CV_MUTATION_TEST=true.\n');
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
  const associateId = login.body?.data?.user?.id;
  report(login.response.ok && token && associateId, 'associate UAT memperoleh sesi sementara');
  if (!token || !associateId) throw new Error('Login associate UAT gagal');

  const authHeaders = { Authorization: `Bearer ${token}` };
  const prepare = await jsonRequest(`${apiUrl}/api/files/associate/${associateId}/cv`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: basename(cvPath), fileType: mime, fileSize: fileStat.size }),
  });
  const fileId = prepare.body?.data?.fileId;
  const signedUrl = prepare.body?.data?.presignedUrl;
  report(prepare.response.ok && fileId && signedUrl, 'API menyiapkan upload privat');
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
  report(confirm.response.ok && confirm.body?.success === true, 'CV dikonfirmasi dan event parsing dibuat');
  if (!confirm.response.ok) throw new Error('Konfirmasi CV gagal');

  const parse = await jsonRequest(`${apiUrl}/api/ai/parse-cv`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: fileId }),
  });
  const parsed = parse.body?.data;
  report(parse.response.ok && parsed && Array.isArray(parsed.experience), 'CV diekstrak dan JSON AI tervalidasi');
  if (!parsed) throw new Error('Parsing AI gagal');

  const incompleteExperience = (parsed.experience || []).find((item) => !item.company || !item.position || !item.startDate);
  report(!incompleteExperience, 'seluruh pengalaman memiliki perusahaan, posisi, dan tanggal mulai');
  if (incompleteExperience) throw new Error('CV UAT memerlukan koreksi tanggal sebelum impor');

  const profile = {
    fullName: parsed.fullName,
    preferredName: parsed.preferredName,
    phone: parsed.phone,
    city: parsed.location,
    headline: parsed.headline,
    bio: parsed.bio,
    nationality: parsed.nationality,
    dateOfBirth: parsed.dateOfBirth,
    gender: parsed.gender,
    ...(parsed.linkedIn ? { linkedIn: safeUrl(parsed.linkedIn) } : {}),
    ...(parsed.website ? { website: safeUrl(parsed.website) } : {}),
  };
  const payload = {
    profile,
    experiences: (parsed.experience || []).map((item) => ({
      organization: item.company,
      position: item.position,
      industry: item.industry,
      description: item.description,
      achievement: item.achievement,
      startDate: item.startDate,
      endDate: item.endDate,
      isCurrent: !item.endDate,
    })),
    educations: (parsed.education || []).map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy,
      startYear: item.startYear,
      endYear: item.endYear,
    })),
    skills: (parsed.skills || []).map((item) => ({
      skillName: item.name,
      category: skillCategory(item.category),
      proficiency: skillProficiency(item.proficiency),
      yearsExperience: item.yearsExperience,
    })),
    languages: (parsed.languages || []).map((item) => ({
      language: item.language,
      proficiency: languageProficiency(item.proficiency),
    })),
    certifications: (parsed.certifications || []).map((item) => ({
      name: item.name,
      issuer: item.issuer,
      issueDate: item.issueDate,
      expiryDate: item.expiryDate,
      credentialId: item.credentialId,
      credentialUrl: safeUrl(item.credentialUrl),
    })),
  };

  const imported = await jsonRequest(`${apiUrl}/api/associate/import-cv`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  report(imported.response.ok && imported.body?.success === true, 'draft yang direview berhasil diimpor secara transaksional');

  const current = await jsonRequest(`${apiUrl}/api/associate/me`, { headers: authHeaders });
  const documents = current.body?.data?.documents || [];
  const currentDocument = documents.find((item) => item.id === fileId);
  report(current.response.ok && currentDocument?.parsed_data, 'hasil parse terbaca kembali dari profil');
  report((current.body?.data?.experiences?.length || 0) === payload.experiences.length, 'jumlah pengalaman hasil impor konsisten');

  const retry = await jsonRequest(`${apiUrl}/api/ai/parse-cv`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: fileId }),
  });
  report(retry.response.ok && retry.body?.cached === true, 'retry parsing memakai cache dan tidak memanggil AI lagi');
} catch (error) {
  report(false, 'UAT CV selesai tanpa exception', error instanceof Error ? error.message : 'unknown error');
}

if (failures === 0) {
  process.stdout.write(`\nUAT CV end-to-end lulus terhadap ${apiUrl}.\n`);
  process.stdout.write('Runner mengubah CV dan data profil akun associate UAT. Jangan gunakan akun produksi nyata.\n');
} else {
  process.stdout.write(`\nUAT CV gagal pada ${failures} pemeriksaan.\n`);
  process.exitCode = 1;
}
