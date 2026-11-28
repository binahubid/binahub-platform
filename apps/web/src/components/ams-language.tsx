"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
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
  const english = locale === "en";
  return (
    <div className={compact ? "inline-flex shrink-0" : "flex flex-wrap items-center gap-3 text-sm font-medium"}>
      {!compact && <span>{english ? "Display language" : "Bahasa tampilan"}</span>}
      <button
        type="button"
        role="switch"
        aria-label="English"
        aria-checked={english}
        onClick={() => setLocale(english ? "id" : "en")}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <span aria-hidden="true" className="relative grid h-8 w-16 grid-cols-2 items-center rounded-full bg-slate-100 text-[11px] font-semibold ring-1 ring-inset ring-slate-300">
          <span className={`absolute left-0.5 top-0.5 h-7 w-7 rounded-full bg-[#0B2C6B] transition-transform motion-reduce:transition-none ${english ? "translate-x-8" : ""}`} />
          <span className={`relative text-center ${english ? "text-slate-600" : "text-white"}`}>ID</span>
          <span className={`relative text-center ${english ? "text-white" : "text-slate-600"}`}>EN</span>
        </span>
      </button>
    </div>
  );
}
