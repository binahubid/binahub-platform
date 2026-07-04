import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B2C6B",
};

export const metadata: Metadata = {
  title: "BinaApps AMS - Associate Management System",
  description: "Satu profil profesional untuk seluruh perjalanan associate Anda. AI CV parsing, assignment matching, dan capability tracking dalam satu platform.",
  keywords: ["BinaHub", "AMS", "associate", "trainer", "coach", "facilitator", "Indonesia"],
  authors: [{ name: "BinaHub" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "BinaApps AMS - Associate Management System",
    description: "Satu profil profesional untuk seluruh perjalanan associate Anda.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakartaSans.variable} ${inter.variable} h-full scroll-smooth antialiased`}>
      <body className="flex min-h-full flex-col font-[family-name:var(--font-jakarta-sans)] selection:bg-[#0B2C6B] selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
