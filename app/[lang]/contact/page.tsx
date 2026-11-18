// page.tsx
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { ContactForm } from "./form";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <ContactForm lang={lang} />
    </main>
  );
}
