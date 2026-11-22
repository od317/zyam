import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getProjectFormOptions } from "@/app/lib/admin/read";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const user = await requirePageUser(lang);
  const t = adminDict[lang].p;
  const options = await getProjectFormOptions(user, lang);

  return (
    <>
      <Link
        href={`/${lang}/admin/projects`}
        className="text-sm text-stone-400 hover:text-amber-500"
      >
        <span aria-hidden="true" className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {t.back}
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">{t.newProject}</h1>
      <ProjectForm lang={lang} options={options} />
      <p className="mt-4 text-sm text-stone-500">{t.imagesAfterSave}</p>
    </>
  );
}
