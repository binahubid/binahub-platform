'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {useAuth} from '@/context/AuthContext';
import {readableTeamDocuments,teamActions,teamDate,teamLabels,teamRequest,type TeamMembership} from '@/lib/consultant-team';
import s from './team.module.css';
import { useAmsLocale } from "@/components/ams-language";
type Directory={members:TeamMembership[];total:number;pageSize:number};
type Candidate={id:string;email:string;full_name:string;revision:number};
const agreementFields = [
  ['address', 'Alamat lengkap', 400],
  ['identityNumber', 'Nomor identitas', 60],
  ['npwp', 'NPWP (jika ada)', 24],
  ['bankName', 'Nama bank', 100],
  ['bankHolder', 'Nama pemilik rekening', 160],
  ['bankAccount', 'Nomor rekening', 38],
  ['signerName', 'Nama perwakilan BinaHub', 160],
  ['signerTitle', 'Jabatan perwakilan BinaHub', 120],
] as const;
type DraftProfile = Record<typeof agreementFields[number][0], string>;
const emptyProfile: DraftProfile = { address: '', identityNumber: '', npwp: '', bankName: '', bankHolder: '', bankAccount: '', signerName: '', signerTitle: '' };
type AgreementPreview = { documents: string[]; previewHash: string };
type History={id:string;action:string;created_at:string;snapshot:TeamMembership};
export default function ConsultantTeamAdminPage(){
  const { t } = useAmsLocale();
  const {accessToken}=useAuth();
  const [data,setData]=useState<Directory>(),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [page,setPage]=useState(0),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[search,setSearch]=useState('');
  const [busy,setBusy]=useState(false),[invite,setInvite]=useState(false),[term,setTerm]=useState('');
  const [candidates,setCandidates]=useState<Candidate[]>([]),[candidateError,setCandidateError]=useState(''),[target,setTarget]=useState<Candidate|null>(null);
  const [profile, setProfile]=useState<DraftProfile>(emptyProfile);
  const [preview, setPreview]=useState<AgreementPreview>();
  const [profileLoading, setProfileLoading]=useState(false);
  const [compensation,setCompensation]=useState(''),[reviewed,setReviewed]=useState(false);
  const [detail,setDetail]=useState<{membership:TeamMembership;history:History[]}|null>(null);
  const [confirmation,setConfirmation]=useState<{row:TeamMembership;action:string}|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const load=useCallback(async()=>{
    if(!accessToken)return;
    try{
      const result=await teamRequest<Directory>(accessToken,'/api/admin/consultant-team?'+new URLSearchParams({page:String(page),search:query,status:filter}));
      setData(result);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Daftar tim belum tersedia.');}
  },[accessToken,page,query,filter]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(!invite||!accessToken)return;
    const abort=new AbortController(),timer=setTimeout(()=>{
      void teamRequest<Candidate[]>(accessToken,'/api/admin/consultant-team/candidates?search='+encodeURIComponent(term),undefined,abort.signal)
        .then((rows)=>{if(!abort.signal.aborted){setCandidates(rows);setCandidateError('')}})
        .catch((e)=>{if(!abort.signal.aborted)setCandidateError(e.message)});
    },250);
    return()=>{clearTimeout(timer);abort.abort()};
  },[invite,term,accessToken]);
  useEffect(() => {
    if (!target || !accessToken) return;
    const abort = new AbortController();
    void teamRequest<Partial<DraftProfile>>(accessToken, '/api/admin/consultant-team/agreement-profile/' + target.id, undefined, abort.signal)
      .then((fields) => { if (!abort.signal.aborted) setProfile((previous) => ({ ...previous, ...fields })); })
      .catch(() => { if (!abort.signal.aborted) setError('Data rekening AMS belum dapat dimuat. Isi sesuai data yang terverifikasi.'); })
      .finally(() => { if (!abort.signal.aborted) setProfileLoading(false); });
    return () => abort.abort();
  }, [target, accessToken]);
  useEffect(()=>{
    if(confirmation&&!dialog.current?.open)dialog.current?.showModal();
    if(!confirmation&&dialog.current?.open)dialog.current.close();
  },[confirmation]);
  async function mutate(body:unknown){
    if(!accessToken)return;setBusy(true);setError('');setNotice('');
    try{
      const result=await teamRequest<TeamMembership>(accessToken,'/api/admin/consultant-team',body);
      setNotice(result.sync_status==='synced'?'Perubahan tersimpan dan tersinkron ke portal.':'Perubahan tersimpan. Sinkronisasi portal masih menunggu; gunakan Sinkronkan ulang bila diperlukan.');
      setInvite(false);setTarget(null);setCompensation('');setReviewed(false);setDetail(null);setConfirmation(null);await load();
    }catch(e){setError(e instanceof Error?e.message:'Perubahan belum tersimpan.');}
    finally{setBusy(false);}
  }
  async function view(row:TeamMembership){
    if(!accessToken)return;setBusy(true);setError('');
    try{
      const result=await teamRequest<{membership:TeamMembership;history:History[]}>(accessToken,'/api/admin/consultant-team/'+row.associate_id);
      setDetail({...result,membership:{...result.membership,full_name:row.full_name,email:row.email}});
    }catch(e){setError(e instanceof Error?e.message:'Rincian belum tersedia.');}
    finally{setBusy(false);}
  }
  function choose(candidate: Candidate | null) {
    setProfile(emptyProfile);
    setProfileLoading(!!candidate);
    setReviewed(false);
    setPreview(undefined);
    setTarget(candidate);
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!target || !accessToken || busy || profileLoading) return;
    const draft = { associateId: target.id, revision: target.revision, profile, compensationTerms: compensation };
    if (preview && reviewed) {
      await mutate({ action: 'invite', ...draft, previewHash: preview.previewHash, reviewed });
      return;
    }
    setBusy(true); setError('');
    try {
      setPreview(await teamRequest<AgreementPreview>(accessToken, '/api/admin/consultant-team/agreement-preview', draft));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'NDA dan ACA belum dapat disiapkan.');
    } finally { setBusy(false); }
  }
  return <div className={s.page}>
    <header className={s.heading}><div><h1>{t("Tim Konsultan")}</h1><p>{t("Kelola undangan, perjanjian, dan keanggotaan konsultan. Penugasan klien dikelola di App BinaHub.")}</p><Link href="/admin/materials" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">{t("Materi & panduan konsultan →")}</Link></div><button className={s.primary} type="button" onClick={()=>{setInvite((v)=>!v);setTarget(null);setReviewed(false)}}>{invite?t("Tutup formulir"):t("Undang anggota")}</button></header>
    {error&&<div role="alert" className={s.error}>{t(error)} <button type="button" onClick={()=>void load()}>{t("Muat ulang")}</button></div>}
    {notice&&<p role="status" className={s.notice}>{t(notice)}</p>}
    {invite&&<section className={s.panel}><h2>{t("Undang ke Tim Konsultan BinaHub")}</h2>
      {!target?<><label className={s.field}>{t("Cari associate aktif")}<input type="search" value={term} maxLength={150} onChange={(e)=>setTerm(e.target.value)} placeholder={t("Nama atau email")}/></label>
        {candidateError&&<p role="alert" className={s.error}>{candidateError}</p>}
        <ul>{candidates.map((c)=><li className={s.row} key={c.id}><div><h3>{c.full_name}</h3><p>{c.email}</p></div><button type="button" onClick={()=>choose(c)}>{t("Pilih")}<span className={s.sr}> {c.full_name}</span></button></li>)}</ul>
        {!candidates.length&&!candidateError&&<p className={s.empty}>{t("Belum ada associate yang cocok. Akunnya harus aktif dan belum memiliki undangan atau keanggotaan aktif.")}</p>}
      </>:<form onSubmit={send} className={s.form}>
        <div className={s.row}><div><h3>{target.full_name}</h3><p>{target.email}</p></div><button type="button" onClick={()=>choose(null)}>{t("Ganti associate")}</button></div>
        <h3>{t("Data perjanjian NDA dan ACA")}</h3>
        <p className={s.hint}>{t("Nama dan email diambil dari akun AMS. Isi alamat lengkap, nomor identitas, dan perwakilan BinaHub yang berwenang. Periksa rekening sebelum meninjau perjanjian.")}</p>
        {profileLoading && <p role="status">{t("Mengambil data dari AMS…")}</p>}
        <fieldset disabled={profileLoading || busy} className={s.form}>
          {agreementFields.map(([key, label, max]) => <label key={key} className={s.field}>{t(label)}
            <input required={key !== 'npwp'} maxLength={max} value={profile[key]}
              autoComplete="off" onChange={(event) => {
                setProfile((previous) => ({ ...previous, [key]: event.target.value }));
                setPreview(undefined); setReviewed(false);
              }} />
          </label>)}
          <label className={s.field}>{t("Ketentuan tambahan (opsional)")}
            <textarea rows={3} maxLength={2000} value={compensation} onChange={(e) => {
              setCompensation(e.target.value); setPreview(undefined); setReviewed(false);
            }} />
          </label>
        </fieldset>
        {preview ? <>
          {preview.documents.map((document, index) => <details key={index}>
            <summary>{index === 0 ? t("Perjanjian Kerahasiaan (NDA)") : t("Perjanjian Kerja Sama (ACA)")}</summary>
            <p className={s.prose}>{readableTeamDocuments(document)[0]}</p>
          </details>)}
          <label className={s.check}><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            {t("Saya telah meninjau kedua dokumen dan berwenang mengirimnya atas nama BinaHub.")}
          </label>
        </> : null}
        <button className={s.primary} disabled={busy || profileLoading || (!!preview && !reviewed)}>
          {busy ? t("Menyimpan…") : preview ? t("Kirim undangan") : t("Tinjau NDA dan ACA")}
        </button>
      </form>}
    </section>}
    <section className={s.panel}><div className={s.heading}><h2>{t("Keanggotaan konsultan")}</h2><a className={s.button} href="https://app.binahub.id/admin/consultants" target="_blank" rel="noopener noreferrer">{t("Kelola penugasan di App")}</a></div>
      <form className={s.filters} onSubmit={(e)=>{e.preventDefault();setPage(0);setQuery(search)}}>
        <label className={s.field}>{t("Cari anggota")}<input type="search" maxLength={150} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={t("Nama atau email")}/></label>
        <label className={s.field}>Status<select value={filter} onChange={(e)=>{setFilter(e.target.value);setPage(0)}}><option value="all">{t("Semua status")}</option>{Object.entries(teamLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><button>{t("Cari")}</button>
      </form>
      {!data&&!error?<p role="status" className={s.empty}>{t("Memuat tim konsultan…")}</p>:!data?.members.length?<p className={s.empty}>{t("Belum ada anggota pada pilihan ini. Gunakan Undang anggota untuk memulai.")}</p>:<div className={s.table}><table><thead><tr><th>{t("Konsultan")}</th><th>{t("Keanggotaan")}</th><th>{t("Pembaruan portal")}</th><th>Tindakan</th></tr></thead><tbody>
        {data.members.map((row)=><tr key={row.associate_id}><td><h3>{row.full_name}</h3><p>{row.email}</p>{row.associate_status!=='active'&&<p>{t("Akun AMS sedang tidak aktif")}</p>}</td><td>{t(teamLabels[row.status])}<p>{row.accepted_at?'Disetujui '+teamDate(row.accepted_at):'Diundang '+teamDate(row.invited_at)}</p></td>
          <td>{row.sync_status==='synced'?'Tersinkron':<button disabled={busy} onClick={()=>void mutate({action:'retry_sync',associateId:row.associate_id,revision:row.revision})}>{t("Sinkronkan ulang")}</button>}</td>
          <td><div className={s.actions}><button disabled={busy} onClick={()=>void view(row)}>{t("Rincian")}</button>{row.status==='active'&&<button disabled={busy} onClick={()=>setConfirmation({row,action:'pause'})}>{t("Jeda")}</button>}{row.status==='paused'&&<button disabled={busy} onClick={()=>setConfirmation({row,action:'resume'})}>Aktifkan</button>}{['active','paused','invited'].includes(row.status)&&<button disabled={busy} onClick={()=>setConfirmation({row,action:'end'})}>Akhiri</button>}</div></td>
        </tr>)}
      </tbody></table></div>}
      {data&&data.total>data.pageSize&&<div className={s.row}><p>{page*data.pageSize+1}–{Math.min((page+1)*data.pageSize,data.total)} {t("dari")} {data.total}</p><div className={s.actions}><button disabled={page===0} onClick={()=>setPage((v)=>v-1)}>{t("Sebelumnya")}</button><button disabled={(page+1)*data.pageSize>=data.total} onClick={()=>setPage((v)=>v+1)}>{t("Berikutnya")}</button></div></div>}
    </section>
    {detail&&<section className={s.panel}><div className={s.heading}><h2>Perjanjian {detail.membership.full_name}</h2><button onClick={()=>setDetail(null)}>{t("Tutup rincian")}</button></div><p className={s.prose}>{readableTeamDocuments(detail.membership.signed_agreement_text ?? detail.membership.agreement_text).join("\n\n")}</p>{detail.membership.compensation_terms?.trim()&&<><h3>{t("Ketentuan kompensasi")}</h3><p className={s.prose}>{detail.membership.compensation_terms}</p></>}<h3>{t("Riwayat keanggotaan")}</h3><ul>{detail.history.map((h)=><li key={h.id} className={s.history}><p>{t(teamActions[h.action]||t("Keanggotaan diperbarui"))}</p><p className={s.hint}>{teamDate(h.created_at)}</p>{h.action==='accept'&&<details><summary>{t("Lihat perjanjian yang disetujui saat itu")}</summary><p className={s.prose}>{readableTeamDocuments(h.snapshot.signed_agreement_text ?? h.snapshot.agreement_text).join("\n\n")}</p>{h.snapshot.compensation_terms?.trim()&&<p className={s.prose}>{h.snapshot.compensation_terms}</p>}</details>}</li>)}</ul></section>}
    <dialog ref={dialog} onCancel={(e)=>{if(busy)e.preventDefault();else setConfirmation(null)}} className={s.dialog}>
      <h2>{confirmation?.action==='pause'?t("Jeda keanggotaan?"):confirmation?.action==='end'?t("Akhiri keanggotaan?"):t("Aktifkan kembali keanggotaan?")}</h2>
      <p>{confirmation?.row.full_name} {confirmation?.action==='resume'?t("akan mendapatkan akses portal berdasarkan persetujuan yang sudah tercatat."):t("akan kehilangan akses kerja Portal Konsultan. Riwayat pekerjaan dan persetujuan tetap tercatat.")}</p>
      <div className={s.actions}><button disabled={busy} onClick={()=>setConfirmation(null)}>{t("Batal")}</button><button className={s.primary} disabled={busy} onClick={()=>confirmation&&void mutate({action:confirmation.action,associateId:confirmation.row.associate_id,revision:confirmation.row.revision})}>{busy?t("Menyimpan…"):t("Ya, lanjutkan")}</button></div>
    </dialog>
  </div>;
}
