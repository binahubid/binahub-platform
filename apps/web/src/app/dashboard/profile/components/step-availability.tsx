'use client';

import { useState } from 'react';
import { Availability } from '../types';

type StepAvailabilityProps = {
  availability: Availability | null;
  apiUrl: string;
  accessToken: string;
  onRefresh: () => void;
};

const statusOptions = [
  { value: 'open', label: 'Open for Opportunities', color: 'emerald' },
  { value: 'busy', label: 'Busy / Limited Availability', color: 'amber' },
  { value: 'unavailable', label: 'Not Available', color: 'red' },
];

const engagementOptions = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Consulting'];

export function StepAvailability({ availability, apiUrl, accessToken, onRefresh }: StepAvailabilityProps) {
  const [form, setForm] = useState({
    status: availability?.status || 'open',
    work_locations: availability?.work_locations || [],
    travel_ready: availability?.travel_ready || false,
    preferred_engagements: availability?.preferred_engagements || [],
    max_hours_per_week: availability?.max_hours_per_week?.toString() || '',
    available_from: availability?.available_from || '',
    notes: availability?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (updatedForm = form) => {
    try {
      const method = availability ? 'PUT' : 'POST';
      await fetch(`${apiUrl}/api/associate/availability`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          ...updatedForm,
          max_hours_per_week: updatedForm.max_hours_per_week ? parseInt(updatedForm.max_hours_per_week) : null,
        }),
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to autosave availability:', e);
    }
  };

  const toggleLocation = (loc: string) => {
    const cur = form.work_locations;
    const next = cur.includes(loc) ? cur.filter((l) => l !== loc) : [...cur, loc];
    const nextForm = { ...form, work_locations: next };
    setForm(nextForm);
    handleSave(nextForm);
  };

  const toggleEngagement = (eng: string) => {
    const cur = form.preferred_engagements;
    const next = cur.includes(eng) ? cur.filter((e) => e !== eng) : [...cur, eng];
    const nextForm = { ...form, preferred_engagements: next };
    setForm(nextForm);
    handleSave(nextForm);
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Status Ketersediaan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const nextForm = { ...form, status: opt.value };
                setForm(nextForm);
                handleSave(nextForm);
              }}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                form.status === opt.value
                  ? opt.color === 'emerald'
                    ? 'border-emerald-500 bg-emerald-50'
                    : opt.color === 'amber'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    form.status === opt.value
                      ? opt.color === 'emerald'
                        ? 'bg-emerald-500'
                        : opt.color === 'amber'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                      : 'bg-slate-300'
                  }`}
                />
                <span className={`text-sm font-medium ${form.status === opt.value ? 'text-slate-900' : 'text-slate-600'}`}>
                  {opt.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Work Locations */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Lokasi Kerja
        </label>
        <div className="flex flex-wrap gap-2">
          {['Remote', 'Hybrid', 'On-site', 'Jakarta', 'Surabaya', 'Bandung', 'Other'].map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => toggleLocation(loc)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                form.work_locations.includes(loc)
                  ? 'bg-[#0B2C6B] text-white border-[#0B2C6B]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#0B2C6B]/30'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Engagements */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Tipe Pekerjaan yang Disukai
        </label>
        <div className="flex flex-wrap gap-2">
          {engagementOptions.map((eng) => (
            <button
              key={eng}
              type="button"
              onClick={() => toggleEngagement(eng)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                form.preferred_engagements.includes(eng)
                  ? 'bg-[#D9A441] text-white border-[#D9A441]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#D9A441]/30'
              }`}
            >
              {eng}
            </button>
          ))}
        </div>
      </div>

      {/* Travel & Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Siap Travel?
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.travel_ready}
                onChange={(e) => {
                  const nextForm = { ...form, travel_ready: e.target.checked };
                  setForm(nextForm);
                  handleSave(nextForm);
                }}
                className="sr-only"
              />
              <div className={`h-6 w-11 rounded-full transition-colors ${form.travel_ready ? 'bg-[#0B2C6B]' : 'bg-slate-200'}`}>
                <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${form.travel_ready ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <span className="text-sm text-slate-600">{form.travel_ready ? 'Ya, bersedia travel' : 'Tidak'}</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Jam/Minggu Maksimal
          </label>
          <input
            type="number"
            min="0"
            max="80"
            value={form.max_hours_per_week}
            onChange={(e) => setForm({ ...form, max_hours_per_week: e.target.value })}
            onBlur={() => handleSave()}
            placeholder="Contoh: 40"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <svg className="inline h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Catatan Tambahan
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          onBlur={() => handleSave()}
          rows={3}
          placeholder="Informasi tambahan tentang ketersediaan Anda..."
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all resize-none"
        />
      </div>
    </div>
  );
}
