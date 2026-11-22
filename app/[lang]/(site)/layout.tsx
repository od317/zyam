import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { getPublicSettings } from "@/app/lib/public/site";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { NavMark } from "@/app/components/nav-mark";
import { HallStage } from "@/app/components/hall-stage";
import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/app/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLanguage(lang)) return {};
  return {
    metadataBase: new URL(SITE_URL), // turns "/ar/projects" into full URLs everywhere
    title: { default: SITE_NAME[lang], template: `%s | ${SITE_NAME[lang]}` },
    description: SITE_DESCRIPTION[lang],
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const settings = await getPublicSettings(lang);

  return (
    <>
      <Header lang={lang} />
      <HallStage />
      <div id="main" className="min-h-[70vh]">
        {children}
      </div>
      <NavMark />
      <Footer lang={lang} settings={settings} />
    </>
  );
}
