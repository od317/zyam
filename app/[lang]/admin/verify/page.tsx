import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { OtpForm } from "../login/forms";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-bold">Verification code</h1>
      <OtpForm lang={lang} />
    </main>
  );
}
