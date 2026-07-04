'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

type Preferences = {
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  profile_visibility: string;
  locale: string;
};

export default function SettingsPage() {
  const { user, accessToken } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>({
    email_notifications: true,
    whatsapp_notifications: true,
    profile_visibility: 'private',
    locale: 'id',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    if (!user || !accessToken) return;
    fetch(`${apiUrl}/api/associate/preferences`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setPrefs({
            email_notifications: d.data.email_notifications ?? true,
            whatsapp_notifications: d.data.whatsapp_notifications ?? true,
            profile_visibility: d.data.profile_visibility ?? 'private',
            locale: d.data.locale ?? 'id',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, accessToken, apiUrl]);

  const handleToggle = async (key: keyof Preferences) => {
    const newValue = typeof prefs[key] === 'boolean' ? !prefs[key] : prefs[key];
    const updated = { ...prefs, [key]: newValue };
    setPrefs(updated);
    setSaving(true);

    try {
      const res = await fetch(`${apiUrl}/api/associate/preferences`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: updated.email_notifications,
          whatsappNotifications: updated.whatsapp_notifications,
          profileVisibility: updated.profile_visibility,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setToast({ message: 'Pengaturan tersimpan', type: 'success' });
      } else {
        setToast({ message: 'Gagal menyimpan', type: 'error' });
        setPrefs(prefs);
      }
    } catch {
      setToast({ message: 'Gagal menyimpan', type: 'error' });
      setPrefs(prefs);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-xs font-semibold text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account preferences</p>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {/* Account Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Account</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">Email</span>
                <span className="text-sm font-medium text-slate-900">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Role</span>
                <span className="text-sm font-medium text-slate-900">Associate</span>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Notifikasi</h2>
            <div className="mt-4 space-y-4">
              <ToggleRow
                label="Email Notifications"
                description="Receive updates about your profile and assignments"
                enabled={prefs.email_notifications}
                disabled={saving}
                onToggle={() => handleToggle('email_notifications')}
              />
              <ToggleRow
                label="WhatsApp Notifications"
                description="Get notified via WhatsApp for important updates"
                enabled={prefs.whatsapp_notifications}
                disabled={saving}
                onToggle={() => handleToggle('whatsapp_notifications')}
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Privasi</h2>
            <div className="mt-4 space-y-4">
              <ToggleRow
                label="Profile Visibility"
                description="Allow others to see your profile"
                enabled={prefs.profile_visibility === 'public'}
                disabled={saving}
                onToggle={() => handleToggle('profile_visibility')}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleRow({ label, description, enabled, disabled, onToggle }: {
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-[#0B2C6B]' : 'bg-slate-200'} disabled:opacity-50`}
      >
        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
