import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getAdminProject, getProjectFormOptions } from "@/app/lib/admin/read";
import { ProjectForm } from "../project-form";
import { ImageManager } from "../image-manager";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id: rawId } = await params;
  if (!isLanguage(lang)) notFound();
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const user = await requirePageUser(lang);
  const t = adminDict[lang].p;

  const [project, options] = await Promise.all([
    getAdminProject(user, id),
    getProjectFormOptions(user, lang),
  ]);
  if (!project) notFound();

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
      <h1 className="mb-6 mt-3 text-2xl font-bold">{t.editProject}</h1>

      <ProjectForm
        lang={lang}
        options={options}
        initial={project}
        canDelete={user.role === "admin"}
      />

      <section className="mt-12 border-t border-stone-800 pt-6">
        <h2 className="mb-4 text-lg font-semibold text-amber-500">
          {t.images}
        </h2>
        <ImageManager
          lang={lang}
          projectId={project.id}
          images={project.images}
        />
      </section>
    </>
  );
}
