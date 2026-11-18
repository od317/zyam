import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic, Amiri } from "next/font/google";
import { isLanguage, languages } from "@/app/lib/i18n";
import "../globals.css";

const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-body",
});
const heading = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = { title: "Zyam Design" };

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();

  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={`${body.variable} ${heading.variable}`}
    >
      <body className="min-h-screen bg-ink font-sans text-ivory antialiased">
        {children}
      </body>
    </html>
  );
}
