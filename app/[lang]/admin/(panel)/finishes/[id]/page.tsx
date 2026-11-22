import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getAdminFinish } from "@/app/lib/admin/read";
import { ImageManager } from "@/app/components/admin/image-manager";
import {
  deleteFinishImageAction,
  reorderFinishImagesAction,
} from "../../catalog/actions";
import { FinishForm } from "../finish-form";

export default async function EditFinishPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id: rawId } = await params;
  if (!isLanguage(lang)) notFound();
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const user = await requirePageUser(lang);
  const fi = adminDict[lang].fi;

  const finish = await getAdminFinish(user, id);
  if (!finish) notFound();

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
      <h1 className="mb-6 mt-3 text-2xl font-bold">{fi.editFinish}</h1>

      <FinishForm
        lang={lang}
        initial={finish}
        canDelete={user.role === "admin"}
      />

      <section className="mt-12 border-t border-stone-800 pt-6">
        <h2 className="mb-4 text-lg font-semibold text-amber-500">
          {adminDict[lang].p.images}
        </h2>
        <ImageManager
          lang={lang}
          uploadUrl={`/api/admin/images/finishes/${finish.id}`}
          images={finish.images}
          onDelete={deleteFinishImageAction}
          onReorder={reorderFinishImagesAction.bind(null, finish.id)}
        />
      </section>
    </>
  );
}
