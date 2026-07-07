# Catatan Update v0.5.0 — Profile, Onboarding, Bug Fixes

**Tanggal**: 2026-07-07
**Status**: Perencanaan

---

## 1. REDESAIN ONBOARDING — CV-First Single Modal

### Masalah Saat Ini
- Onboarding pakai 4 step tooltip (profile → CV → capability → complete) yang mengganggu
- User harus klik tombol navigate ke halaman lain → fragmentasi
- Tidak ada forced flow → user bisa skip semuanya

### Solusi
Ganti 4 step tooltip dengan **satu modal besar** yang muncul saat pertama kali login (atau profile belum lengkap).

### Desain Modal Onboarding
```
┌─────────────────────────────────────────────┐
│  ✕ (close button)                          │
│                                             │
│  [Illustration/CV icon]                     │
│                                             │
│  Selamat datang di BinaHub!                 │
│  Mari mulai dengan upload CV Anda.          │
│  AI akan mengisi profil Anda secara otomatis.│
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  📄  Seret & lepas CV di sini      │    │
│  │      atau klik untuk memilih file   │    │
│  │      .pdf, .doc, .docx (max 10MB)  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Upload & Isi Profil]  (primary button)    │
│                                             │
│  Nanti saja →                               │
│  (text link, skip onboarding)               │
│                                             │
└─────────────────────────────────────────────┘
```

### Spesifikasi
- **Trigger**: Muncul sekali saat pertama kali login DAN profile belum lengkap (`completionPercentage < 30`)
- **Close**: Tombol ✕ + "Nanti saja" → simpan di localStorage (`binahub_onboarding_dismissed`) + tidak muncul lagi
- **Upload**: Langsung upload + AI parse + redirect ke `/dashboard/profile` dengan tab "Dokumen" aktif
- **Loading state**: Spinner + "AI sedang menganalisis CV Anda..." → redirect otomatis selesai
- **Mobile**: Full-screen modal (bukan dialog kecil), swipe-down untuk close opsional

### File yang Diubah
- `apps/web/src/components/onboarding/context.tsx` → rewrite jadi `OnboardingModal` (bukan tooltip)
- `apps/web/src/components/onboarding/tooltip.tsx` → hapus
- `apps/web/src/components/onboarding/reminder-bar.tsx` → hapus
- `apps/web/src/app/dashboard/layout.tsx` → ganti import ke `OnboardingModal`

---

## 2. REDESAIN EDIT PROFILE — Mobile-First Step Form

### Masalah Saat Ini
- Profile page 2205 baris → berat, sulit maintain
- Edit mode global (satu tombol Edit/Simpan) → membingungkan di mobile
- Tab horizontal scroll di mobile → tidak intuitive
- Tidak ada guidance step-by-step

### Solusi
Ganti dengan **step-by-step form** seperti flow pinjol/fintech:

### Alur Edit Profile (Mobile-First)
```
Step 1: Data Diri
├── Full Name *
├── Phone / WhatsApp *
├── Email (read-only)
├── Domisili (kota)
├── Kewarganegaraan
└── Tanggal Lahir

Step 2: Profesional
├── Bidang (multi-select pill)
├── Keahlian (multi-select pill + custom)
├── Bio / Ringkasan
└── headline (otomatis dari bidang)

Step 3: Pengalaman
├── [Card list experience]
├── + Tambah Pengalaman
│   ├── Posisi *
│   ├── Perusahaan *
│   ├── Deskripsi
│   ├── Tanggal Mulai
│   └── Tanggal Selesai
└── Swipe to delete

Step 4: Pendidikan
├── [Card list education]
├── + Tambah Pendidikan
│   ├── Institusi *
│   ├── Gelar *
│   ├── Jurusan
│   ├── Tahun Mulai
│   └── Tahun Selesai
└── Swipe to delete

Step 5: Portofolio & Sertifikasi
├── [Card list portofolio]
├── + Tambah Portofolio
└── [Card list sertifikasi]
└── + Tambah Sertifikasi

Step 6: Ketersediaan
├── Status (Available / Busy / Unavailable)
├── Work Location (multi-select pill)
├── Engagement Type (multi-select pill)
└── Available From (date)

Step 7: Dokumen
├── Upload CV (drag & drop)
├── CV list + delete
├── Upload Sertifikat
└── Document list + delete
```

### UI Pattern (seperti pinjol)
- **Progress bar** di atas: `Step 3/7 — Pengalaman`
- **Back/Next** button di bawah (sticky)
- **Skip** button untuk step opsional (portofolio, sertifikasi)
- **Auto-save** per step (tidak perlu tombol Simpan global)
- **Validation** per step → warning sebelum next jika required kosong
- **Mobile**: Full-screen cards, large tap targets, bottom sheet untuk pickers

### File yang Diubah
- `apps/web/src/app/dashboard/profile/page.tsx` → rewrite jadi orchestrator
- `apps/web/src/app/dashboard/profile/steps/` → folder baru, 7 step components
- `apps/web/src/components/ui/step-progress.tsx` → komponen baru

---

## 3. BUG FIXES — Associate Notifications

### Masalah
- Notifikasi associate terkadang tidak muncul atau count salah
- Read/unread tracking pakai localStorage → reset saat clear cache

### Fix
- [ ] Cek endpoint `/api/associate/notifications` — pastikan return semua status (invited, applied, accepted, rejected, completed)
- [ ] Cek badge count di header associate — pastikan sinkron
- [ ] Pertimbangkan pakai `sessionStorage` sebagai fallback (per tab session)
- [ ] Tambah retry mechanism jika fetch gagal

---

## 4. FITUR — Ganti CV (Otomatis Hapus CV Lama)

### Masalah Saat Ini
- Upload CV baru → CV lama masih ada di database (tidak dihapus)
- User bisa punya banyak CV → membingungkan

### Solusi
- Saat upload CV baru:
  1. Cek apakah sudah ada CV (`documents.find(d => d.type === 'cv')`)
  2. Jika ada → **soft delete** CV lama (`deleted_at = now`)
  3. Upload CV baru
  4. Auto-parse dengan AI
- Tambah konfirmasi: "CV lama akan diganti. Lanjutkan?"

### File yang Diubah
- `apps/web/src/app/dashboard/profile/page.tsx` → `handleCVUpload` tambah logic delete lama
- `apps/api/src/modules/files/routes.ts` → tambah endpoint `DELETE /api/files/:id` (sudah ada, tinggal panggil)

---

## 5. FITUR — Hapus Dokumen

### Masalah
- Tidak ada tombol hapus dokumen di UI
- User ingin hapus sertifikat yang salah upload

### Solusi
- Tambah tombol hapus (🗑️) di setiap dokumen card
- Konfirmasi sebelum hapus: "Hapus dokumen [nama]? Tindakan ini tidak dapat dibatalkan."
- Call `DELETE /api/files/:id` (endpoint sudah ada)
- Refresh document list setelah hapus

### File yang Diubah
- `apps/web/src/app/dashboard/profile/page.tsx` → tambah `handleDeleteDocument` + UI tombol

---

## 6. OPTIMASI — AI Parsing Speed

### Masalah
- AI parsing terkadang lambat (>10 detik)
- User menunggu tanpa feedback yang cukup

### Solusi
- [ ] **Streaming response**: Jika OpenCode Zen support streaming, gunakan untuk progress indicator
- [ ] **Skeleton loading**: Tampilkan form skeleton saat AI parse → user bisa lihat form sedang diisi
- [ ] **Timeout**: Set timeout 30 detik → fallback ke "CV terupload, silakan isi profil manual"
- [ ] **Background parse**: Upload selesai → redirect ke profile → parse di background → notifikasi selesai
- [ ] **Optimasi prompt**: Perpendek CV_PARSING_PROMPT jika terlalu panjang (hemat token = lebih cepat)

### File yang Diubah
- `apps/web/src/app/dashboard/profile/page.tsx` → `handleCVUpload` tambah timeout + background parse
- `packages/ai/src/prompts/cv-parsing.ts` → review & optimasi prompt
- `packages/ai/src/providers/openai.ts` → tambah timeout option

---

## 7. PRIORITAS EKSEKUSI

### Fase 1 — Quick Wins (1-2 hari)
1. ✅ Hapus CV lama saat upload baru
2. ✅ Tombol hapus dokumen
3. ✅ Fix notification associate
4. ✅ AI parsing timeout + fallback

### Fase 2 — Onboarding Modal (2-3 hari)
5. ✅ Buat OnboardingModal component
6. ✅ Upload CV flow di modal
7. ✅ Auto-parse + redirect
8. ✅ Hapus tooltip & reminder-bar lama

### Fase 3 — Profile Redesign (5-7 hari)
9. ✅ Buat step-progress component
10. ✅ Buat 7 step components
11. ✅ Auto-save per step
12. ✅ Mobile-first responsive
13. ✅ Validation per step

### Fase 4 — Polish (2-3 hari)
14. ✅ AI parsing optimization
15. ✅ Loading states & skeletons
16. ✅ Error handling improvements
17. ✅ Testing mobile di berbagai device

---

## 8. TEKNOLOGI & PATTERN

### Step Form Pattern (Pinjol-style)
```tsx
// Contoh step component structure
function StepPersonalInfo({ data, onChange, onNext, onBack }) {
  return (
    <div className="space-y-4">
      <input label="Nama Lengkap" required value={data.fullName} onChange={...} />
      <input label="WhatsApp" required value={data.phone} onChange={...} />
      <input label="Kota" value={data.city} onChange={...} />
      
      <div className="sticky bottom-0 bg-white border-t p-4">
        <Button onClick={onNext} fullWidth>Lanjut →</Button>
      </div>
    </div>
  );
}
```

### Auto-Save Pattern
```tsx
// Save per step, bukan per page
const handleNext = async () => {
  await saveCurrentStep(currentStep, stepData);
  setCurrentStep(prev => prev + 1);
};
```

### Mobile-First CSS Pattern
```tsx
// Full-screen cards di mobile, centered di desktop
<div className="min-h-screen bg-white lg:min-h-0 lg:max-w-2xl lg:mx-auto lg:rounded-xl lg:mt-8">
```

---

## 9. RISIKO & MITIGASI

| Risiko | Mitigasi |
|--------|----------|
| Profile page rewrite terlalu besar | Split ke step components, tidak rewrite sekaligus |
| Auto-save race condition | Debounce 500ms + optimistic update |
| AI parsing timeout | Fallback ke manual + notifikasi |
| Mobile UX buruk | Test di device nyata, bukan hanya emulator |
| Data loss saat step transition | Auto-save + localStorage backup |

---

## 10. SUCCESS CRITERIA

- [ ] User baru bisa upload CV dalam < 30 detik (buka modal → upload → selesai)
- [ ] Profile completion rate meningkat (karena flow lebih mudah)
- [ ] Tidak ada bug notification associate
- [ ] CV lama otomatis terhapus saat upload baru
- [ ] User bisa hapus dokumen yang salah upload
- [ ] AI parsing < 10 detik untuk CV standar
- [ ] Semua halaman profile mobile-friendly (test di iPhone SE, Android small)
- [ ] Tidak ada regression dari fitur yang sudah ada
