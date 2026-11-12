export const consultantTeamAgreement = [
  'PERJANJIAN KEANGGOTAAN TIM KONSULTAN BINAHUB',
  '',
  'Peran dan tanggung jawab',
  'Konsultan mendampingi calon klien dan klien BinaHub, menggali kebutuhan, menyusun usulan program, serta mencatat perkembangan dan tindak lanjut melalui Portal Konsultan.',
  '',
  'Kerahasiaan dan penggunaan informasi',
  'Informasi klien, materi internal, dan data pekerjaan digunakan untuk keperluan kerja sama dengan BinaHub. Konsultan menjaga kerahasiaannya dan membatasi pembagiannya kepada pihak yang berwenang.',
  '',
  'Komunikasi dan koordinasi',
  'Konsultan menggunakan identitas BinaHub sesuai penugasan, mencatat komunikasi yang relevan, serta mengoordinasikan perubahan jadwal, ruang lingkup, harga, dan komitmen kepada klien dengan admin.',
  '',
  'Keanggotaan dan akses',
  'Akses Portal Konsultan berlaku selama keanggotaan aktif. Admin dapat menjeda atau mengakhiri keanggotaan; riwayat pekerjaan dan persetujuan tetap dicatat sesuai kebijakan penyimpanan data.',
  '',
  'Kompensasi',
  'Ketentuan kompensasi yang berlaku dicantumkan pada bagian terpisah di bawah. Perubahan ketentuan kerja sama harus dikomunikasikan dan disepakati kembali.',
].join('\n');

export function activeConsultantMembership(membership: { status: string; accepted_at: string | null } | null, associateStatus: string) {
  return !!membership && membership.status === 'active' && !!membership.accepted_at && associateStatus === 'active';
}
