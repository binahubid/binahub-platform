'use client';

import { useState, useRef } from 'react';

type ProfileDraft = {
  full_name: string;
  preferred_name: string;
  headline: string;
  bio: string;
  phone: string;
  city: string;
  timezone: string;
  nationality: string;
  date_of_birth: string;
  gender: string;
  linkedin: string;
  website: string;
  photo_url: string;
};

type AIFieldKey = keyof ProfileDraft;

type StepReviewProfileProps = {
  draft: ProfileDraft;
  aiFilledFields: Set<AIFieldKey>;
  onChange: (updated: Partial<ProfileDraft>) => void;
  associateId: string;
  apiUrl: string;
  accessToken: string;
};

function AutoFillBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
      Terisi
    </span>
  );
}

// Custom Select Component for Modern Popover UI with upward drop direction
function CustomSelect({
  label,
  value,
  options,
  isAI,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  isAI: boolean;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-20'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[13px] font-semibold text-slate-700">{label}</label>
        {isAI && <AutoFillBadge />}
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition-all ${
          isAI
            ? 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-500'
            : 'border-slate-200 bg-white focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10'
        }`}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {selectedOption?.label || label}
        </span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 bottom-full mb-1.5 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-xs text-left transition-colors ${
                  value === opt.value
                    ? 'bg-[#0B2C6B]/5 text-[#0B2C6B] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Single field wrapper
function Field({
  label,
  fieldKey,
  value,
  isAI,
  onChange,
  type = 'text',
  placeholder,
  multiline,
  hint,
}: {
  label: string;
  fieldKey: AIFieldKey;
  value: string;
  isAI: boolean;
  onChange: (key: AIFieldKey, val: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const base = 'w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all';
  const borderClass = isAI
    ? 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-500 focus:ring-emerald-200/40'
    : 'border-slate-200 bg-white focus:border-[#0B2C6B] focus:ring-[#0B2C6B]/10';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[13px] font-semibold text-slate-700">{label}</label>
        {isAI && <AutoFillBadge />}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          rows={3}
          placeholder={placeholder}
          className={`${base} ${borderClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className={`${base} ${borderClass}`}
        />
      )}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

const GENDER_OPTIONS = [
  { value: '', label: 'Pilih gender' },
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
  { value: 'other', label: 'Lainnya' },
];

const TIMEZONE_OPTIONS = [
  { value: '', label: 'Pilih zona waktu' },
  { value: 'Asia/Jakarta', label: 'WIB — Jakarta, Bandung, Surabaya' },
  { value: 'Asia/Makassar', label: 'WITA — Makassar, Bali, Lombok' },
  { value: 'Asia/Jayapura', label: 'WIT — Jayapura, Ambon' },
  { value: 'Asia/Singapore', label: 'SGT — Singapore' },
  { value: 'Asia/Kuala_Lumpur', label: 'MYT — Kuala Lumpur' },
];

export function StepReviewProfile({
  draft,
  aiFilledFields,
  onChange,
  associateId,
  apiUrl,
  accessToken,
}: StepReviewProfileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [previewSrc, setPreviewSrc] = useState('');

  const handleChange = (key: AIFieldKey, val: string) => onChange({ [key]: val });

  const getPhotoUrl = () => {
    if (previewSrc) return previewSrc;
    if (!draft.photo_url) return '';
    
    // If it's a relative path starting with /storage, construct direct URL
    if (draft.photo_url.startsWith('/storage')) {
      return `${apiUrl}${draft.photo_url}`;
    }
    return draft.photo_url;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Ukuran foto maksimal 5MB.');
      return;
    }

    setPhotoError('');
    setUploadingPhoto(true);

    // Create local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewSrc(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const presignRes = await fetch(`${apiUrl}/api/files/presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          fileName: `photo-${Date.now()}.jpg`,
          fileType: file.type,
          fileSize: file.size,
          ownerId: associateId,
          ownerType: 'associate',
          category: 'avatar',
        }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error('Gagal presign');

      await fetch(presignData.data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      // Save relative path to DB (e.g. "/storage/v1/object/public/ams-files/...")
      const pathWithPrefix = presignData.data.path.startsWith('/') ? presignData.data.path : `/${presignData.data.path}`;
      onChange({ photo_url: pathWithPrefix });
    } catch {
      setPhotoError('Gagal mengunggah foto profil.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Profile Photo Uploader */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Foto Profil</h3>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-shrink-0 rounded-full border border-slate-200 bg-slate-200 overflow-hidden flex items-center justify-center">
            {getPhotoUrl() ? (
              <img src={getPhotoUrl()} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <svg className="h-8 w-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Pilih Foto
            </button>
            <p className="mt-1 text-[10px] text-slate-400">JPG, PNG, atau GIF · Maks. 5MB</p>
            {photoError && <p className="mt-1 text-[10px] text-red-500 font-medium">{photoError}</p>}
          </div>
        </div>
      </div>

      {/* Section: Identitas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nama Lengkap *" fieldKey="full_name" value={draft.full_name} isAI={aiFilledFields.has('full_name')} onChange={handleChange} placeholder="Misal: Budi Santoso" />
        <Field label="Nama Panggilan" fieldKey="preferred_name" value={draft.preferred_name} isAI={aiFilledFields.has('preferred_name')} onChange={handleChange} placeholder="Misal: Budi" hint="Nama panggilan" />
      </div>

      <Field label="Headline Profesional" fieldKey="headline" value={draft.headline} isAI={aiFilledFields.has('headline')} onChange={handleChange} placeholder="Misal: Senior Trainer & Facilitator | Leadership Coach" />
      
      <Field label="Bio / Ringkasan Profesional" fieldKey="bio" value={draft.bio} isAI={aiFilledFields.has('bio')} onChange={handleChange} placeholder="Ceritakan keahlian dan nilai yang Anda tawarkan..." multiline />

      {/* Section: Kontak & Lokasi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nomor WhatsApp" fieldKey="phone" value={draft.phone} isAI={aiFilledFields.has('phone')} onChange={handleChange} type="tel" placeholder="08xxxxxxxxxx" />
        <Field label="Kota / Domisili" fieldKey="city" value={draft.city} isAI={aiFilledFields.has('city')} onChange={handleChange} placeholder="Jakarta" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Kewarganegaraan" fieldKey="nationality" value={draft.nationality} isAI={aiFilledFields.has('nationality')} onChange={handleChange} placeholder="Indonesia" />
        <CustomSelect label="Zona Waktu" value={draft.timezone} options={TIMEZONE_OPTIONS} isAI={false} onChange={(val) => handleChange('timezone', val)} />
      </div>

      {/* Section: Data Pribadi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tanggal Lahir" fieldKey="date_of_birth" value={draft.date_of_birth} isAI={aiFilledFields.has('date_of_birth')} onChange={handleChange} type="date" />
        <CustomSelect label="Gender" value={draft.gender} options={GENDER_OPTIONS} isAI={aiFilledFields.has('gender')} onChange={(val) => handleChange('gender', val)} />
      </div>

      <p className="text-xs text-slate-400">* Wajib diisi</p>
    </div>
  );
}
