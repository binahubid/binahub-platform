"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  downloadMaterialFile,
  materialVideoUrl,
  useMaterialCatalog,
} from "@/lib/materials";
import s from "./materials.module.css";

export default function AdminMaterialsPage() {
  const { accessToken } = useAuth();
  const { data, error, reload } = useMaterialCatalog();
  const [series, setSeries] = useState("fitur"),
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
  const videos =
    data?.videos.filter(
      (video) =>
        video.series === series &&
        `${video.id} ${video.title}`
          .toLocaleLowerCase("id")
          .includes(query.trim().toLocaleLowerCase("id")),
    ) || [];
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>Materi</h1>
        <p>
          Profil perusahaan, panduan produk, dan tutorial untuk mendukung
          pekerjaan tim.
        </p>
      </header>
      {error && (
        <div className="ams-panel p-5">
          <p role="alert">{error}</p>
          <button className={s.button} type="button" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}
      {!data && !error && <p role="status">Memuat materi…</p>}
      {data && (
        <>
          <section aria-labelledby="documents-title">
            <div className={s.sectionHeading}>
              <h2 id="documents-title">Dokumen</h2>
              <p>
                Baca langsung di web atau unduh PDF untuk persiapan konsultasi.
              </p>
            </div>
            {downloadError && (
              <p role="alert" className={s.error}>
                {downloadError}
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
                      ? "PROFIL PERUSAHAAN"
                      : "PANDUAN PRODUK"}
                  </span>
                  <h3>{document.title}</h3>
                  <p>{document.description}</p>
                  <div className={s.actions}>
                    <Link
                      className={s.primary}
                      href={`/admin/materials/${document.slug}`}
                    >
                      Baca di web <span aria-hidden="true">→</span>
                    </Link>
                    <button
                      className={s.button}
                      type="button"
                      disabled={!!busy}
                      onClick={() =>
                        void download(document.slug, document.filename)
                      }
                    >
                      {busy === document.slug ? "Memuat…" : "Unduh PDF"}
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
              <h2 id="videos-title">Video tutorial konsultan</h2>
              <p>Pilih topik yang dibutuhkan. Video dibuka di tab baru.</p>
            </div>
            <div className={s.filters}>
              <div className={s.series} role="group" aria-label="Seri video">
                <button
                  type="button"
                  aria-pressed={series === "fitur"}
                  onClick={() => {
                    setSeries("fitur");
                    setQuery("");
                  }}
                >
                  Fitur portal
                </button>
                <button
                  type="button"
                  aria-pressed={series === "sop"}
                  onClick={() => {
                    setSeries("sop");
                    setQuery("");
                  }}
                >
                  Alur kerja
                </button>
              </div>
              <label className={s.search}>
                <span className="sr-only">Cari video</span>
                <input
                  type="search"
                  placeholder="Cari video…"
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
                      <span>{video.description}</span>
                    </span>
                    <span className={s.openVideo} aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {!videos.length && (
              <p role="status" className="py-6 text-sm text-slate-600">
                Tidak ada video yang cocok. Coba judul atau kode lain.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
