import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { one } from "@/app/lib/query";
import { intParam } from "@/app/lib/public/common";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { listAdminFinishes } from "@/app/lib/admin/read";
import { AdminList } from "@/app/components/admin/admin-list";
import { setFinishPublishedAction } from "../catalog/actions";

export default async function AdminFinishesPage({
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
  const list = await listAdminFinishes(user, {
    lang,
    q,
    status,
    page: intParam(one(sp.page, 6)),
  });

  return (
    <AdminList
      lang={lang}
      title={adminDict[lang].nav.finishes}
      newHref={`/${lang}/admin/finishes/new`}
      newLabel={adminDict[lang].fi.newFinish}
      basePath={`/${lang}/admin/finishes`}
      q={q}
      status={status}
      list={{
        ...list,
        items: list.items.map((f) => ({
          id: f.id,
          title: f.title,
          subtitle: f.slug,
          thumbUrl: f.thumbUrl,
          color: f.colorHex,
          isPublished: f.isPublished,
        })),
      }}
      rowHref={(id) => `/${lang}/admin/finishes/${id}`}
      setPublished={setFinishPublishedAction}
    />
  );
}
