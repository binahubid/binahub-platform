import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const apiUrl = (process.env.AMS_API_URL || '').replace(/\/$/, '');
const email = process.env.AMS_ADMIN_EMAIL || '';
const password = process.env.AMS_ADMIN_PASSWORD || '';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pageSize = 100;

function fail(message) {
  process.stderr.write(`[GAGAL] ${message}\n`);
  process.exitCode = 1;
}

async function jsonRequest(path, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(90_000),
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { response, body, text };
}

function assertSuccess(result, label) {
  if (!result.response.ok || result.body?.success !== true) {
    const message = result.body?.error || `HTTP ${result.response.status}`;
    throw new Error(`${label}: ${message}`);
  }
  return result.body;
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function firstRelation(value) {
  return Array.isArray(value) ? value[0] : value;
}

function missingProfileParts(associate) {
  const profile = associate.profile || {};
  const missing = [];
  if (!profile.full_name) missing.push('nama');
  if (arrayLength(profile.roles) === 0) missing.push('peran');
  if (arrayLength(profile.expertises) === 0) missing.push('keahlian');
  if (arrayLength(associate.experiences) === 0) missing.push('pengalaman');
  if (arrayLength(associate.educations) === 0) missing.push('pendidikan');
  if (arrayLength(associate.skills) === 0) missing.push('skill');
  if (arrayLength(associate.certifications) === 0) missing.push('sertifikasi');
  if (arrayLength(associate.portfolios) === 0) missing.push('portofolio');
  if (!profile.photo_url) missing.push('foto');
  if (!firstRelation(associate.availability)?.status) missing.push('ketersediaan');
  return missing;
}

function parsedCounts(parsed) {
  return {
    pengalaman: arrayLength(parsed?.experience),
    pendidikan: arrayLength(parsed?.education),
    skill: arrayLength(parsed?.skills),
    bahasa: arrayLength(parsed?.languages),
    sertifikasi: arrayLength(parsed?.certifications),
    portofolio: arrayLength(parsed?.portfolios),
  };
}

function profileCounts(data) {
  return {
    pengalaman: arrayLength(data?.experiences),
    pendidikan: arrayLength(data?.educations),
    skill: arrayLength(data?.skills),
    bahasa: arrayLength(data?.languages),
    sertifikasi: arrayLength(data?.certifications),
    portofolio: arrayLength(data?.portfolios),
  };
}

function printCounts(label, counts) {
  process.stdout.write(`${label}: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ')}\n`);
}

async function fetchAllAssociates(authHeaders) {
  const associates = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const result = await jsonRequest(`/api/admin/associates?limit=${pageSize}&offset=${offset}`, {
      headers: authHeaders,
    });
    const body = assertSuccess(result, 'Daftar associate gagal dibaca');
    const rows = Array.isArray(body.data) ? body.data : [];
    associates.push(...rows);
    total = Number.isFinite(Number(body.total)) ? Number(body.total) : associates.length;
    if (rows.length < pageSize) break;
    offset += rows.length;
  }

  return associates;
}

function resolveSelection(answer, candidates) {
  const number = Number(answer);
  if (Number.isInteger(number) && number >= 1 && number <= candidates.length) {
    return candidates[number - 1];
  }

  const normalized = answer.trim().toLowerCase();
  if (uuidPattern.test(normalized)) {
    return candidates.find((item) => item.id === normalized) || { id: normalized };
  }

  const matches = candidates.filter((item) => {
    const name = item.profile?.full_name || '';
    return item.email?.toLowerCase().includes(normalized) || name.toLowerCase().includes(normalized);
  });
  return matches.length === 1 ? matches[0] : null;
}

if (!apiUrl || !/^https:\/\//i.test(apiUrl) || !email || !password) {
  fail('Set AMS_API_URL (HTTPS), AMS_ADMIN_EMAIL, dan AMS_ADMIN_PASSWORD terlebih dahulu.');
} else {
  const rl = createInterface({ input, output });

  try {
    process.stdout.write('Memuat profil dan CV dari AMS...\n');
    const login = await jsonRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const token = login.body?.data?.access_token;
    if (!login.response.ok || typeof token !== 'string' || token.length < 20) {
      throw new Error('Login administrator gagal');
    }
    const authHeaders = { Authorization: `Bearer ${token}` };

    const allAssociates = await fetchAllAssociates(authHeaders);
    const candidates = allAssociates
      .filter((item) => item.completeness < 100 && arrayLength(item.documents) > 0)
      .sort((a, b) => (a.completeness || 0) - (b.completeness || 0));

    if (candidates.length === 0) {
      process.stdout.write('Tidak ada profil tidak lengkap yang memiliki dokumen. Tidak ada perubahan.\n');
    } else {
      process.stdout.write(`\nDitemukan ${candidates.length} profil tidak lengkap yang memiliki dokumen:\n\n`);
      candidates.forEach((item, index) => {
        const name = item.profile?.full_name || '(nama belum ada)';
        const missing = missingProfileParts(item);
        process.stdout.write(`${String(index + 1).padStart(3, ' ')}. ${name} | ${item.email} | ${item.completeness || 0}%\n`);
        process.stdout.write(`     Kurang: ${missing.join(', ') || 'perlu pemeriksaan manual'}\n`);
      });

      const answer = await rl.question('\nPilih nomor, UUID, email, atau nama unik (Enter untuk batal): ');
      if (!answer.trim()) {
        process.stdout.write('Dibatalkan. Tidak ada perubahan.\n');
      } else {
        const selected = resolveSelection(answer, candidates);
        if (!selected?.id) throw new Error('Pilihan tidak ditemukan atau tidak unik');

        const detailResult = await jsonRequest(`/api/admin/associates/${selected.id}`, { headers: authHeaders });
        const detail = assertSuccess(detailResult, 'Detail associate gagal dibaca').data;
        const cvDocuments = (detail.documents || [])
          .filter((document) => document.type === 'cv' && !document.deleted_at)
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        const cv = cvDocuments[0];
        if (!cv) throw new Error('Profil terpilih tidak memiliki CV aktif');

        const displayName = detail.profile?.full_name || detail.email;
        process.stdout.write(`\nProfil terpilih: ${displayName} (${detail.email})\n`);
        process.stdout.write(`CV aktif: ${cv.name || cv.id}\n`);
        process.stdout.write(`Status analisis lama: ${cv.parsed_data ? 'tersedia' : 'belum ada'}\n`);
        printCounts('Data profil saat ini', profileCounts(detail));

        const parseConfirmation = await rl.question('\nKetik ANALISIS untuk membaca ulang CV ini dengan AI: ');
        if (parseConfirmation.trim() !== 'ANALISIS') {
          process.stdout.write('Analisis dibatalkan. Tidak ada perubahan.\n');
        } else {
          process.stdout.write('AI sedang membaca ulang CV. Tunggu hingga proses selesai...\n');
          const parseResult = await jsonRequest('/api/ai/parse-cv', {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_id: cv.id, force: true }),
          });
          const parsed = assertSuccess(parseResult, 'Analisis ulang CV gagal').data;

          process.stdout.write('\nHasil analisis baru:\n');
          process.stdout.write(`Nama: ${parsed.fullName || '(tidak terbaca)'}\n`);
          process.stdout.write(`Headline: ${parsed.headline || '(tidak terbaca)'}\n`);
          process.stdout.write(`Peran: ${arrayLength(parsed.roles) ? parsed.roles.join(', ') : '(tidak terbaca)'}\n`);
          process.stdout.write(`Bidang keahlian: ${arrayLength(parsed.expertises) ? parsed.expertises.join(', ') : '(tidak terbaca)'}\n`);
          printCounts('Koleksi yang ditemukan AI', parsedCounts(parsed));
          process.stdout.write('\nHasil ini baru tersimpan sebagai draft analisis CV dan belum diterapkan ke profil.\n');

          const applyConfirmation = await rl.question(`Ketik TERAPKAN untuk menggabungkan hasil ke profil ${displayName}: `);
          if (applyConfirmation.trim() !== 'TERAPKAN') {
            process.stdout.write('Penerapan dibatalkan. Profil tidak diubah; draft analisis tetap tersimpan untuk ditinjau di UI admin.\n');
          } else {
            const applyResult = await jsonRequest(`/api/admin/associates/${selected.id}/cv/apply`, {
              method: 'POST',
              headers: { ...authHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({ documentId: cv.id }),
            });
            const applied = assertSuccess(applyResult, 'Penerapan hasil CV gagal');

            const afterResult = await jsonRequest(`/api/admin/associates/${selected.id}/cv`, { headers: authHeaders });
            const after = assertSuccess(afterResult, 'Profil hasil enrichment gagal dibaca').data;
            process.stdout.write(`\n[BERHASIL] ${applied.message || 'Profil berhasil dilengkapi dari CV.'}\n`);
            printCounts('Data profil setelah enrichment', profileCounts(after));
            process.stdout.write('Satu profil selesai. Jalankan script lagi untuk memilih profil berikutnya.\n');
          }
        }
      }
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui');
  } finally {
    rl.close();
  }
}
