"use client";
import Link from "next/link";
import { useState } from "react";
import type { MaterialVideoVersion } from "@ams/shared/types/materials";
import { useAuth } from "@/context/AuthContext";
import {
  downloadMaterialFile,
  materialVideoUrl,
  useMaterialCatalog,
} from "@/lib/materials";
import s from "./materials.module.css";
import { useAmsLocale } from "@/components/ams-language";

const videoVersions = [
  { id: "id", label: "Bahasa Indonesia" },
  { id: "en", label: "English" },
  { id: "mobile", label: "Mobile (Bahasa Indonesia)" },
] as const;

export default function AdminMaterialsPage() {
  const { t } = useAmsLocale();
  const { accessToken } = useAuth();
  const { data, error, reload } = useMaterialCatalog();
  const [version, setVersion] = useState<MaterialVideoVersion>("id");
  const [desktopSeries, setSeries] = useState("fitur"),
    [query, setQuery] = useState("");
  const [busy, setBusy] = useState(""),
    [downloadError, setDownloadError] = useState("");
  async function download(slug: string, filename: string) {
    if (!accessToken || busy) return;
    setBusy(slug);
    setDownloadError("");
    try {
      await downloadMaterialFile(accessToken, slug, filename);
    } catch {
      setDownloadError("Dokumen belum dapat diunduh. Coba lagi.");
    } finally {
      setBusy("");
    }
  }
  const series = version === "mobile" ? "sop" : desktopSeries;
  const locale = version === "en" ? "en" : "id";
  const search = query.trim().toLocaleLowerCase(locale);
  const versions = videoVersions.filter(({ id }) =>
    id === "id" || data?.videos.some((video) => video.versions?.[id]),
  );
  const videos = data?.videos.flatMap((video) => {
    if (video.series !== series) return [];
    const variant = version === "id" ? video : video.versions?.[version];
    if (!variant) return [];
    const selected = { ...video, ...variant };
    return `${selected.id} ${selected.title}`.toLocaleLowerCase(locale).includes(search)
      ? [selected]
      : [];
  }) ?? [];
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>{t("Materi")}</h1>
        <p>{t("Profil perusahaan, panduan produk, dan tutorial untuk mendukung pekerjaan tim.")}</p>
      </header>
      {error && (
        <div className="ams-panel p-5">
          <p role="alert">{t(error)}</p>
          <button className={s.button} type="button" onClick={reload}>{t("Coba lagi")}</button>
        </div>
      )}
      {!data && !error && <p role="status">{t("Memuat materi…")}</p>}
      {data && (
        <>
          <section aria-labelledby="documents-title">
            <div className={s.sectionHeading}>
              <h2 id="documents-title">{t("Dokumen")}</h2>
              <p>{t("Baca langsung di web atau unduh PDF untuk persiapan konsultasi.")}</p>
            </div>
            {downloadError && (
              <p role="alert" className={s.error}>
                {t(downloadError)}
              </p>
            )}
            <div className={s.documents}>
              {data.documents.map((document) => (
                <article
                  key={document.slug}
                  className={`ams-panel ${s.document}`}
                >
                  <span className={s.documentLabel}>
                    {document.slug.startsWith("company")
                      ? t("PROFIL PERUSAHAAN")
                      : t("PANDUAN PRODUK")}
                  </span>
                  <h3>{document.title}</h3>
                  <p>{t(document.description)}</p>
                  <div className={s.actions}>
                    <Link
                      className={s.primary}
                      href={`/admin/materials/${document.slug}`}
                    >{t("Baca di web")} <span aria-hidden="true">→</span>
                    </Link>
                    <button
                      className={s.button}
                      type="button"
                      disabled={!!busy}
                      onClick={() =>
                        void download(document.slug, document.filename)
                      }
                    >
                      {busy === document.slug ? t("Memuat…") : t("Unduh PDF")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section
            className="ams-panel p-4 sm:p-6"
            aria-labelledby="videos-title"
          >
            <div className={s.sectionHeading}>
              <h2 id="videos-title">{t("Video tutorial konsultan")}</h2>
              <p>{t("Pilih topik yang dibutuhkan. Video dibuka di tab baru.")}</p>
            </div>
            <div className={s.filters}>
              {versions.length > 1 && (
                <label className={s.version}>
                  <span className="sr-only">{t("Versi video")}</span>
                  <select
                    value={version}
                    onChange={(event) => {
                      const selected = versions.find(({ id }) => id === event.target.value);
                      if (!selected) return;
                      setVersion(selected.id);
                      setQuery("");
                    }}
                  >
                    {versions.map(({ id, label }) => <option key={id} value={id}>{t(label)}</option>)}
                  </select>
                </label>
              )}
              {version !== "mobile" && (
                <div className={s.series} role="group" aria-label={t("Seri video")}>
                  <button
                    type="button"
                    aria-pressed={series === "fitur"}
                    onClick={() => {
                      setSeries("fitur");
                      setQuery("");
                    }}
                  >
                    {t("Fitur portal")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={series === "sop"}
                    onClick={() => {
                      setSeries("sop");
                      setQuery("");
                    }}
                  >
                    {t("Alur kerja")}
                  </button>
                </div>
              )}
              <label className={s.search}>
                <span className="sr-only">{t("Cari video")}</span>
                <input
                  type="search"
                  placeholder={t("Cari video…")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <ul className={s.videos}>
              {videos.map((video) => (
                <li key={video.id}>
                  <a
                    href={materialVideoUrl(video)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.video}
                  >
                    <span className={s.play} aria-hidden="true">
                      ▷
                    </span>
                    <span className={s.videoCopy}>
                      <span className={s.meta}>
                        {video.id} · {video.duration}
                      </span>
                      <strong>{video.title}</strong>
                      <span>{t(video.description)}</span>
                    </span>
                    <span className={s.openVideo} aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {!videos.length && (
              <p role="status" className="py-6 text-sm text-slate-600">{t("Tidak ada video yang cocok. Coba judul atau kode lain.")}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
