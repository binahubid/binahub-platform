'use client';

import { useState, useEffect } from 'react';
import { FinancialDetails } from '../types';

type StepFinancialProps = {
  apiUrl: string;
  accessToken: string;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
};

export function StepFinancial({ apiUrl, accessToken, showToast }: StepFinancialProps) {
  const [data, setData] = useState<FinancialDetails>({
    npwp: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${apiUrl}/api/associate/financial-details`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) {
          setData({
            npwp: d.data.npwp || '',
            bank_name: d.data.bank_name || '',
            bank_account_number: d.data.bank_account_number || '',
            bank_account_holder: d.data.bank_account_holder || '',
          });
        }
      })
      .catch(() => showToast('Gagal memuat data finansial', 'error'))
      .finally(() => setLoading(false));
  }, [accessToken, apiUrl, showToast]);

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/associate/financial-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          npwp: data.npwp || null,
          bankName: data.bank_name || null,
          bankAccountNumber: data.bank_account_number || null,
          bankAccountHolder: data.bank_account_holder || null,
        }),
      });
      const result = await res.json();
      if (result?.success) {
        showToast('Data finansial berhasil disimpan', 'success');
      } else {
        showToast(result?.error || 'Gagal menyimpan data finansial', 'error');
      }
    } catch {
      showToast('Gagal menyimpan data finansial', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-6 w-6 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 leading-relaxed">
        Data finansial ini bersifat rahasia dan hanya dapat dilihat oleh Admin BinaHub.
        Tidak akan ditampilkan di CV standar atau profil publik Anda.
      </p>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">NPWP</label>
        <input
          type="text"
          value={data.npwp || ''}
          onChange={(e) => setData({ ...data, npwp: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder="Contoh: 12.345.678.9-012.345"
        />
        <p className="mt-1 text-xs text-slate-400">Format: XX.XXX.XXX.X-XXX.XXX</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Bank</label>
        <input
          type="text"
          value={data.bank_name || ''}
          onChange={(e) => setData({ ...data, bank_name: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder="Contoh: Bank Mandiri"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Nomor Rekening</label>
        <input
          type="text"
          value={data.bank_account_number || ''}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setData({ ...data, bank_account_number: val });
          }}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder="Contoh: 1234567890"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pemilik Rekening</label>
        <input
          type="text"
          value={data.bank_account_holder || ''}
          onChange={(e) => setData({ ...data, bank_account_holder: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder="Nama sesuai rekening"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all disabled:opacity-50"
      >
        {saving ? (
          <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Menyimpan...</>
        ) : (
          <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Simpan Data Finansial</>
        )}
      </button>
    </div>
  );
}
