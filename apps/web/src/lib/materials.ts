"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  MaterialCatalog,
  MaterialLink,
} from "@ams/shared/types/materials";
import { useAuth } from "@/context/AuthContext";
import { teamRequest } from "./consultant-team";

export function useMaterialCatalog() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<MaterialCatalog>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setData(undefined);
    setError("");
    if (!accessToken) return;
    const abort = new AbortController();
    void teamRequest<MaterialCatalog>(
      accessToken,
      "/api/admin/materials",
      undefined,
      abort.signal,
    )
      .then((catalog) => {
        if (!abort.signal.aborted) setData(catalog);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setError("Daftar materi belum dapat dimuat. Coba lagi.");
      });
    return () => abort.abort();
  }, [accessToken, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, error, reload };
}

export async function fetchMaterialFile(
  token: string,
  slug: string,
  signal?: AbortSignal,
) {
  const link = await teamRequest<MaterialLink>(
    token,
    "/api/admin/materials/" + encodeURIComponent(slug),
    undefined,
    signal,
  );
  const url = new URL(link.url);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".supabase.co") ||
    !url.pathname.startsWith("/storage/v1/object/sign/consultant-materials/")
  ) {
    throw new Error("Alamat dokumen belum dapat dipastikan.");
  }
  const response = await fetch(url, {
    signal,
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (
    !response.ok ||
    !response.headers.get("Content-Type")?.includes("application/pdf")
  )
    throw new Error("Dokumen belum dapat dibuka.");
  return response;
}

export async function downloadMaterialFile(
  token: string,
  slug: string,
  filename: string,
) {
  const response = await fetchMaterialFile(token, slug);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function materialVideoUrl(video: MaterialCatalog["videos"][number]) {
  const url = new URL(
    `https://drive.google.com/file/d/${encodeURIComponent(video.drive.fileId)}/view`,
  );
  if (video.drive.resourceKey)
    url.searchParams.set("resourcekey", video.drive.resourceKey);
  return url.href;
}
