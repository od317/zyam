import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { getPublicSettings } from "@/app/lib/public/site";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { DoorTransition } from "@/app/components/door-transition";
import { NavMark } from "@/app/components/nav-mark";

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
      <div id="main" className="min-h-[70vh]">
        <div id="main" className="min-h-[70vh]">
          {children}
        </div>
        <NavMark />
      </div>
      <Footer lang={lang} settings={settings} />
    </>
  );
}
