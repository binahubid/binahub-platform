"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
  TextLayer,
} from "pdfjs-dist";
import { downloadMaterialFile, fetchMaterialFile } from "@/lib/materials";
import type { MaterialDocument } from "@ams/shared/types/materials";

import s from "@/app/admin/materials/materials.module.css";

type LoadedPdf = { pdf: PDFDocumentProxy; lib: typeof import("pdfjs-dist") };

export function AdminMaterialReader({
  material,
}: {
  material: MaterialDocument;
}) {
  const { accessToken } = useAuth();
  const path = `/api/admin/materials/${material.slug}`;
  const [source, setSource] = useState<{
    path: string;
    document?: LoadedPdf;
    error?: string;
  }>();
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => {
    if (!accessToken) return;
    const abort = new AbortController();
    let task: PDFDocumentLoadingTask | undefined;
    void (async () => {
      const [response, lib] = await Promise.all([
        fetchMaterialFile(accessToken, material.slug, abort.signal),
        import("pdfjs-dist"),
      ]);
      const data = new Uint8Array(await response.arrayBuffer());
      if (abort.signal.aborted) return;
      lib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      task = lib.getDocument({
        data,
        useWasm: false,
        enableXfa: false,
        maxImageSize: 24_000_000,
      });
      const pdf = await task.promise;
      if (!abort.signal.aborted) setSource({ path, document: { pdf, lib } });
    })().catch(() => {
      if (!abort.signal.aborted)
        setSource({ path, error: "Pratinjau dokumen belum dapat dibuka." });
    });
    return () => {
      abort.abort();
      void task?.destroy().catch(() => {});
    };
  }, [path, material.slug, accessToken, retry]);
  const state = source?.path === path ? source : undefined;
  async function download() {
    if (!accessToken) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadMaterialFile(accessToken, material.slug, material.filename);
    } catch (e) {
      setDownloadError(
        e instanceof Error ? e.message : "Dokumen belum tersedia.",
      );
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div className={s.page}>
      <Link href="/admin/materials" className={s.readerBack}>
        <span aria-hidden="true">←</span> Semua materi
      </Link>
      <header className={s.heading}>
        <h1>{material.title}</h1>
        <p>{material.description}</p>
        <div className={s.actions}>
          <button
            className={s.button}
            type="button"
            disabled={downloading}
            onClick={() => void download()}
          >
            <span aria-hidden="true">↓</span>{" "}
            {downloading ? "Memuat…" : "Unduh PDF"}
          </button>
        </div>
      </header>
      {downloadError && (
        <p role="alert" className={s.error}>
          {downloadError}
        </p>
      )}
      {state?.document ? (
        <PdfPages key={path} document={state.document} title={material.title} />
      ) : (
        <section className={s.panel}>
          {state?.error ? (
            <>
              <p role="alert" className={s.error}>
                {state.error}
              </p>
              <button
                className={s.button}
                type="button"
                onClick={() => {
                  setSource(undefined);
                  setRetry((n) => n + 1);
                }}
              >
                Coba lagi
              </button>
            </>
          ) : (
            <p role="status" className={s.muted}>
              Memuat dokumen…
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function PdfPages({
  document: { pdf, lib },
  title,
}: {
  document: LoadedPdf;
  title: string;
}) {
  const [number, setNumber] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [width, setWidth] = useState(0);
  const [rendered, setRendered] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const scroll = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const renderKey = `${number}/${zoom}/${width}`;

  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(1, el.clientWidth - 24)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    const surface = canvas.current,
      page = sheet.current,
      layer = text.current;
    if (!surface || !page || !layer) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    let textLayer: TextLayer | undefined;
    void (async () => {
      const pdfPage = await pdf.getPage(number);
      if (cancelled) return;
      const unit = pdfPage.getViewport({ scale: 1 });
      const target = Math.min(width, 870) * (zoom ? 1.65 : 1);
      const viewport = pdfPage.getViewport({
        scale: Math.min(target / unit.width, 2400 / unit.height),
      });
      const resolution = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.ceil(viewport.width * resolution);
      surface.height = Math.ceil(viewport.height * resolution);
      page.style.width = `${viewport.width}px`;
      page.style.height = `${viewport.height}px`;
      page.style.setProperty("--total-scale-factor", String(viewport.scale));
      render = pdfPage.render({
        canvas: surface,
        viewport,
        annotationMode: lib.AnnotationMode.DISABLE,
        transform: [resolution, 0, 0, resolution, 0, 0],
      });
      layer.replaceChildren();
      textLayer = new lib.TextLayer({
        textContentSource: pdfPage.streamTextContent(),
        container: layer,
        viewport,
      });
      void textLayer.render().catch(() => {});
      await render.promise;
      if (!cancelled) setRendered(renderKey);
    })().catch(() => {
      if (!cancelled) setFailed(renderKey);
    });
    return () => {
      cancelled = true;
      render?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, lib, number, zoom, width, renderKey]);

  function goTo(page: number) {
    setNumber(page);
    scroll.current?.scrollTo({ top: 0, left: 0 });
  }
  const ready = rendered === renderKey && failed !== renderKey;
  return (
    <section className={s.reader} aria-label={`Pembaca ${title}`}>
      <div className={s.readerBar}>
        <div
          className={s.actions}
          role="group"
          aria-label="Navigasi halaman dokumen"
        >
          <button
            className={s.button}
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={number <= 1}
            onClick={() => goTo(number - 1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <output className={s.readerPage}>
            Halaman {number} dari {pdf.numPages}
          </output>
          <button
            className={s.button}
            type="button"
            aria-label="Halaman berikutnya"
            disabled={number >= pdf.numPages}
            onClick={() => goTo(number + 1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <button
          className={s.button}
          type="button"
          onClick={() => setZoom((value) => !value)}
        >
          {zoom ? (
            <span aria-hidden="true">−</span>
          ) : (
            <span aria-hidden="true">+</span>
          )}
          {zoom ? "Pas layar" : "Perbesar"}
        </button>
      </div>
      <div
        className={s.readerViewport}
        ref={scroll}
        tabIndex={0}
        role="region"
        aria-label={`Isi halaman ${number}`}
      >
        {!ready && (
          <p
            className={s.readerNotice}
            role={failed === renderKey ? "alert" : "status"}
          >
            {failed === renderKey
              ? "Halaman ini belum dapat ditampilkan. Coba buka halaman lain atau unduh PDF."
              : "Menyiapkan halaman…"}
          </p>
        )}
        <div
          className={s.readerSheet}
          ref={sheet}
          style={{ visibility: ready ? "visible" : "hidden" }}
        >
          <canvas ref={canvas} aria-hidden="true" />
          <div ref={text} className={s.readerText} />
        </div>
      </div>
    </section>
  );
}
