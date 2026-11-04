import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import AdminLayout from '../../apps/web/src/app/admin/layout';
import DashboardLayout from '../../apps/web/src/app/dashboard/layout';
import {Button} from '../../apps/web/src/components/ui/button';
import {StatCard} from '../../apps/web/src/components/ui/stat-card';
import {SearchInput} from '../../apps/web/src/components/ui/search-input';
import {StatusBadge} from '../../apps/web/src/components/ui/status-badge';
import {Tabs} from '../../apps/web/src/components/ui/tabs';
import '../../apps/web/src/app/globals.css';
function Preview() {
 const [query,setQuery]=useState(''),[tab,setTab]=useState('all');
 const Layout = new URLSearchParams(location.search).has('associate') ? DashboardLayout : AdminLayout;
 return <Layout><header className="mb-6"><h1 className="text-2xl font-semibold text-slate-900">Ringkasan workspace</h1><p className="mt-2 text-sm text-slate-500">Pratinjau lokal · data sintetis · tidak terhubung ke layanan produksi</p></header><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Associate aktif" value={128}/><StatCard label="Perlu ditinjau" value={8} icon={<span aria-hidden="true">8</span>}/><StatCard label="Penugasan aktif" value={12}/></div><section className="my-6 rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Daftar associate</h2><Button variant="gold">Buka daftar</Button></div><SearchInput value={query} onChange={setQuery} placeholder="Cari associate"/><Tabs tabs={[{id:'all',label:'Semua',count:128},{id:'review',label:'Perlu ditinjau',count:8}]} activeTab={tab} onChange={setTab}/><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Nama</th><th className="p-3">Keahlian</th><th className="p-3">Status</th></tr></thead><tbody>{['Nadia Contoh','Raka Contoh'].filter(x=>x.toLowerCase().includes(query.toLowerCase())).map(name=><tr key={name}><td className="p-3 font-medium">{name}</td><td className="p-3">Fasilitasi tim</td><td className="p-3"><StatusBadge status={tab==='review'?'pending_review':'active'}/></td></tr>)}</tbody></table></div></section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-semibold">Catatan pendamping</h2><label className="block text-sm font-medium text-slate-700">Catatan<textarea className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm" rows={3}/></label><Button className="mt-4">Simpan draf lokal</Button></section></Layout>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
