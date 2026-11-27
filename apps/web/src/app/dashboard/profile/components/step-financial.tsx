'use client';

import { useState, useEffect } from 'react';
import { FinancialDetails } from '../types';
import { useAmsLocale } from "@/components/ams-language";

type StepFinancialProps = {
  apiUrl: string;
  accessToken: string;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
};

export function StepFinancial({ apiUrl, accessToken, showToast }: StepFinancialProps) {
  const { t } = useAmsLocale();
  const [data, setData] = useState<FinancialDetails>({
    agreement_address: '',
    agreement_identity_number: '',
    npwp: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agreementProfileAvailable, setAgreementProfileAvailable] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    fetch(`${apiUrl}/api/associate/financial-details`, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (controller.signal.aborted) return;
        if (!d?.success) throw new Error('PROFILE_UNAVAILABLE');
        setLoadError(false);
        setAgreementProfileAvailable(d.agreementProfileAvailable === true);
        if (d.data) {
          setData({
            agreement_address: d.data.agreement_address || '',
            agreement_identity_number: d.data.agreement_identity_number || '',
            npwp: d.data.npwp || '',
            bank_name: d.data.bank_name || '',
            bank_account_number: d.data.bank_account_number || '',
            bank_account_holder: d.data.bank_account_holder || '',
          });
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, apiUrl, revision]);

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/associate/financial-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          ...(agreementProfileAvailable ? {
            agreementAddress: data.agreement_address || null,
            agreementIdentityNumber: data.agreement_identity_number || null,
          } : {}),
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

  if (loadError) return <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
    {t('Gagal memuat data finansial')}
    <button type="button" className="ml-3 min-h-11 font-semibold underline" onClick={() => {
      setLoading(true); setRevision(current => current + 1);
    }}>{t('Coba lagi')}</button>
  </div>;

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 leading-relaxed">{t("Data finansial ini bersifat rahasia dan hanya dapat dilihat oleh Admin BinaHub. Tidak akan ditampilkan di CV standar atau profil publik Anda.")}</p>

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
        <label className="block text-sm font-semibold text-slate-700 mb-2">{t("Nama Bank")}</label>
        <input
          type="text"
          value={data.bank_name || ''}
          onChange={(e) => setData({ ...data, bank_name: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder="Contoh: Bank Mandiri"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">{t("Nomor Rekening")}</label>
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
        <label className="block text-sm font-semibold text-slate-700 mb-2">{t("Nama Pemilik Rekening")}</label>
        <input
          type="text"
          value={data.bank_account_holder || ''}
          onChange={(e) => setData({ ...data, bank_account_holder: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          placeholder={t("Nama sesuai rekening")}
        />
      </div>

      {agreementProfileAvailable && <details className="rounded-xl border border-slate-200 px-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[#0B2C6B]">
          {t("Data untuk perjanjian (opsional)")}
        </summary>
        <div className="space-y-4 pb-4">
          <p className="text-xs leading-6 text-slate-600">{t("Isi jika diperlukan untuk undangan konsultan. Hanya Anda dan admin BinaHub yang dapat melihat data ini untuk menyiapkan perjanjian.")}</p>
          <label className="block text-sm font-medium text-slate-800">
            {t("Alamat lengkap untuk perjanjian")}
            <input type="text" maxLength={400} autoComplete="street-address" value={data.agreement_address || ''}
              onChange={event => setData({ ...data, agreement_address: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            {t("Nomor identitas untuk perjanjian")}
            <input type="text" maxLength={60} autoComplete="off" value={data.agreement_identity_number || ''}
              onChange={event => setData({ ...data, agreement_identity_number: event.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
      </details>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all disabled:opacity-50"
      >
        {saving ? (
          <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t("Menyimpan...")}</>
        ) : (
          <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t("Simpan Data Finansial")}</>
        )}
      </button>
    </div>
  );
}
