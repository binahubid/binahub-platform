'use client';
import Link from 'next/link';
import { createContext,useCallback,useContext,useEffect,useState,type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { teamRequest,type TeamMembership } from '@/lib/consultant-team';

const Team=createContext<{
  membership:TeamMembership|null; error:string; opening:boolean; loading:boolean;
  reload:()=>Promise<void>; open:(leadId?: string)=>Promise<void>;
}|null>(null);
export function ConsultantTeamProvider({children}:{children:ReactNode}) {
  const {accessToken}=useAuth();
  const [membership,setMembership]=useState<TeamMembership|null>(null),[error,setError]=useState(''),[opening,setOpening]=useState(false);
  const [loading,setLoading]=useState(true);
  const reload=useCallback(async()=>{
    if(!accessToken) return;
    try {
      setMembership(await teamRequest<TeamMembership|null>(accessToken,'/api/associate/consultant-team'));
      setError('');
    } catch(e) { setError(e instanceof Error?e.message:'Keanggotaan belum dapat dimuat.'); }
    finally { setLoading(false); }
  },[accessToken]);
  useEffect(()=>{
    const abort=new AbortController();
    setMembership(null);setError('');setLoading(true);
    if(accessToken) void teamRequest<TeamMembership|null>(accessToken,'/api/associate/consultant-team',undefined,abort.signal)
      .then((value)=>{if(!abort.signal.aborted)setMembership(value)})
      .catch((e)=>{if(!abort.signal.aborted)setError(e.message)})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false)});
    return()=>abort.abort();
  },[accessToken]);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')void reload()};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
  },[reload]);
  async function open(leadId?: string){
    if(!accessToken||opening)return;
    setOpening(true);setError('');
    try {
      const {url}=await teamRequest<{url:string}>(accessToken,'/api/associate/consultant-team/open',leadId ? { leadId } : {});
      const destination=new URL(url);
      if(destination.protocol!=='https:'||destination.hostname!=='app.binahub.id'||destination.pathname!=='/auth/ams')
        throw new Error('Alamat portal belum dapat dipastikan. Hubungi admin.');
      window.location.assign(destination.href);
    } catch(e) { setError(e instanceof Error?e.message:'Portal belum dapat dibuka.'); setOpening(false); }
  }
  return <Team.Provider value={{membership,error,opening,loading,reload,open}}>{children}</Team.Provider>;
}
export function useConsultantTeam(){
  const state=useContext(Team);if(!state)throw new Error('Team provider is required');return state;
}
function PortalIcon(){return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5"/></svg>}
export function ConsultantPortalEntry({navigation=false}:{navigation?:boolean}){
  const {membership,error,opening,open}=useConsultantTeam();
  if(!membership)return null;
  const active=membership.status==='active';
  if(navigation)return active?<div className="mt-2">
    <button type="button" disabled={opening} onClick={()=>void open()}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#0B2C6B] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
      <PortalIcon/>{opening?'Membuka portal…':'Portal Konsultan'}
    </button>
    {error&&<p role="alert" className="px-3 pb-2 text-xs leading-5 text-red-700">{error}</p>}
  </div>:null;
  if(!active&&membership.status!=='invited')return null;
  const rowClass = "flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[#0B2C6B] transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-60";
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0B2C6B]/10"><PortalIcon /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {active ? (opening ? 'Membuka portal…' : 'Buka Portal Konsultan') : 'Tinjau undangan Tim Konsultan'}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-600">
          {active ? 'Jadwal, proposal, dan tindak lanjut' : 'Perjanjian kerja sama dan akses portal'}
        </span>
      </span>
      <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" />
      </svg>
    </>
  );
  return (
    <section className="ams-panel ams-portal-entry" aria-label="Akses konsultan">
      {active ? (
        <button type="button" className={rowClass} disabled={opening} onClick={() => void open()}>{content}</button>
      ) : (
        <Link href="/dashboard/consultant" className={rowClass}>{content}</Link>
      )}
      {error && <p role="alert" className="px-4 pb-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
