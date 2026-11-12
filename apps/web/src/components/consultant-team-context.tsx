'use client';
import Link from 'next/link';
import { createContext,useCallback,useContext,useEffect,useState,type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { teamRequest,type TeamMembership } from '@/lib/consultant-team';

const Team=createContext<{
  membership:TeamMembership|null; error:string; opening:boolean; loading:boolean;
  reload:()=>Promise<void>; open:()=>Promise<void>;
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
  async function open(){
    if(!accessToken||opening)return;
    setOpening(true);setError('');
    try {
      const {url}=await teamRequest<{url:string}>(accessToken,'/api/associate/consultant-team/open',{});
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
  return <section className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Akses konsultan">
    <div><h2 className="text-base font-semibold text-[#0B2C6B]">{active?'Portal Konsultan':'Undangan Tim Konsultan BinaHub'}</h2>
      <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">{active?'Kelola klien, meeting, proposal, dan tindak lanjut Anda.':'Tinjau perjanjian kerja sama untuk bergabung dan mendapatkan akses portal.'}</p>
      {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
    {active?<button type="button" onClick={()=>void open()} disabled={opening} className="min-h-11 shrink-0 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123e84] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{opening?'Membuka portal…':'Buka Portal Konsultan'}</button>
      :<Link href="/dashboard/consultant" className="min-h-11 shrink-0 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#123e84]">Tinjau undangan</Link>}
  </section>;
}
