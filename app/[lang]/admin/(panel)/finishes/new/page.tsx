import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { FinishForm } from "../finish-form";

export default async function NewFinishPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  await requirePageUser(lang);
  const fi = adminDict[lang].fi;

  return (
    <>
      <Link
        href={`/${lang}/admin/finishes`}
        className="text-sm text-stone-400 hover:text-amber-500"
      >
        <span aria-hidden="true" className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {fi.back}
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">{fi.newFinish}</h1>
      <FinishForm lang={lang} />
      <p className="mt-4 text-sm text-stone-500">
        {adminDict[lang].p.imagesAfterSave}
      </p>
    </>
  );
}
