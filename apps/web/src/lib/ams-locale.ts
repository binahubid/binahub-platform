import englishMessages from "./ams-messages.en.json";

export type AmsLocale = "id" | "en";
export const amsLanguageCookie = "binahub_language";

export function amsLocale(value: string | undefined): AmsLocale {
  return value === "en" ? "en" : "id";
}

const english: Readonly<Record<string, string>> = englishMessages;

export function amsTranslator(locale: AmsLocale) {
  return function translate<T>(message: T, values: readonly unknown[] = []): T extends string ? string : T {
    type Output = T extends string ? string : T;
    if (typeof message !== "string") return message as Output;
    const text = locale === "en" && Object.hasOwn(english, message) ? english[message] : message;
    return (values.length ? text.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? "")) : text) as Output;
  };
}

export function saveAmsLanguage(locale: AmsLocale) {
  const host = window.location.hostname;
  const domain = host.endsWith(".binahub.id") || host === "binahub.id" ? "; Domain=binahub.id" : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${amsLanguageCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
}
