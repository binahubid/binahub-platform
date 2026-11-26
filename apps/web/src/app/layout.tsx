import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { AuthProvider } from "../context/AuthContext";
import { AmsNotificationProvider } from "@/components/notifications/provider";
import { AmsLocaleProvider } from "@/components/ams-language";
import { amsLanguageCookie, amsLocale, amsTranslator } from "@/lib/ams-locale";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const defaultMetadata: Metadata = {
  title: "BinaApps AMS - Associate Management System",
  description: "Sistem Kelola profil profesional Associate BinaHub. Platform yang mendukung associate mulai dari pendaftaran, penugasan, dan evaluasi diri.",
  keywords: ["BinaHub", "AMS", "associate", "trainer", "coach", "facilitator", "Indonesia"],
  authors: [{ name: "BinaHub" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/ams-192.png?v=2",
  },
  appleWebApp: { capable: true, title: "BinaHub AMS" },
  openGraph: {
    title: "BinaApps AMS - Associate Management System",
    description: "Sistem Kelola profil profesional Associate BinaHub.",
    type: "website",
    locale: "id_ID",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = amsLocale((await cookies()).get(amsLanguageCookie)?.value);
  const t = amsTranslator(locale);
  return {
    ...defaultMetadata,
    description: t("Sistem Kelola profil profesional Associate BinaHub. Platform yang mendukung associate mulai dari pendaftaran, penugasan, dan evaluasi diri."),
    openGraph: {
      ...defaultMetadata.openGraph,
      description: t("Sistem Kelola profil profesional Associate BinaHub."),
      locale: locale === "en" ? "en_GB" : "id_ID",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = amsLocale((await cookies()).get(amsLanguageCookie)?.value);
  return (
    <html lang={locale} className={`${jakartaSans.variable} h-full scroll-smooth antialiased`}>
      <body className="flex min-h-full flex-col font-[family-name:var(--font-jakarta-sans)] selection:bg-[#0B2C6B] selection:text-white">
        <AmsLocaleProvider initialLocale={locale}>
          <AuthProvider><AmsNotificationProvider>{children}</AmsNotificationProvider></AuthProvider>
        </AmsLocaleProvider>
      </body>
    </html>
  );
}
