'use client';

type AvailabilityForm = {
  status: string;
  travel_ready: boolean;
  max_hours_per_week: string;
  notes: string;
};

type StepAvailabilityProps = {
  form: AvailabilityForm;
  onChange: (updated: Partial<AvailabilityForm>) => void;
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Terbuka untuk Kolaborasi / Proyek', desc: 'Siap menerima undangan penugasan baru.' },
  { value: 'busy', label: 'Terbatas / Sibuk', desc: 'Hanya menerima penugasan jangka pendek / part-time.' },
  { value: 'unavailable', label: 'Tidak Tersedia', desc: 'Sedang tidak menerima penugasan baru.' },
];

export function StepAvailability({ form, onChange }: StepAvailabilityProps) {
  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Status Ketersediaan</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tentukan status kolaborasi Anda saat ini</p>
        </div>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = form.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ status: opt.value })}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  active
                    ? 'border-[#0B2C6B] bg-[#0B2C6B]/3 ring-1 ring-[#0B2C6B]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${active ? 'border-[#0B2C6B]' : 'border-slate-300'}`}>
                    {active && <div className="h-2 w-2 rounded-full bg-[#0B2C6B]" />}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${active ? 'text-[#0B2C6B]' : 'text-slate-800'}`}>{opt.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Travel Ready & Hours */}
      <div className="space-y-4">
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.travel_ready}
              onChange={(e) => onChange({ travel_ready: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 text-[#0B2C6B] focus:ring-[#0B2C6B] h-4 w-4"
            />
            <div>
              <p className="text-xs font-semibold text-slate-800">Bersedia Melakukan Perjalanan Dinas / Luar Kota</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Centang jika Anda siap ditugaskan untuk proyek di luar daerah domisili Anda.</p>
            </div>
          </label>
        </div>

        <div>
          <div className="mb-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Estimasi Kapasitas Waktu (Jam per Minggu)</label>
            <p className="text-[10px] text-slate-400 mt-0.5">Biarkan kosong jika fleksibel / tidak dibatasi</p>
          </div>
          <input
            type="number"
            value={form.max_hours_per_week}
            onChange={(e) => onChange({ max_hours_per_week: e.target.value })}
            placeholder="Misal: 20"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all"
          />
        </div>

        <div>
          <div className="mb-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Catatan Ketersediaan Tambahan</label>
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            placeholder="Tulis informasi khusus terkait jadwal kerja Anda..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2C6B] focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/10 transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
