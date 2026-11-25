export type TeamMembership = {
  associate_id: string; membership_id: string; invitation_id: string; status: string;
  revision: number; agreement_text: string; compensation_terms: string; agreement_hash: string;
  agreement_version?: string | null; signed_agreement_text?: string | null;
  accepted_at: string | null; invited_at: string; updated_at: string; sync_status: string;
  email?: string; full_name?: string; associate_status?: string;
};
export const teamLabels: Record<string,string> = {
  invited:'Menunggu persetujuan', active:'Aktif', paused:'Dijeda', ended:'Keanggotaan berakhir', declined:'Undangan ditolak',
};
export const teamActions: Record<string,string> = {
  invite:'Undangan dikirim', accept:'Perjanjian disetujui', decline:'Undangan ditolak',
  pause:'Keanggotaan dijeda', resume:'Keanggotaan diaktifkan kembali', end:'Keanggotaan diakhiri',
};
export async function teamRequest<T>(token: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const base=(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/,'');
  const response=await fetch(base+path, {
    method:body===undefined?'GET':'POST', cache:'no-store', signal,
    headers:{ Authorization:'Bearer '+token, ...(body===undefined?{}:{'Content-Type':'application/json'}) },
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok || !result?.success) throw new Error(result?.error || 'Layanan belum dapat diakses. Coba lagi sebentar.');
  return result.data as T;
}
export function teamDate(value: string | null | undefined, locale: "id" | "en" = "id") {
  if(!value) return '—';
  const localTime = new Date(value).toLocaleString(locale === "en" ? "en-GB" : "id-ID", {
    timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
  });
  return localTime + (locale === "en" ? " (WIB)" : " WIB");
}

export function readableTeamDocuments(text: string) {
  return text.replaceAll('[[AMS_ACCEPTANCE_DATE]]', 'Tanggal persetujuan associate di AMS')
    .replaceAll('[[AMS_CONSULTANT_SIGNATURE]]', 'Diisi saat associate menyetujui melalui AMS')
    .split('\n\n====================\n\n');
}
