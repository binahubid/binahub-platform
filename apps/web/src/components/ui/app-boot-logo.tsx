"use client";

import Image from "next/image";
import { useAmsLocale } from "@/components/ams-language";

export function AppBootLogo() {
  const { t } = useAmsLocale();
  return (
    <div role="status" className="grid min-h-[100svh] place-content-center justify-items-center">
      <Image
        src="/intro2.png"
        alt=""
        width={1280}
        height={640}
        priority
        className="h-auto w-[min(76vw,300px)]"
      />
      <p className="text-sm text-slate-600">{t("Membuka BinaHub AMS…")}</p>
      <span className="ams-portal-transfer-track ams-boot-progress" aria-hidden="true" />
    </div>
  );
}
