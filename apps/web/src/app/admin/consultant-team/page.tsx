'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {useAuth} from '@/context/AuthContext';
import {teamActions,teamDate,teamLabels,teamRequest,type TeamMembership} from '@/lib/consultant-team';
import s from './team.module.css';
type Directory={members:TeamMembership[];total:number;pageSize:number;defaultAgreement:string};
type Candidate={id:string;email:string;full_name:string;revision:number};
type History={id:string;action:string;created_at:string;snapshot:TeamMembership};
export default function ConsultantTeamAdminPage(){
  const {accessToken}=useAuth();
  const [data,setData]=useState<Directory>(),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [page,setPage]=useState(0),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[search,setSearch]=useState('');
  const [busy,setBusy]=useState(false),[invite,setInvite]=useState(false),[term,setTerm]=useState('');
  const [candidates,setCandidates]=useState<Candidate[]>([]),[candidateError,setCandidateError]=useState(''),[target,setTarget]=useState<Candidate|null>(null);
  const [agreement,setAgreement]=useState(''),[compensation,setCompensation]=useState(''),[reviewed,setReviewed]=useState(false);
  const [detail,setDetail]=useState<{membership:TeamMembership;history:History[]}|null>(null);
  const [confirmation,setConfirmation]=useState<{row:TeamMembership;action:string}|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const load=useCallback(async()=>{
    if(!accessToken)return;
    try{
      const result=await teamRequest<Directory>(accessToken,'/api/admin/consultant-team?'+new URLSearchParams({page:String(page),search:query,status:filter}));
      setData(result);setAgreement((v)=>v||result.defaultAgreement);setError('');
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
  function send(e:FormEvent){e.preventDefault();if(target)void mutate({action:'invite',associateId:target.id,revision:target.revision,agreementText:agreement,compensationTerms:compensation,reviewed})}
  return <div className={s.page}>
    <header className={s.heading}><div><h1>Tim Konsultan</h1><p>Kelola undangan, perjanjian, dan keanggotaan konsultan. Penugasan klien dikelola di App BinaHub.</p></div><button className={s.primary} type="button" onClick={()=>{setInvite((v)=>!v);setTarget(null);setReviewed(false)}}>{invite?'Tutup formulir':'Undang anggota'}</button></header>
    {error&&<div role="alert" className={s.error}>{error} <button type="button" onClick={()=>void load()}>Muat ulang</button></div>}
    {notice&&<p role="status" className={s.notice}>{notice}</p>}
    {invite&&<section className={s.panel}><h2>Undang ke Tim Konsultan BinaHub</h2>
      {!target?<><label className={s.field}>Cari associate aktif<input type="search" value={term} maxLength={150} onChange={(e)=>setTerm(e.target.value)} placeholder="Nama atau email"/></label>
        {candidateError&&<p role="alert" className={s.error}>{candidateError}</p>}
        <ul>{candidates.map((c)=><li className={s.row} key={c.id}><div><h3>{c.full_name}</h3><p>{c.email}</p></div><button type="button" onClick={()=>setTarget(c)}>Pilih<span className={s.sr}> {c.full_name}</span></button></li>)}</ul>
        {!candidates.length&&!candidateError&&<p className={s.empty}>Belum ada associate yang cocok. Akunnya harus aktif dan belum memiliki undangan atau keanggotaan aktif.</p>}
      </>:<form onSubmit={send} className={s.form}>
        <div className={s.row}><div><h3>{target.full_name}</h3><p>{target.email}</p></div><button type="button" onClick={()=>{setTarget(null);setReviewed(false)}}>Ganti associate</button></div>
        <label className={s.field}>Isi perjanjian kerja sama<textarea rows={14} required minLength={40} maxLength={16000} value={agreement} onChange={(e)=>{setAgreement(e.target.value);setReviewed(false)}}/></label>
        <label className={s.field}>Ketentuan kompensasi<textarea rows={4} required minLength={5} maxLength={2000} value={compensation} onChange={(e)=>{setCompensation(e.target.value);setReviewed(false)}} placeholder="Tuliskan ketentuan kerja sama yang benar-benar disepakati."/><span className={s.hint}>Gunakan ketentuan untuk peran konsultan ini. Tidak perlu memasukkan nominal proyek atau fee T-BOS.</span></label>
        <label className={s.check}><input type="checkbox" checked={reviewed} onChange={(e)=>setReviewed(e.target.checked)}/>Saya telah meninjau perjanjian dan ketentuan kompensasi ini untuk dikirim kepada associate yang dipilih.</label>
        <button className={s.primary} disabled={busy||!reviewed}>{busy?'Menyimpan…':'Kirim undangan'}</button>
      </form>}
    </section>}
    <section className={s.panel}><div className={s.heading}><h2>Keanggotaan konsultan</h2><a className={s.button} href="https://app.binahub.id/admin/consultants" target="_blank" rel="noopener noreferrer">Kelola penugasan di App</a></div>
      <form className={s.filters} onSubmit={(e)=>{e.preventDefault();setPage(0);setQuery(search)}}>
        <label className={s.field}>Cari anggota<input type="search" maxLength={150} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Nama atau email"/></label>
        <label className={s.field}>Status<select value={filter} onChange={(e)=>{setFilter(e.target.value);setPage(0)}}><option value="all">Semua status</option>{Object.entries(teamLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><button>Cari</button>
      </form>
      {!data&&!error?<p role="status" className={s.empty}>Memuat tim konsultan…</p>:!data?.members.length?<p className={s.empty}>Belum ada anggota pada pilihan ini. Gunakan Undang anggota untuk memulai.</p>:<div className={s.table}><table><thead><tr><th>Konsultan</th><th>Keanggotaan</th><th>Pembaruan portal</th><th>Tindakan</th></tr></thead><tbody>
        {data.members.map((row)=><tr key={row.associate_id}><td><h3>{row.full_name}</h3><p>{row.email}</p>{row.associate_status!=='active'&&<p>Akun AMS sedang tidak aktif</p>}</td><td>{teamLabels[row.status]}<p>{row.accepted_at?'Disetujui '+teamDate(row.accepted_at):'Diundang '+teamDate(row.invited_at)}</p></td>
          <td>{row.sync_status==='synced'?'Tersinkron':<button disabled={busy} onClick={()=>void mutate({action:'retry_sync',associateId:row.associate_id,revision:row.revision})}>Sinkronkan ulang</button>}</td>
          <td><div className={s.actions}><button disabled={busy} onClick={()=>void view(row)}>Rincian</button>{row.status==='active'&&<button disabled={busy} onClick={()=>setConfirmation({row,action:'pause'})}>Jeda</button>}{row.status==='paused'&&<button disabled={busy} onClick={()=>setConfirmation({row,action:'resume'})}>Aktifkan</button>}{['active','paused','invited'].includes(row.status)&&<button disabled={busy} onClick={()=>setConfirmation({row,action:'end'})}>Akhiri</button>}</div></td>
        </tr>)}
      </tbody></table></div>}
      {data&&data.total>data.pageSize&&<div className={s.row}><p>{page*data.pageSize+1}–{Math.min((page+1)*data.pageSize,data.total)} dari {data.total}</p><div className={s.actions}><button disabled={page===0} onClick={()=>setPage((v)=>v-1)}>Sebelumnya</button><button disabled={(page+1)*data.pageSize>=data.total} onClick={()=>setPage((v)=>v+1)}>Berikutnya</button></div></div>}
    </section>
    {detail&&<section className={s.panel}><div className={s.heading}><h2>Perjanjian {detail.membership.full_name}</h2><button onClick={()=>setDetail(null)}>Tutup rincian</button></div><p className={s.prose}>{detail.membership.agreement_text}</p><h3>Ketentuan kompensasi</h3><p className={s.prose}>{detail.membership.compensation_terms}</p><h3>Riwayat keanggotaan</h3><ul>{detail.history.map((h)=><li key={h.id} className={s.history}><p>{teamActions[h.action]||'Keanggotaan diperbarui'}</p><p className={s.hint}>{teamDate(h.created_at)}</p>{h.action==='accept'&&<details><summary>Lihat perjanjian yang disetujui saat itu</summary><p className={s.prose}>{h.snapshot.agreement_text}</p><p className={s.prose}>{h.snapshot.compensation_terms}</p></details>}</li>)}</ul></section>}
    <dialog ref={dialog} onCancel={(e)=>{if(busy)e.preventDefault();else setConfirmation(null)}} className={s.dialog}>
      <h2>{confirmation?.action==='pause'?'Jeda keanggotaan?':confirmation?.action==='end'?'Akhiri keanggotaan?':'Aktifkan kembali keanggotaan?'}</h2>
      <p>{confirmation?.row.full_name} {confirmation?.action==='resume'?'akan mendapatkan akses portal berdasarkan persetujuan yang sudah tercatat.':'akan kehilangan akses kerja Portal Konsultan. Riwayat pekerjaan dan persetujuan tetap tercatat.'}</p>
      <div className={s.actions}><button disabled={busy} onClick={()=>setConfirmation(null)}>Batal</button><button className={s.primary} disabled={busy} onClick={()=>confirmation&&void mutate({action:confirmation.action,associateId:confirmation.row.associate_id,revision:confirmation.row.revision})}>{busy?'Menyimpan…':'Ya, lanjutkan'}</button></div>
    </dialog>
  </div>;
}
