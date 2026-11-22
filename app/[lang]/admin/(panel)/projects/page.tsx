import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { one } from "@/app/lib/query";
import { intParam } from "@/app/lib/public/common";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { listAdminProjects } from "@/app/lib/admin/read";
import { AdminList } from "@/app/components/admin/admin-list";
import { setPublishedAction } from "./actions";

export default async function AdminProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const sp = await searchParams;
  const user = await requirePageUser(lang);

  const q = one(sp.q, 100);
  const s = one(sp.status);
  const status = s === "published" || s === "draft" ? s : undefined;
  const list = await listAdminProjects(user, {
    lang,
    q,
    status,
    page: intParam(one(sp.page, 6)),
  });

  return (
    <AdminList
      lang={lang}
      title={adminDict[lang].nav.projects}
      newHref={`/${lang}/admin/projects/new`}
      newLabel={adminDict[lang].p.newProject}
      basePath={`/${lang}/admin/projects`}
      q={q}
      status={status}
      list={{
        ...list,
        items: list.items.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: `${p.slug}${p.year ? ` · ${p.year}` : ""}`,
          thumbUrl: p.thumbUrl,
          isPublished: p.isPublished,
        })),
      }}
      rowHref={(id) => `/${lang}/admin/projects/${id}`}
      setPublished={setPublishedAction}
    />
  );
}
