'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { referralSources, referralStages, type ReferralCode, type ReferralCodeOperation, type ReferralDashboardData, type ReferralRow } from '@ams/shared/validators/referrals';
import { useAmsLocale } from '@/components/ams-language';
import { useAuth } from '@/context/AuthContext';
import { REFERRAL_ICON, referralLink, referralRequest } from '@/lib/referrals';

const stageLabels = {
  incoming: ['Masuk', 'Received'], verified: ['Terverifikasi', 'Verified'],
  in_progress: ['Dalam pembahasan', 'In discussion'], won: ['Disepakati', 'Agreed'],
  completed: ['Selesai', 'Completed'], closed: ['Ditutup', 'Closed'],
} as const;
const sourceLabels = {
  recommendation: ['Rekomendasi program', 'Program recommendation'],
  team_diagnosis: ['Diagnosis tim', 'Team diagnosis'], individual_diagnosis: ['Self Diagnostic individu', 'Individual Self Diagnostic'],
  inquiry: ['Inquiry', 'Inquiry'], booking: ['Booking konsultasi', 'Consultation booking'],
} as const;
const reviewLabels = {
  manual: ['Kode diisi manual', 'Code entered manually'], existing_contact: ['Kontak sudah tercatat', 'Existing contact'],
  existing_organization: ['Perusahaan punya peluang aktif', 'Company has an active opportunity'],
  conflict: ['Lebih dari satu klaim', 'Multiple claims'], booking_without_code: ['Booking tanpa kode', 'Booking without a code'],
  self_referral: ['Rujukan diri sendiri', 'Self-referral'],
} as const;
const control = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 sm:text-sm';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-[#0B2C6B] hover:bg-slate-50 disabled:opacity-60';
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0B2C6B] px-4 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60';
const stageColors = {
  incoming: 'bg-amber-100 text-amber-950', verified: 'bg-blue-100 text-blue-950',
  in_progress: 'bg-indigo-100 text-indigo-950', won: 'bg-emerald-100 text-emerald-950',
  completed: 'bg-emerald-100 text-emerald-950', closed: 'bg-slate-200 text-slate-700',
};

export function ReferralWorkspace({ admin = false }: { admin?: boolean }) {
  const { locale, t } = useAmsLocale();
  const language = locale === 'en' ? 1 : 0;
  const tr = (id: string, en: string) => locale === 'en' ? en : id;
  const { accessToken } = useAuth();
  const base = admin ? '/api/admin/referrals' : '/api/associate/referrals';
  const [code, setCode] = useState<ReferralCode>();
  const [codeStatus, setCodeStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ReferralDashboardData>();
  const [problem, setProblem] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState(admin ? 'review' : '');
  const [source, setSource] = useState('');
  const [owner, setOwner] = useState('');
  const [page, setPage] = useState(1);
  const [version, reload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string>();
  const [ineligible, setIneligible] = useState(false);

  useEffect(() => {
    if (!accessToken || admin) return;
    const controller = new AbortController();
    void referralRequest<ReferralCode>(accessToken, base + '/code', undefined, controller.signal)
      .then((value) => { if (!controller.signal.aborted) { setCode(value); setCodeStatus('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setCodeStatus('error'); });
    return () => controller.abort();
  }, [accessToken, admin, base, version]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page) });
    if (status) query.set('status', status);
    if (source) query.set('source', source);
    if (owner) query.set('ownerId', owner);
    const setPending = () => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setProblem('');
      }
    };
    queueMicrotask(setPending);
    void referralRequest<ReferralDashboardData>(accessToken, base + '?' + query, undefined, controller.signal)
      .then((value) => { if (!controller.signal.aborted) { setData(value); setIneligible(false); } })
      .catch((error: Error & { code?: string }) => {
        if (!controller.signal.aborted) {
          if (error.code === 'REFERRAL_INACTIVE') setIneligible(true);
          else setProblem(error.message);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, base, status, source, owner, page, version]);

  const refresh = () => reload((value) => value + 1);

  async function copy(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(success);
    } catch {
      setFeedback(tr('Pilih tautan atau kode, lalu salin dari perangkat Anda.', 'Select the link or code and copy it using your device.'));
    }
  }

  async function save(path: string, payload: unknown, success: string) {
    if (!accessToken) return;
    await referralRequest(accessToken, base + path, payload);
    setFeedback(success);
    refresh();
  }

  function changeFilter(action: (value: string) => void, value: string) {
    action(value);
    setPage(1);
    setExpanded(undefined);
  }

  const date = (value: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', {
    dateStyle: 'medium', timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const metrics = [
    { label: tr('Kunjungan', 'Visits'), value: data?.totals.visits, filter: '' },
    { label: admin ? tr('Perlu ditinjau', 'Needs review') : tr('Masuk', 'Received'), value: admin ? data?.totals.review : data?.totals.incoming, filter: admin ? 'review' : 'incoming' },
    { label: tr('Terverifikasi', 'Verified'), value: data?.totals.verified, filter: 'verified' },
    { label: tr('Dalam pembahasan', 'In discussion'), value: data?.totals.inProgress, filter: 'in_progress' },
    { label: tr('Berhasil', 'Successful'), value: data?.totals.successful, filter: 'success' },
  ];
  const shareUrl = code ? referralLink(code.code) : '';
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / 20));
  const associates = data?.associates || [];
  const ownerName = (id: string | null) => {
    const entry = associates.find((candidate) => candidate.id === id);
    return entry?.name || entry?.code || tr('Belum dicocokkan', 'Unmatched');
  };

  return <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
    <header className="space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0B2C6B] sm:text-3xl">{admin ? tr('Referral Associate', 'Associate referrals') : 'Referral'}</h1>
      <p className="max-w-2xl text-sm leading-6 text-slate-600">{admin
        ? tr('Tinjau atribusi dan pantau perkembangan rujukan ke peluang penjualan.', 'Review attribution and monitor how referrals progress into sales opportunities.')
        : tr('Bagikan tautan BinaHub dan pantau progres calon klien yang Anda rujuk.', 'Share your BinaHub link and track the prospects you refer.')}</p>
    </header>

    {ineligible ? <p className="ams-panel p-5 text-sm text-slate-700" role="status">{tr('Referral tersedia untuk Associate aktif.', 'Referrals are available to active Associates.')}</p> : <>
      {!admin && <section className="ams-panel p-4 sm:p-5" aria-labelledby="referral-share">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="referral-share" className="flex items-center gap-2 font-semibold text-[#0B2C6B]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={REFERRAL_ICON} strokeLinecap="round" strokeLinejoin="round" /></svg>
            {tr('Tautan Anda', 'Your referral link')}
          </h2>
          {code && <span className={'rounded-md px-2.5 py-1 text-xs font-semibold ' + (code.enabled ? 'bg-emerald-100 text-emerald-950' : 'bg-slate-100 text-slate-700')}>
            {code.enabled ? tr('Aktif', 'Active') : tr('Dijeda oleh Admin', 'Paused by Admin')}</span>}
        </div>
        {code ? <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={control} type="url" readOnly value={shareUrl}
              aria-label={tr('Tautan referral Anda', 'Your referral link')} onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className={primary + ' shrink-0'} disabled={!code.enabled} onClick={() => void copy(shareUrl, tr('Tautan disalin.', 'Link copied.'))}>{tr('Salin tautan', 'Copy link')}</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={secondary} disabled={!code.enabled}
              onClick={() => void copy(code.code, tr('Kode disalin.', 'Code copied.'))}>{tr('Salin kode', 'Copy code')}</button>
            <button type="button" className={secondary} disabled={!code.enabled} onClick={() => void copy(
              tr('Saya ingin mengenalkan BinaHub untuk kebutuhan pengembangan individu, tim, atau perusahaan Anda. Jelajahi layanannya di sini: ', 'Explore BinaHub for your individual, team, or organisational development needs: ') + shareUrl,
              tr('Pesan pengantar disalin.', 'Introductory message copied.'))}>{tr('Salin pesan pengantar', 'Copy introduction')}</button>
          </div>
          {!code.enabled && <p className="text-sm text-slate-600">{tr('Hubungi Admin untuk mengaktifkan kembali kode ini.', 'Contact an Admin to reactivate this code.')}</p>}
        </div> : <p className="mt-4 text-sm text-slate-600" role="status">{codeStatus === 'error'
          ? tr('Tautan belum dapat dimuat.', 'The link could not be loaded.') : tr('Menyiapkan tautan…', 'Preparing your link…')}
          {codeStatus === 'error' && <button className="ml-2 font-semibold text-[#0B2C6B] underline" onClick={refresh}>{tr('Coba lagi', 'Retry')}</button>}</p>}
      </section>}

      {feedback && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">{feedback}</p>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5" aria-label={tr('Ringkasan referral', 'Referral summary')}>
        {metrics.map((item) => <button key={item.label} type="button" aria-pressed={status === item.filter}
          className={'min-h-20 rounded-lg border p-3 text-left transition-colors sm:p-4 ' + (status === item.filter ? 'border-[#0B2C6B] bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50')}
          onClick={() => changeFilter(setStatus, item.filter)}>
          <span className="block text-xl font-semibold tabular-nums text-[#0B2C6B]">{item.value ?? '—'}</span>
          <span className="mt-1 block text-xs font-medium leading-4 text-slate-700 sm:text-sm">{item.label}</span>
        </button>)}
      </div>

      <section className="ams-panel" aria-labelledby="referral-list" aria-busy={loading}>
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="referral-list" className="font-semibold text-[#0B2C6B]">{tr('Daftar rujukan', 'Referral list')}{data ? ' · ' + data.total : ''}</h2>
            <button type="button" className={secondary} onClick={refresh} disabled={loading}>{loading ? tr('Memuat…', 'Loading…') : tr('Muat ulang', 'Refresh')}</button>
          </div>
          <div className={'mt-4 grid gap-3 ' + (admin ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>{tr('Tahap', 'Stage')}</span>
              <select className={control} value={status} onChange={(event) => changeFilter(setStatus, event.target.value)}>
                <option value="">{tr('Semua tahap', 'All stages')}</option>
                {admin && <option value="review">{tr('Perlu ditinjau', 'Needs review')}</option>}
                {referralStages.map((value) => <option key={value} value={value}>{stageLabels[value][language]}</option>)}
                <option value="success">{tr('Berhasil', 'Successful')}</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>{tr('Jalur masuk', 'Source')}</span>
              <select className={control} value={source} onChange={(event) => changeFilter(setSource, event.target.value)}>
                <option value="">{tr('Semua jalur', 'All sources')}</option>
                {referralSources.map((value) => <option key={value} value={value}>{sourceLabels[value][language]}</option>)}
              </select>
            </label>
            {admin && <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Associate</span><select className={control} value={owner} onChange={(event) => changeFilter(setOwner, event.target.value)}>
                <option value="">{tr('Semua Associate', 'All Associates')}</option>
                {associates.map((value) => <option key={value.id} value={value.id}>{value.name || value.code}</option>)}
              </select>
            </label>}
          </div>
        </div>

        {problem ? <div className="p-4 text-sm text-red-800" role="alert">{t(problem)}</div>
          : loading && !data ? <div className="space-y-3 p-4" role="status"><span className="sr-only">{tr('Memuat referral…', 'Loading referrals…')}</span>
            {[1, 2, 3].map((line) => <div key={line} className="h-14 rounded-md bg-slate-100 motion-safe:animate-pulse" />)}
          </div> : data?.records.length ? <ul className="divide-y divide-slate-200">
            {data.records.map((row) => {
              const isOpen = expanded === row.id;
              const revisit = row.followUps.find((note) => !note.requestedHelp || note.revisitOn)?.revisitOn;
              const title = row.company || row.contact?.name || tr('Rujukan', 'Referral') + ' ' + row.id.slice(0, 7).toUpperCase();
              return <li key={row.id}>
                <button type="button" className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 sm:px-5"
                  aria-expanded={isOpen} aria-controls={'referral-' + row.id} onClick={() => setExpanded(isOpen ? undefined : row.id)}>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-slate-950">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{row.sources[0] ? sourceLabels[row.sources[0].channel][language] + ' · ' : ''}{date(row.createdAt)}
                      {admin ? ' · ' + ownerName(row.associateId) : ''}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={'rounded-md px-2 py-1 text-xs font-semibold ' + stageColors[row.stage]}>{stageLabels[row.stage][language]}</span>
                    {row.needsHelp && <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-950">{tr('Butuh bantuan', 'Needs help')}</span>}
                    {!admin && revisit && revisit <= today && !['closed', 'completed'].includes(row.stage) &&
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-950">{tr('Cek kembali', 'Follow-up due')}</span>}
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" className={'text-slate-500 ' + (isOpen ? 'rotate-180' : '')}><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none"/></svg>
                  </span>
                </button>
                <div id={'referral-' + row.id} hidden={!isOpen}>
                  {isOpen && <ReferralDetails key={row.id} row={row} admin={admin} associates={associates}
                    today={today} date={date} save={save} ownerName={ownerName} />}
                </div>
              </li>;
            })}
          </ul> : !loading && <div className="p-5 text-sm leading-6 text-slate-600">
            {status || source || owner
              ? tr('Belum ada rujukan dengan filter ini.', 'No referrals match these filters.')
              : tr('Rujukan akan muncul setelah calon klien mengirim formulir atau menyelesaikan booking.', 'Referrals will appear after a prospect submits a form or makes a booking.')}
          </div>}
        {pageCount > 1 && <nav className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-4 text-sm" aria-label={tr('Halaman rujukan', 'Referral pages')}>
          <button type="button" className={secondary} disabled={page === 1 || loading} onClick={() => { setPage(page - 1); setExpanded(undefined); }}>{tr('Sebelumnya', 'Previous')}</button>
          <span>{page} / {pageCount}</span>
          <button type="button" className={secondary} disabled={page >= pageCount || loading} onClick={() => { setPage(page + 1); setExpanded(undefined); }}>{tr('Berikutnya', 'Next')}</button>
        </nav>}
      </section>

      {admin && associates.length > 0 && <details className="ams-panel p-4 sm:p-5">
        <summary className="cursor-pointer font-semibold text-[#0B2C6B]">{tr('Kode dan kinerja Associate', 'Associate codes and performance')}</summary>
        <ul className="mt-3 divide-y divide-slate-200">
          {associates.map((row) => <li key={row.id} className="space-y-2 py-3 text-sm">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><span className="block break-words font-semibold text-slate-900">{row.name || row.code}</span>
                <span className="text-xs text-slate-600">{row.code} · {!row.active ? tr('Akun nonaktif', 'Inactive account') : row.enabled ? tr('Aktif', 'Active') : tr('Dijeda', 'Paused')}</span></div>
              <span className="text-xs leading-5 text-slate-700">{row.visits} {tr('kunjungan', 'visits')} · {row.referrals} {tr('rujukan', 'referrals')} · {row.meetings} {tr('tahap meeting', 'meeting stage')} · {row.proposals} {tr('tahap proposal', 'proposal stage')} · {row.won} {tr('disepakati', 'agreed')}</span>
            </div>
            <AdminCodeControls key={row.code + row.enabled} row={row} save={save} loading={loading} />
          </li>)}
        </ul>
      </details>}
    </>}
  </div>;
}

function AdminCodeControls({ row, save, loading }: {
  row: NonNullable<ReferralDashboardData['associates']>[number];
  save: (path: string, payload: unknown, success: string) => Promise<void>;
  loading: boolean;
}) {
  const { locale, t } = useAmsLocale();
  const tr = (id: string, en: string) => locale === 'en' ? en : id;
  const [operation, setOperation] = useState<ReferralCodeOperation>();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const labels = {
    enable: tr('Aktifkan kode', 'Enable code'),
    disable: tr('Jeda kode', 'Pause code'),
    rotate: tr('Ganti kode', 'Replace code'),
  };
  const impacts = {
    enable: tr('Tautan ini dapat menerima rujukan kembali selama akun Associate aktif.', 'This link can receive referrals again while the Associate account is active.'),
    disable: tr('Tautan dan kode ini berhenti menerima rujukan sampai diaktifkan kembali.', 'This link and code stop receiving referrals until reactivated.'),
    rotate: tr('Tautan dan kode lama langsung kehilangan validitas. Bagikan tautan baru setelah perubahan.', 'The old link and code stop working immediately. Share the new link after the change.'),
  };
  const confirmationCode = confirmation.trim().toUpperCase();
  const pending = busy || loading;

  function selectOperation(next?: ReferralCodeOperation) {
    setOperation(next);
    setConfirmation('');
    setError('');
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operation || confirmationCode !== row.code || pending) return;
    setBusy(true);
    setError('');
    try {
      await save('/code', { associateId: row.id, operation, expectedCode: row.code, confirmationCode },
        tr('Pengaturan kode referral disimpan.', 'Referral code settings saved.'));
      selectOperation();
    } catch (cause) {
      setError(cause instanceof Error ? t(cause.message) : tr('Perubahan belum tersimpan.', 'The change could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  return <details onToggle={(event) => {
    if (!event.currentTarget.open && !busy) selectOperation();
  }}>
    <summary className="min-h-11 cursor-pointer content-center font-medium text-[#0B2C6B]">{tr('Kelola kode', 'Manage code')}</summary>
    {!operation ? <div className="flex flex-wrap gap-2">
      <button type="button" className={secondary} disabled={pending} onClick={() => selectOperation(row.enabled ? 'disable' : 'enable')}>
        {labels[row.enabled ? 'disable' : 'enable']}
      </button>
      <button type="button" className={secondary} disabled={pending} onClick={() => selectOperation('rotate')}>{labels.rotate}</button>
    </div> : <form onSubmit={confirm} aria-busy={busy} className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <div>
        <h3 className="font-semibold">{labels[operation]} · {row.name || row.code}</h3>
        <p className="mt-1">{impacts[operation]} {tr('Riwayat rujukan tetap tersimpan.', 'Existing referral records are preserved.')}</p>
      </div>
      <label className="block max-w-sm space-y-1.5">
        <span>{tr('Ketik kode saat ini untuk mengonfirmasi', 'Type the current code to confirm')} <strong className="font-mono">{row.code}</strong></span>
        <input className={control} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
          maxLength={row.code.length} spellCheck={false} autoComplete="off" autoCapitalize="characters" disabled={pending} />
      </label>
      {error && <p role="alert" className="font-medium text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primary} disabled={pending || confirmationCode !== row.code}>
          {busy ? tr('Menyimpan…', 'Saving…') : tr('Konfirmasi perubahan', 'Confirm change')}
        </button>
        <button type="button" className={secondary} disabled={busy} onClick={() => selectOperation()}>{tr('Batal', 'Cancel')}</button>
      </div>
    </form>}
  </details>;
}

type DetailProps = {
  row: ReferralRow;
  admin: boolean;
  associates: NonNullable<ReferralDashboardData['associates']>;
  today: string;
  date: (value: string) => string;
  save: (path: string, payload: unknown, success: string) => Promise<void>;
  ownerName: (id: string | null) => string;
};

function ReferralDetails({ row, admin, associates, today, date, save, ownerName }: DetailProps) {
  const { locale, t } = useAmsLocale();
  const language = locale === 'en' ? 1 : 0;
  const tr = (id: string, en: string) => locale === 'en' ? en : id;
  const [note, setNote] = useState('');
  const [revisitOn, setRevisitOn] = useState('');
  const [help, setHelp] = useState(false);
  const [action, setAction] = useState<'verified' | 'rejected'>('verified');
  const [code, setCode] = useState(row.associateCode || '');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const allowFollowUp = row.canShareContact;
  const done = row.stage === 'completed' || row.stage === 'closed';
  const reviewOpen = !['closed', 'completed'].includes(row.stage);
  const dayStamp = (value: string) => date(value + 'T00:00:00+07:00');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      if (admin) {
        await save('/review', { caseId: row.id, status: action, code: action === 'verified' ? code : undefined,
          reason, expectedAt: row.updatedAt }, tr('Keputusan referral disimpan.', 'Referral decision saved.'));
        setReason('');
      } else {
        await save('/follow-up', { caseId: row.id, requestId: crypto.randomUUID(),
          note: allowFollowUp ? note : '', revisitOn: allowFollowUp ? revisitOn || null : null, help: help || !allowFollowUp },
        tr('Tindak lanjut tercatat.', 'Follow-up saved.'));
        setNote('');
        setRevisitOn('');
        setHelp(false);
      }
    } catch (error) {
      setProblem(error instanceof Error ? t(error.message) : tr('Perubahan belum tersimpan.', 'Changes could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
    {admin && row.reviewReason && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-950">
      {reviewLabels[row.reviewReason][language]}</p>}
    {row.contact?.email ? <p className="break-words text-sm text-slate-800">
      {row.contact.name ? row.contact.name + ' · ' : ''}
      <a className="font-semibold text-[#0B2C6B] underline underline-offset-2" href={'mailto:' + encodeURIComponent(row.contact.email)}>{row.contact.email}</a></p>
      : !admin && <p className="text-sm text-slate-600">{tr('Kontak tersedia setelah rujukan terverifikasi dan calon klien memberi izin.', 'Contact details are available after verification and the prospect’s consent.')}</p>}
    {row.sources.length > 0 && <div>
      <h3 className="text-sm font-semibold text-slate-900">{tr('Riwayat jalur masuk', 'Source history')}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {row.sources.map((entry, index) => <li key={index} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">
          {sourceLabels[entry.channel][language]} · {date(entry.at)}
          {admin && entry.claimedAssociateId && entry.claimedAssociateId !== row.associateId ? ' · ' + ownerName(entry.claimedAssociateId) : ''}
        </li>)}
      </ul>
    </div>}
    {admin && row.leadId && <div className="space-y-2">
      {row.nextAction && <p className="break-words text-sm text-slate-700"><strong>{tr('Langkah berikutnya', 'Next step')}</strong> · {row.nextAction}</p>}
      <a className={secondary} href="https://app.binahub.id/admin/pipeline" target="_blank" rel="noopener noreferrer">
        {tr('Buka pipeline BinaHub', 'Open BinaHub pipeline')} <span aria-hidden="true">↗</span></a>
    </div>}
    {row.followUps.length > 0 && <div>
      <h3 className="text-sm font-semibold text-slate-900">{admin ? tr('Permintaan bantuan', 'Help requests') : tr('Catatan tindak lanjut', 'Follow-up notes')}</h3>
      <ul className="mt-2 space-y-2">
        {row.followUps.map((item, index) => <li key={index} className="break-words rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <span className="text-xs text-slate-600">{date(item.at)}
            {item.revisitOn ? ' · ' + tr('Cek kembali', 'Review on') + ' ' + dayStamp(item.revisitOn) : ''}
            {item.requestedHelp ? ' · ' + (item.resolvedAt ? tr('Ditinjau admin', 'Reviewed by admin') : tr('Bantuan diminta', 'Help requested')) : ''}
          </span>
          {item.note && <p className="mt-1 whitespace-pre-wrap">{item.note}</p>}
        </li>)}
      </ul>
    </div>}
    {admin && row.reviews && row.reviews.length > 0 && <div>
      <h3 className="text-sm font-semibold text-slate-900">{tr('Riwayat keputusan', 'Decision history')}</h3>
      <ul className="mt-2 space-y-2">
        {row.reviews.map((entry, index) => <li key={index} className="break-words rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p className="text-xs text-slate-600">{date(entry.at)} · {entry.status === 'verified' ? tr('Diverifikasi', 'Verified') : tr('Ditutup', 'Closed')}
            {entry.previousAssociateId !== entry.associateId ? ' · ' + ownerName(entry.previousAssociateId) + ' → ' + ownerName(entry.associateId) : ''}</p>
          <p className="mt-1 whitespace-pre-wrap">{entry.reason}</p>
        </li>)}
      </ul>
    </div>}
    {(admin ? reviewOpen : !done && (allowFollowUp || !row.needsHelp)) && <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5 sm:p-4" aria-busy={busy}>
      <h3 className="text-sm font-semibold text-slate-900">{admin ? tr('Keputusan atribusi', 'Attribution decision') : tr('Tindak lanjut', 'Follow-up')}</h3>
      {admin ? <>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>{tr('Keputusan', 'Decision')}</span>
            <select className={control} value={action} onChange={(event) => setAction(event.target.value === 'rejected' ? 'rejected' : 'verified')}>
              <option value="verified">{tr('Verifikasi atau cocokkan', 'Verify or reconcile')}</option>
              <option value="rejected">{tr('Tutup rujukan', 'Close referral')}</option>
            </select>
          </label>
          {action === 'verified' && <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Associate</span>
            <select className={control} value={code} required onChange={(event) => setCode(event.target.value)}>
              <option value="">{tr('Pilih Associate', 'Select an Associate')}</option>
              {associates.filter((item) => item.active && item.enabled).map((item) => <option key={item.id} value={item.code}>{item.name || item.code}</option>)}
            </select>
          </label>}
        </div>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          <span>{tr('Alasan keputusan', 'Decision reason')}</span>
          <textarea required minLength={3} maxLength={500} rows={2} className={control + ' py-2'}
            value={reason} onChange={(event) => setReason(event.target.value)}
            placeholder={tr('Contoh: Klien mengonfirmasi rujukan melalui telepon.', 'Example: The client confirmed the referral by phone.')} />
        </label>
      </> : allowFollowUp ? <>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          <span>{tr('Catatan kontak', 'Contact note')}</span>
          <textarea maxLength={1000} rows={2} className={control + ' py-2'} value={note}
            onChange={(event) => setNote(event.target.value)} placeholder={tr('Contoh: Klien meminta dihubungi kembali pekan depan.', 'Example: The client asked to be contacted next week.')} />
        </label>
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>{tr('Tanggal cek kembali', 'Follow-up date')}</span>
            <input type="date" min={today} className={control} value={revisitOn} onChange={(event) => setRevisitOn(event.target.value)} />
          </label>
          {!row.needsHelp && <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-[#0B2C6B]" checked={help}
              onChange={(event) => setHelp(event.target.checked)} />{tr('Minta bantuan admin', 'Ask an admin for help')}</label>}
        </div>
      </> : <p className="text-sm text-slate-600">{tr('Minta admin meninjau rujukan ini dan membantu menentukan langkah selanjutnya.', 'Ask an admin to review this referral and advise on next steps.')}</p>}
      {problem && <p role="alert" className="text-sm text-red-800">{problem}</p>}
      <button className={primary} type="submit" disabled={busy || (admin ? reason.trim().length < 3 || (action === 'verified' && !associates.some((item) => item.code === code && item.active && item.enabled))
        : allowFollowUp && !note.trim() && !revisitOn && !help)}>
        {busy ? tr('Menyimpan…', 'Saving…') : admin ? tr('Simpan keputusan', 'Save decision') : allowFollowUp ? tr('Simpan tindak lanjut', 'Save follow-up') : tr('Minta bantuan admin', 'Ask an admin for help')}
      </button>
    </form>}
  </div>;
}
