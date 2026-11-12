import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BinaHub AMS",
    short_name: "BinaHub AMS",
    lang: "id",
    description: "Undangan, penugasan, dan ruang kerja associate BinaHub.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0B2C6B",
    icons: [
      {
        src: "/icons/ams-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/ams-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/ams-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Notifikasi AMS", url: "/dashboard/notifications" },
      { name: "Penugasan saya", url: "/dashboard/assignments" },
    ],
  };
}
