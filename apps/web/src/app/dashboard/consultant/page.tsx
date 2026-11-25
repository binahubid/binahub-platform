'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ConsultantPortalIcon, useConsultantTeam } from '@/components/consultant-team-context';
import { readableTeamDocuments,teamDate,teamLabels,teamRequest } from '@/lib/consultant-team';
import { useAmsLocale } from "@/components/ams-language";

export default function ConsultantMembershipPage(){
  const { locale, t } = useAmsLocale();
  const {accessToken}=useAuth(),{membership:m,error,opening,loading,reload,open}=useConsultantTeam();
  const documents = m ? readableTeamDocuments(m.signed_agreement_text ?? m.agreement_text) : [];
  const [consent,setConsent]=useState(false),[declining,setDeclining]=useState(false),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[problem,setProblem]=useState('');
  async function respond(action:'accept'|'decline'){
    if(!m||!accessToken)return;
    setBusy(true);setProblem('');
    try{
      await teamRequest(accessToken,'/api/associate/consultant-team/respond',{
        action,revision:m.revision,invitationId:m.invitation_id,
        ...(action==='accept'?{consent,agreementHash:m.agreement_hash}:{}),
      });
      setConsent(false);await reload();
      setFeedback(action==='accept'?'Anda telah bergabung sebagai konsultan BinaHub.':'Keputusan Anda telah disimpan.');
    }catch(e){setProblem(e instanceof Error?e.message:'Keputusan belum tersimpan.');}
    finally{setBusy(false);}
  }
  return <div className="max-w-3xl space-y-6">
    <header><h1 className="text-2xl font-semibold tracking-tight text-[#0B2C6B]">{t("Tim Konsultan BinaHub")}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("Keanggotaan dan perjanjian kerja sama Anda sebagai konsultan.")}</p></header>
    {(problem||error)&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t(problem||error)}<button type="button" onClick={()=>void reload()} className="ml-3 underline">{t("Muat ulang")}</button></div>}
    {feedback&&<p role="status" className="rounded-lg bg-blue-50 p-4 text-sm text-[#0B2C6B]">{t(feedback)}</p>}
    {loading?<p role="status" className="py-6 text-sm text-slate-600">{t("Memuat keanggotaan konsultan…")}</p>:!m?<section className="ams-panel p-6"><p className="text-sm leading-6 text-slate-600">{t("Undangan konsultan belum tersedia untuk akun ini. Hubungi admin BinaHub jika Anda sudah menerima pemberitahuan.")}</p><Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-[#0B2C6B] underline">{t("Kembali ke beranda AMS")}</Link></section>
      :<section className="ams-panel p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
          <h2 className="text-lg font-semibold text-slate-900">{t("Perjanjian kerja sama konsultan")}</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#0B2C6B]">{t(teamLabels[m.status])}</span>
        </div>
        {documents.length === 2 ? <div className="space-y-3">
          {documents.map((document,index) => <details key={index} className="rounded-lg border border-slate-200 px-4">
            <summary className="cursor-pointer py-3 text-sm font-semibold text-[#0B2C6B]">
              {index === 0 ? t("Perjanjian Kerahasiaan (NDA)") : t("Perjanjian Kerja Sama (ACA)")}
            </summary>
            <div className="max-w-prose whitespace-pre-line break-words pb-4 text-sm leading-7 text-slate-700">{document}</div>
          </details>)}
        </div> : <div className="max-w-prose whitespace-pre-line text-sm leading-7 text-slate-700">{documents[0]}</div>}
        {m.compensation_terms?.trim()&&<section className="mt-6 border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">{t("Ketentuan kompensasi")}</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{m.compensation_terms}</p></section>}
        {m.accepted_at&&<p className="mt-5 text-xs leading-5 text-slate-500">{t("Disetujui pada")} {teamDate(m.accepted_at, locale)}.</p>}
        {m.status==='invited'?<div className="mt-6 space-y-5 border-t border-slate-200 pt-5">
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700"><input type="checkbox" checked={consent} onChange={(e)=>setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0"/>{t(documents.length === 2 ? "Saya telah membaca dan menyetujui NDA dan ACA." : "Saya telah membaca dan menyetujui perjanjian kerja sama ini.")}</label>
          <div className="flex flex-col gap-3 sm:flex-row"><button type="button" disabled={busy||!consent} onClick={()=>void respond('accept')} className="min-h-11 rounded-lg bg-[#0B2C6B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{t(busy ? "Menyimpan…" : "Setujui & Bergabung")}</button>
            <button type="button" disabled={busy} onClick={()=>setDeclining(true)} className="min-h-11 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700">{t("Tolak undangan")}</button></div>
          {declining&&<div className="rounded-lg border border-slate-200 p-4"><p className="text-sm leading-6 text-slate-700">{t("Apakah Anda ingin menolak undangan ini? Admin dapat mengirim undangan baru jika Anda ingin membahasnya kembali.")}</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={()=>setDeclining(false)} className="min-h-11 px-3 text-sm underline">{t("Batal")}</button><button type="button" disabled={busy} onClick={()=>void respond('decline')} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700">{t("Ya, tolak undangan")}</button></div></div>}
        </div>:m.status==='active'?<div className="mt-6 border-t border-slate-200 pt-5"><p className="mb-4 text-sm leading-6 text-slate-600">{t("Akses berlaku selama keanggotaan Anda aktif, termasuk ketika belum ada penugasan klien.")}</p><button type="button" onClick={()=>void open()} disabled={opening} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0B2C6B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><ConsultantPortalIcon/>{opening?t("Membuka portal…"):t("Buka Portal Konsultan")}</button></div>
          :<p className="mt-6 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">{m.status==='paused'?t("Keanggotaan Anda sedang dijeda. Hubungi admin untuk membahas kelanjutan akses."):m.status==='ended'?t("Keanggotaan konsultan Anda sudah berakhir. Riwayat persetujuan tetap tercatat."):t("Anda telah menolak undangan ini. Hubungi admin jika ingin membahas undangan baru.")}</p>}
      </section>}
  </div>;
}
