const apiUrl = (process.env.AMS_API_URL || '').replace(/\/$/, '');
const email = process.env.AMS_ADMIN_EMAIL || '';
const password = process.env.AMS_ADMIN_PASSWORD || '';

let failures = 0;

function report(ok, label, detail = '') {
  const prefix = ok ? '[PASS]' : '[FAIL]';
  const suffix = detail ? ` — ${detail}` : '';
  process.stdout.write(`${prefix} ${label}${suffix}\n`);
  if (!ok) failures += 1;
}

async function request(path, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { response, body, text };
}

if (!apiUrl || !/^https:\/\//i.test(apiUrl)) {
  report(false, 'target API memakai HTTPS');
  process.exitCode = 1;
} else {
  report(true, 'target API memakai HTTPS');

  try {
    const health = await request('/api/health');
    report(
      health.response.ok && health.body?.status === 'ok' && health.body?.version === '0.8.5',
      'health API versi 0.8.5 tersedia',
      `HTTP ${health.response.status}`,
    );

    const preflight = await request('/api/associate/me', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://ams.binahub.id',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization',
      },
    });
    report(
      preflight.response.ok && preflight.response.headers.get('access-control-allow-origin') === 'https://ams.binahub.id',
      'preflight CORS AMS diizinkan',
      `HTTP ${preflight.response.status}`,
    );

    const protectedRoutes = [
      '/api/admin/stats',
      '/api/admin/users',
      '/api/reviews/queue',
      '/api/associate/me',
      '/api/files',
    ];
    for (const path of protectedRoutes) {
      const result = await request(path);
      report(result.response.status === 401, `endpoint terlindungi menolak anonim: ${path}`, `HTTP ${result.response.status}`);
    }

    if (!email || !password) {
      report(false, 'credential smoke admin tersedia', 'set AMS_ADMIN_EMAIL dan AMS_ADMIN_PASSWORD');
    } else {
      const login = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const token = login.body?.data?.access_token;
      report(login.response.ok && typeof token === 'string' && token.length > 20, 'administrator memperoleh sesi sementara', `HTTP ${login.response.status}`);

      if (token) {
        const authHeaders = { Authorization: `Bearer ${token}` };
        const readChecks = [
          ['/api/admin/stats', 'statistik admin'],
          ['/api/admin/assignments?limit=1', 'daftar assignment'],
          ['/api/admin/users?limit=1', 'daftar pengguna'],
          ['/api/reviews/queue?limit=1', 'antrean reviewer'],
          ['/api/admin/reports/summary', 'ringkasan laporan'],
        ];

        for (const [path, label] of readChecks) {
          const result = await request(path, { headers: authHeaders });
          report(result.response.ok && result.body?.success === true, `admin dapat membaca ${label}`, `HTTP ${result.response.status}`);
          const serialized = JSON.stringify(result.body || {});
          report(!/(service_role|refresh_token|SUPABASE_SERVICE_ROLE_KEY)/i.test(serialized), `${label} tidak mengekspos secret`);
        }
      }
    }
  } catch (error) {
    report(false, 'smoke selesai tanpa exception', error instanceof Error ? error.message : 'unknown error');
  }

  if (failures === 0) {
    process.stdout.write(`\nAMS production smoke lulus terhadap ${apiUrl}.\n`);
    process.stdout.write('Runner read-only: tidak mengubah profil, assignment, review, file, atau notifikasi.\n');
  } else {
    process.stdout.write(`\nAMS production smoke gagal pada ${failures} pemeriksaan.\n`);
    process.exitCode = 1;
  }
}
