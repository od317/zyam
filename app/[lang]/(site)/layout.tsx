import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { getPublicSettings } from "@/app/lib/public/site";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";

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
        {children}
      </div>
      <Footer lang={lang} settings={settings} />
    </>
  );
}
