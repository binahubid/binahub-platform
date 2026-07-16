'use client';

import { useState } from 'react';

type Experience = {
  organization: string;
  position: string;
  industry?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
};

type Education = {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
};

type StepHistoryProps = {
  experiences: Experience[];
  educations: Education[];
  onChangeExperiences: (exp: Experience[]) => void;
  onChangeEducations: (edu: Education[]) => void;
};

export function StepHistory({
  experiences,
  educations,
  onChangeExperiences,
  onChangeEducations,
}: StepHistoryProps) {
  const [activeTab, setActiveTab] = useState<'experience' | 'education'>('experience');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Experience Form Fields
  const [expCompany, setExpCompany] = useState('');
  const [expPosition, setExpPosition] = useState('');
  const [expIndustry, setExpIndustry] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expIsCurrent, setExpIsCurrent] = useState(false);

  // Education Form Fields
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStartYear, setEduStartYear] = useState('');
  const [eduEndYear, setEduEndYear] = useState('');

  const openAddExperience = () => {
    setEditIndex(null);
    setExpCompany('');
    setExpPosition('');
    setExpIndustry('');
    setExpDescription('');
    setExpStartDate('');
    setExpEndDate('');
    setExpIsCurrent(false);
    setShowForm(true);
  };

  const openEditExperience = (idx: number, exp: Experience) => {
    setEditIndex(idx);
    setExpCompany(exp.organization);
    setExpPosition(exp.position);
    setExpIndustry(exp.industry || '');
    setExpDescription(exp.description || '');
    setExpStartDate(exp.startDate || '');
    setExpEndDate(exp.endDate || '');
    setExpIsCurrent(exp.isCurrent || false);
    setShowForm(true);
  };

  const saveExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCompany.trim() || !expPosition.trim() || !expStartDate.trim()) {
      alert('Nama perusahaan, posisi, dan tanggal mulai wajib diisi.');
      return;
    }

    const item: Experience = {
      organization: expCompany.trim(),
      position: expPosition.trim(),
      industry: expIndustry.trim() || undefined,
      description: expDescription.trim() || undefined,
      startDate: expStartDate,
      endDate: expIsCurrent ? undefined : expEndDate || undefined,
      isCurrent: expIsCurrent,
    };

    if (editIndex !== null) {
      const updated = [...experiences];
      updated[editIndex] = item;
      onChangeExperiences(updated);
    } else {
      onChangeExperiences([...experiences, item]);
    }
    setShowForm(false);
  };

  const openAddEducation = () => {
    setEditIndex(null);
    setEduInstitution('');
    setEduDegree('');
    setEduField('');
    setEduStartYear('');
    setEduEndYear('');
    setShowForm(true);
  };

  const openEditEducation = (idx: number, edu: Education) => {
    setEditIndex(idx);
    setEduInstitution(edu.institution);
    setEduDegree(edu.degree);
    setEduField(edu.fieldOfStudy || '');
    setEduStartYear(edu.startYear ? String(edu.startYear) : '');
    setEduEndYear(edu.endYear ? String(edu.endYear) : '');
    setShowForm(true);
  };

  const saveEducation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduInstitution.trim() || !eduDegree.trim()) {
      alert('Nama institusi dan gelar wajib diisi.');
      return;
    }

    const item: Education = {
      institution: eduInstitution.trim(),
      degree: eduDegree.trim(),
      fieldOfStudy: eduField.trim() || undefined,
      startYear: eduStartYear ? parseInt(eduStartYear) : undefined,
      endYear: eduEndYear ? parseInt(eduEndYear) : undefined,
    };

    if (editIndex !== null) {
      const updated = [...educations];
      updated[editIndex] = item;
      onChangeEducations(updated);
    } else {
      onChangeEducations([...educations, item]);
    }
    setShowForm(false);
  };

  const removeExperience = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeExperiences(experiences.filter((_, i) => i !== idx));
  };

  const removeEducation = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeEducations(educations.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      {/* Sub tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => { setActiveTab('experience'); setShowForm(false); }}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === 'experience' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pengalaman Kerja ({experiences.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('education'); setShowForm(false); }}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === 'education' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pendidikan ({educations.length})
        </button>
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">
              {editIndex !== null ? 'Edit Data' : 'Tambah Data'} {activeTab === 'experience' ? 'Pengalaman' : 'Pendidikan'}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-medium"
            >
              Batal
            </button>
          </div>

          {activeTab === 'experience' ? (
            <form onSubmit={saveExperience} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Perusahaan / Organisasi *</label>
                  <input
                    type="text"
                    required
                    value={expCompany}
                    onChange={(e) => setExpCompany(e.target.value)}
                    placeholder="Misal: PT Bina Nusantara"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Posisi / Jabatan *</label>
                  <input
                    type="text"
                    required
                    value={expPosition}
                    onChange={(e) => setExpPosition(e.target.value)}
                    placeholder="Misal: Senior Trainer"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Industri</label>
                  <input
                    type="text"
                    value={expIndustry}
                    onChange={(e) => setExpIndustry(e.target.value)}
                    placeholder="Misal: Training & Development"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Mulai (YYYY-MM) *</label>
                  <input
                    type="text"
                    required
                    value={expStartDate}
                    onChange={(e) => setExpStartDate(e.target.value)}
                    placeholder="Contoh: 2020-05"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="expIsCurrent"
                  checked={expIsCurrent}
                  onChange={(e) => setExpIsCurrent(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B2C6B] focus:ring-[#0B2C6B]"
                />
                <label htmlFor="expIsCurrent" className="text-xs text-slate-600 font-medium select-none">
                  Saya masih bekerja di sini saat ini
                </label>
              </div>

              {!expIsCurrent && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Berakhir (YYYY-MM)</label>
                  <input
                    type="text"
                    value={expEndDate}
                    onChange={(e) => setExpEndDate(e.target.value)}
                    placeholder="Contoh: 2023-08"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Deskripsi Pekerjaan / Pencapaian</label>
                <textarea
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Jelaskan peran Anda, program yang difasilitasi, atau pencapaian..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#0B2C6B] hover:bg-[#08204F] py-2.5 text-xs font-bold text-white transition-colors"
              >
                Simpan Pengalaman
              </button>
            </form>
          ) : (
            <form onSubmit={saveEducation} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Institusi Pendidikan / Kampus *</label>
                <input
                  type="text"
                  required
                  value={eduInstitution}
                  onChange={(e) => setEduInstitution(e.target.value)}
                  placeholder="Misal: Universitas Indonesia"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Gelar / Kualifikasi *</label>
                  <input
                    type="text"
                    required
                    value={eduDegree}
                    onChange={(e) => setEduDegree(e.target.value)}
                    placeholder="Misal: Sarjana (S1), Magister (S2)"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Jurusan / Bidang Studi</label>
                  <input
                    type="text"
                    value={eduField}
                    onChange={(e) => setEduField(e.target.value)}
                    placeholder="Misal: Psikologi Industri"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tahun Mulai (YYYY)</label>
                  <input
                    type="number"
                    value={eduStartYear}
                    onChange={(e) => setEduStartYear(e.target.value)}
                    placeholder="Misal: 2016"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tahun Lulus (YYYY)</label>
                  <input
                    type="number"
                    value={eduEndYear}
                    onChange={(e) => setEduEndYear(e.target.value)}
                    placeholder="Misal: 2020"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#0B2C6B] hover:bg-[#08204F] py-2.5 text-xs font-bold text-white transition-colors"
              >
                Simpan Pendidikan
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={activeTab === 'experience' ? openAddExperience : openAddEducation}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-xs font-bold text-slate-600 hover:border-[#0B2C6B] hover:text-[#0B2C6B] transition-all bg-slate-50/50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Tambah {activeTab === 'experience' ? 'Pengalaman Kerja' : 'Riwayat Pendidikan'}
          </button>

          {activeTab === 'experience' ? (
            <div className="space-y-3">
              {experiences.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">Belum ada data pengalaman kerja</p>
              ) : (
                experiences.map((exp, idx) => (
                  <div
                    key={idx}
                    onClick={() => openEditExperience(idx, exp)}
                    className="group relative rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200 p-4 pr-16 transition-all cursor-pointer"
                  >
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditExperience(idx, exp); }}
                        className="text-slate-400 hover:text-[#0B2C6B] transition-colors p-1"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => removeExperience(idx, e)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{exp.position}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{exp.organization}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{exp.startDate} — {exp.isCurrent ? 'Sekarang' : exp.endDate || '-'}</p>
                    {exp.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{exp.description}</p>}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {educations.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">Belum ada data pendidikan</p>
              ) : (
                educations.map((edu, idx) => (
                  <div
                    key={idx}
                    onClick={() => openEditEducation(idx, edu)}
                    className="group relative rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200 p-4 pr-16 transition-all cursor-pointer"
                  >
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditEducation(idx, edu); }}
                        className="text-slate-400 hover:text-[#0B2C6B] transition-colors p-1"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => removeEducation(idx, e)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{edu.institution}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{edu.degree} {edu.fieldOfStudy ? `— ${edu.fieldOfStudy}` : ''}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{edu.startYear || '-'} — {edu.endYear || '-'}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
