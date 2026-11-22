import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getTaxonomy } from "@/app/lib/admin/read";
import { TaxonomyEditor } from "./taxonomy-editor";

export default async function TaxonomyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const user = await requirePageUser(lang);
  const data = await getTaxonomy(user, lang);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        {adminDict[lang].nav.taxonomy}
      </h1>
      <TaxonomyEditor lang={lang} data={data} isAdmin={user.role === "admin"} />
    </>
  );
}
