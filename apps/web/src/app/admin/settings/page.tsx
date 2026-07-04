'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type AdminPrefs = {
  email_notifications: boolean;
  review_alerts: boolean;
  weekly_summary: boolean;
  new_associate_alerts: boolean;
};

const DEFAULT_PREFS: AdminPrefs = {
  email_notifications: true,
  review_alerts: true,
  weekly_summary: false,
  new_associate_alerts: true,
};

export default function AdminSettingsPage() {
  const { user, accessToken, signOut } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<AdminPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!user || !accessToken) return;
    fetch(`${apiUrl}/api/admin/preferences`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.data) {
          setPrefs({ ...DEFAULT_PREFS, ...d.data });
        }
      })
      .catch(() => {
        console.error('Gagal memuat preferensi');
      })
      .finally(() => setLoading(false));
  }, [user, accessToken, apiUrl]);

  const handleToggle = async (key: keyof AdminPrefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      const resp = await fetch(`${apiUrl}/api/admin/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(newPrefs),
      });
      const d = await resp.json();
      if (d?.success) {
        toast('success', 'Preferensi disimpan');
      } else {
        toast('error', d?.error || 'Gagal menyimpan');
        setPrefs(prefs); // rollback
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
      setPrefs(prefs); // rollback
    } finally {
      setSaving(false);
    }
  };

  const role = (user?.app_metadata?.role as string) || 'admin';
  const fullName = user?.user_metadata?.full_name as string | undefined;

  const Toggle = ({ label, description, checked, onChange }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-[#0B2C6B]' : 'bg-slate-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Pengaturan sistem dan preferensi admin.</p>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Akun Admin</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Nama</span>
            <span className="font-medium text-slate-900">{fullName || '-'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-slate-900 capitalize">{role}</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          Keluar dari Sistem
        </button>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Preferensi Notifikasi</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="h-6 w-6 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="mt-2">
            <Toggle
              label="Email Notifikasi"
              description="Terima email untuk setiap notifikasi sistem"
              checked={prefs.email_notifications}
              onChange={() => handleToggle('email_notifications')}
            />
            <Toggle
              label="Alert Review Baru"
              description="Notifikasi saat ada associate baru submit untuk review"
              checked={prefs.review_alerts}
              onChange={() => handleToggle('review_alerts')}
            />
            <Toggle
              label="Alert Associate Baru"
              description="Notifikasi saat ada pendaftar baru"
              checked={prefs.new_associate_alerts}
              onChange={() => handleToggle('new_associate_alerts')}
            />
            <Toggle
              label="Ringkasan Mingguan"
              description="Terima ringkasan statistik setiap minggu"
              checked={prefs.weekly_summary}
              onChange={() => handleToggle('weekly_summary')}
            />
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Informasi Sistem</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Versi</span>
            <span className="font-medium text-slate-900">BinaHub AMS v1.0.0</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">API URL</span>
            <span className="font-mono text-xs text-slate-700">{apiUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
