"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMaterialCatalog } from "@/lib/materials";
import { AdminMaterialReader } from "@/components/admin-material-reader";
import s from "../materials.module.css";

export default function AdminMaterialDocumentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, reload } = useMaterialCatalog();
  const material = data?.documents.find((document) => document.slug === slug);
  if (material) return <AdminMaterialReader material={material} />;
  return (
    <section className="ams-panel p-6">
      {error ? (
        <>
          <p role="alert">{error}</p>
          <button type="button" className={s.button} onClick={reload}>
            Coba lagi
          </button>
        </>
      ) : data ? (
        <>
          <h1 className="text-xl font-semibold">Materi tidak ditemukan</h1>
          <Link href="/admin/materials" className={s.button}>
            Kembali ke Materi
          </Link>
        </>
      ) : (
        <p role="status">Memuat dokumen…</p>
      )}
    </section>
  );
}
