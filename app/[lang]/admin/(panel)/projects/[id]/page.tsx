import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getAdminProject, getProjectFormOptions } from "@/app/lib/admin/read";
import { ProjectForm } from "../project-form";

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
        <h2 className="text-lg font-semibold text-amber-500">{t.images}</h2>
        <p className="mt-1 text-sm text-stone-500">{t.imagesNote}</p>
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {project.images.map((img) => (
            <li
              key={img.id}
              className="rounded border border-stone-800 p-1 text-center text-xs text-stone-400"
            >
              {img.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.thumbUrl}
                  alt=""
                  className="aspect-[4/3] w-full rounded object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full rounded bg-stone-800" />
              )}
              <span className="mt-1 block">{img.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
