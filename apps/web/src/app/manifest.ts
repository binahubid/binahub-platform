import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { amsLanguageCookie, amsLocale, amsTranslator } from "@/lib/ams-locale";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = amsLocale((await cookies()).get(amsLanguageCookie)?.value);
  const t = amsTranslator(locale);
  return {
    id: "/",
    name: "BinaHub AMS",
    short_name: "BinaHub AMS",
    lang: locale,
    description: t("Undangan, penugasan, dan ruang kerja associate BinaHub."),
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/ams-192.png?v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/ams-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/ams-maskable.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: t("Notifikasi AMS"), url: "/dashboard/notifications" },
      { name: t("Penugasan saya"), url: "/dashboard/assignments" },
    ],
  };
}
