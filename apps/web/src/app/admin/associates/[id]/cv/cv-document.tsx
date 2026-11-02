import Image from 'next/image';
import { ProtectedFileImage } from '../../../../../components/ui/protected-file';
import styles from './cv-document.module.css';

export type CvData = {
  associate: { id: string; email: string; status: string; created_at: string };
  profile: Record<string, unknown> | null;
  experiences: Record<string, unknown>[];
  educations: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  portfolios: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  languages: Record<string, unknown>[];
  availability: Record<string, unknown>[];
  social_links: Record<string, unknown>[];
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  try {
    const d = new Date(trimmed.length === 7 ? `${trimmed}-01` : trimmed);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function ProficiencyBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  const colors: Record<string, string> = {
    basic: 'bg-slate-100 text-slate-600',
    conversational: 'bg-blue-50 text-blue-700',
    fluent: 'bg-emerald-50 text-emerald-700',
    native: 'bg-[#0B2C6B]/10 text-[#0B2C6B]',
    beginner: 'bg-slate-100 text-slate-600',
    intermediate: 'bg-blue-50 text-blue-700',
    advanced: 'bg-emerald-50 text-emerald-700',
    expert: 'bg-[#0B2C6B]/10 text-[#0B2C6B]',
  };
  return (
    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[value] || 'bg-slate-100 text-slate-600'}`}>
      {value}
    </span>
  );
}


export function CVDocument({data,accessToken,apiUrl}:{data:CvData;accessToken:string|null;apiUrl:string}) {
  const p = data.profile as Record<string, string | null | string[]>;
  const fullName = (p.full_name as string) || data.associate.email;
  const preferredName = p.preferred_name as string | null;
  const headline = p.headline as string | null;
  const roles = (p.roles as string[]) || [];
  const expertises = (p.expertises as string[]) || [];
  const city = (p.city as string) || '';
  const timezone = p.timezone as string | null;
  const nationality = p.nationality as string | null;
  const dateOfBirth = p.date_of_birth as string | null;
  const gender = p.gender as string | null;
  const bio = (p.bio as string) || '';
  const phone = (p.phone as string) || '';
  const photoUrl = (p.photo_url as string) || '';

  const avails = data.availability as Array<Record<string, unknown>>;


  return (
      <div className={styles.document}>
        <table className={styles.printTable} role="presentation">
          <thead><tr><td><div className={styles.brand}><Image src="/full-logo.png" alt="BinaHub" width={116} height={33} unoptimized /><span>Profil Associate</span></div></td></tr></thead>
          <tbody><tr><td className={styles.content}>
          {/* Header */}
          <div className="flex items-start gap-6 border-b-2 border-[#0B2C6B] pb-6">
            {photoUrl ? (
              <ProtectedFileImage
                src={photoUrl.startsWith('http') || photoUrl.startsWith('data:') ? photoUrl : `${apiUrl}/api/files/view-path?path=${encodeURIComponent(photoUrl)}`}
                accessToken={accessToken}
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover flex-shrink-0 print:h-20 print:w-20"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-[#0B2C6B] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 print:h-20 print:w-20">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#0B2C6B] print:text-xl">
                {fullName}
                {preferredName && <span className="ml-2 text-base font-normal text-slate-400">({preferredName})</span>}
              </h1>
              {headline && <p className="mt-0.5 text-sm text-slate-500 print:text-xs">{headline}</p>}
              {roles.length > 0 && <p className="mt-1 text-base text-slate-700 print:text-sm font-medium">{roles.join(' & ')}</p>}
              {expertises.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {expertises.map((exp) => (
                    <span key={exp} className="rounded-full bg-[#0B2C6B]/10 px-2.5 py-0.5 text-xs font-medium text-[#0B2C6B]">{exp}</span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 print:text-xs">
                {city && <span>{city}</span>}
                {nationality && <span>{nationality}</span>}
                {timezone && <span>{timezone}</span>}
                {phone && <span>{phone}</span>}
                <span>{data.associate.email}</span>
                {dateOfBirth && <span>Lahir: {formatDate(dateOfBirth)}</span>}
                {gender && <span>{(gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : gender)}</span>}
                {(data.social_links as Array<Record<string, string>>).map((s, i) => (
                  s.url && <span key={i}>{s.platform}: {s.url}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-2 print:text-xs">Profil</h2>
              <p className="text-sm text-slate-600 print:text-xs whitespace-pre-wrap">{bio}</p>
            </div>
          )}

          {/* Experiences */}
          {(data.experiences as Array<Record<string, unknown>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Pengalaman Kerja</h2>
              {(data.experiences as Array<Record<string, unknown>>).map((exp, i) => {
                const org = (exp.organization || exp.company) as string;
                const pos = (exp.position || exp.role) as string;
                const start = exp.start_date || exp.startDate || exp.start_year;
                const end = exp.end_date || exp.endDate || exp.end_year;
                const isCurrent = exp.is_current || exp.isCurrent;
                const industry = exp.industry as string | null;
                const achievement = exp.achievement as string | null;
                const description = exp.description as string | null;
                return (
                  <div key={i} data-cv-entry className="mb-4 last:mb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 print:text-xs">{pos}</p>
                        <p className="text-sm text-slate-600 print:text-xs">{org}</p>
                      </div>
                      <p className="text-xs text-slate-500 print:text-[10px] flex-shrink-0 ml-2">
                        {start ? formatDate(start as string) : ''}{end ? ` – ${formatDate(end as string)}` : isCurrent ? ' – Saat ini' : ''}
                      </p>
                    </div>
                    {industry && <p className="mt-1 text-xs text-slate-400 print:text-[10px]">Industri: {industry}</p>}
                    {achievement && <p className="mt-1 text-xs text-slate-600 print:text-[10px]"><span className="font-medium">Capaian:</span> {achievement}</p>}
                    {description && <p className="mt-1 text-xs text-slate-500 print:text-[10px]">{description}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Education */}
          {(data.educations as Array<Record<string, unknown>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Pendidikan</h2>
              {(data.educations as Array<Record<string, unknown>>).map((edu, i) => {
                const field = (edu.field_of_study || edu.field) as string | null;
                return (
                  <div key={i} data-cv-entry className="mb-3 last:mb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 print:text-xs">{edu.institution as string}</p>
                        <p className="text-sm text-slate-600 print:text-xs">{edu.degree as string}{field ? ` — ${field}` : ''}</p>
                      </div>
                      <p className="text-xs text-slate-500 print:text-[10px] flex-shrink-0 ml-2">
                        {edu.start_year as string}{edu.end_year ? ` – ${edu.end_year}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Skills */}
          {(data.skills as Array<Record<string, unknown>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Keahlian</h2>
              <div className="flex flex-wrap gap-2">
                {(data.skills as Array<Record<string, unknown>>).map((s, i) => {
                  const years = (s.years_experience || s.yearsExperience) as number | null;
                  return (
                    <div key={i} className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 print:bg-transparent print:border print:border-slate-300 print:text-[10px]">
                      <span>{s.skill_name as string}</span>
                      <ProficiencyBadge value={(s.proficiency as string) || null} />
                      {years != null && <span className="text-slate-400 text-[10px] ml-0.5">({String(years)} thn)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Certifications */}
          {(data.certifications as Array<Record<string, unknown>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Sertifikasi</h2>
              {(data.certifications as Array<Record<string, unknown>>).map((cert, i) => {
                const credentialUrl = (cert.credential_url || cert.credentialUrl) as string | null;
                const credentialId = (cert.credential_id || cert.credentialId) as string | null;
                const issueDate = cert.issue_date || cert.issueDate;
                const expiryDate = cert.expiry_date || cert.expiryDate;
                return (
                  <div key={i} data-cv-entry className="mb-2 last:mb-0">
                    <p className="text-sm font-semibold text-slate-900 print:text-xs">{cert.name as string}</p>
                    <p className="text-xs text-slate-500 print:text-[10px]">
                      {cert.issuer as string || cert.issuing_organization as string}
                      {issueDate ? ` — ${formatDate(issueDate as string)}` : ''}
                      {expiryDate ? ` (berlaku s.d. ${formatDate(expiryDate as string)})` : ''}
                    </p>
                    {credentialId && <p className="text-[10px] text-slate-400 print:text-[9px]">ID Kredensial: {credentialId}</p>}
                    {credentialUrl && (
                      <a href={credentialUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#0B2C6B] hover:underline print:text-[9px]">
                        Lihat Kredensial ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Languages */}
          {(data.languages as Array<Record<string, unknown>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Bahasa</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {(data.languages as Array<Record<string, unknown>>).map((l, i) => (
                  <span key={i} className="text-sm text-slate-700 print:text-xs">
                    {(l.language_name || l.language) as string}
                    <ProficiencyBadge value={l.proficiency as string | null} />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          {avails.length > 0 && avails[0] && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Ketersediaan</h2>
              {(() => {
                const a = avails[0];
                const status = a.status as string;
                const maxHours = a.max_hours_per_week || a.maxHoursPerWeek;
                const workLocations = (a.work_locations || a.workLocations || []) as string[];
                const travelReady = a.travel_ready || a.travelReady;
                const preferredEngagements = (a.preferred_engagements || a.preferredEngagements || []) as string[];
                const availableFrom = a.available_from || a.availableFrom;
                const notes = a.notes as string | null;
                return (
                  <div className="space-y-1.5">
                    <p className="text-sm text-slate-700 print:text-xs">
                      <span className="font-medium">Status:</span> {status || '-'}
                    </p>
                    {maxHours != null && (
                      <p className="text-sm text-slate-700 print:text-xs">
                        <span className="font-medium">Jam/Minggu:</span> {maxHours as string} jam
                      </p>
                    )}
                    {workLocations.length > 0 && (
                      <p className="text-sm text-slate-700 print:text-xs">
                        <span className="font-medium">Lokasi Kerja:</span> {workLocations.join(', ')}
                      </p>
                    )}
                    {preferredEngagements.length > 0 && (
                      <p className="text-sm text-slate-700 print:text-xs">
                        <span className="font-medium">Engagement:</span> {preferredEngagements.join(', ')}
                      </p>
                    )}
                    {travelReady != null && (
                      <p className="text-sm text-slate-700 print:text-xs">
                        <span className="font-medium">Kesiapan Perjalanan:</span> {travelReady ? 'Siap' : 'Tidak siap'}
                      </p>
                    )}
                    {availableFrom != null && (
                      <p className="text-sm text-slate-700 print:text-xs">
                        <span className="font-medium">Tersedia Sejak:</span> {formatDate(String(availableFrom))}
                      </p>
                    )}
                    {notes && (
                      <p className="text-sm text-slate-500 print:text-xs">{notes}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Portfolios */}
          {(data.portfolios as Array<Record<string, unknown>>).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2C6B] border-b border-slate-200 pb-1 mb-3 print:text-xs">Portfolio</h2>
              {(data.portfolios as Array<Record<string, unknown>>).map((port, i) => {
                const category = (port.category) as string | null;
                const clientName = (port.client_name || port.clientName) as string | null;
                const portUrl = (port.link_url || port.url || port.project_url) as string | null;
                const desc = port.description as string | null;
                return (
                  <div key={i} data-cv-entry className="mb-3 last:mb-0">
                    <p className="text-sm font-semibold text-slate-900 print:text-xs">{port.title as string}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 print:text-[10px]">
                      {category && <span>Kategori: {category}</span>}
                      {clientName && <span>Klien: {clientName}</span>}
                    </div>
                    {desc && <p className="text-xs text-slate-500 print:text-[10px] mt-0.5">{desc}</p>}
                    {portUrl && (
                      <a href={portUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0B2C6B] hover:underline print:text-[10px]">
                        {portUrl}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 print:text-[9px]">
            <p>CV Standar BinaHub — Dicetak pada {new Date().toLocaleDateString('id-ID')}</p>
          </div>
          </td></tr></tbody>
        </table>
      </div>
  );
}

