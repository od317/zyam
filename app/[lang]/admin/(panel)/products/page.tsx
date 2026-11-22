import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { one } from "@/app/lib/query";
import { intParam } from "@/app/lib/public/common";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { listAdminProducts } from "@/app/lib/admin/read";
import { AdminList } from "@/app/components/admin/admin-list";
import { setProductPublishedAction } from "../catalog/actions";

export default async function AdminProductsPage({
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
  const list = await listAdminProducts(user, {
    lang,
    q,
    status,
    page: intParam(one(sp.page, 6)),
  });

  return (
    <AdminList
      lang={lang}
      title={adminDict[lang].nav.products}
      newHref={`/${lang}/admin/products/new`}
      newLabel={adminDict[lang].pr.newProduct}
      basePath={`/${lang}/admin/products`}
      q={q}
      status={status}
      list={{
        ...list,
        items: list.items.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: `${p.code} · ${p.slug}`,
          thumbUrl: p.thumbUrl,
          isPublished: p.isPublished,
        })),
      }}
      rowHref={(id) => `/${lang}/admin/products/${id}`}
      setPublished={setProductPublishedAction}
    />
  );
}
