// page.tsx
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { ContactForm } from "./form";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const { type } = await searchParams;
  const defaultType = [
    "consultation",
    "project_idea",
    "quote_request",
  ].includes(type ?? "")
    ? type!
    : "consultation";
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <ContactForm lang={lang} defaultType={defaultType} />
    </main>
  );
}
