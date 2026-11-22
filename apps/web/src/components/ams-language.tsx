"use client";

import { createContext, type ReactNode, useContext, useEffect, useId, useMemo, useState } from "react";
import { amsLanguageCookie, amsLocale, amsTranslator, type AmsLocale, saveAmsLanguage } from "@/lib/ams-locale";

type LanguageState = {
  locale: AmsLocale;
  setLocale: (locale: AmsLocale) => void;
  t: ReturnType<typeof amsTranslator>;
};

const localeContext = createContext<LanguageState | null>(null);

export function AmsLocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: AmsLocale }) {
  const [locale, updateLocale] = useState(initialLocale);
  useEffect(() => {
    const syncLanguage = () => {
      const cookie = document.cookie.split("; ").find((value) => value.startsWith(amsLanguageCookie + "="));
      const next = amsLocale(cookie?.split("=")[1]);
      document.documentElement.lang = next;
      updateLocale(next);
    };
    window.addEventListener("pageshow", syncLanguage);
    window.addEventListener("focus", syncLanguage);
    return () => {
      window.removeEventListener("pageshow", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
    };
  }, []);
  const value = useMemo(() => ({
    locale,
    t: amsTranslator(locale),
    setLocale: (next: AmsLocale) => {
      saveAmsLanguage(next);
      document.documentElement.lang = next;
      updateLocale(next);
    },
  }), [locale]);
  return <localeContext.Provider value={value}>{children}</localeContext.Provider>;
}

export function useAmsLocale() {
  const value = useContext(localeContext);
  if (!value) throw new Error("AMS language provider is required");
  return value;
}

export function AmsLanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useAmsLocale();
  const labelId = useId();
  return (
    <label className={compact ? "inline-flex shrink-0" : "flex flex-wrap items-center gap-3 text-sm font-medium"}>
      <span id={labelId} className={compact ? "sr-only" : ""}>{locale === "en" ? "Display language" : "Bahasa tampilan"}</span>
      <select
        aria-labelledby={labelId}
        className="min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-[#0B2C6B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        value={locale}
        onChange={(event) => setLocale(amsLocale(event.target.value))}
      >
        <option value="id" lang="id" label={compact ? "ID" : undefined}>Bahasa Indonesia</option>
        <option value="en" lang="en" label={compact ? "EN" : undefined}>English</option>
      </select>
    </label>
  );
}
