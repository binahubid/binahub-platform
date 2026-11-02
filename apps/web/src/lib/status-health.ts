/** Release version is information, not an availability gate tied to an old build. */
export function classifyAPIHealth(body: unknown): { status: 'ok' | 'error'; message: string } {
  if (body && typeof body === 'object' && 'status' in body && 'version' in body
    && body.status === 'ok' && typeof body.version === 'string' && body.version.length <= 80
    && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(body.version)) {
    return {status:'ok',message:'Versi '+body.version+' · Konfigurasi dasar tersedia'};
  }
  return {status:'error',message:'Respons pemeriksaan API tidak valid atau layanan belum siap'};
}
