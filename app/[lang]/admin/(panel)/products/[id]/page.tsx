import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getAdminProduct, getProductFormOptions } from "@/app/lib/admin/read";
import { ImageManager } from "@/app/components/admin/image-manager";
import {
  deleteProductImageAction,
  reorderProductImagesAction,
} from "../../catalog/actions";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id: rawId } = await params;
  if (!isLanguage(lang)) notFound();
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const user = await requirePageUser(lang);
  const p = adminDict[lang].pr;

  const [product, options] = await Promise.all([
    getAdminProduct(user, id),
    getProductFormOptions(user, lang),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link
        href={`/${lang}/admin/products`}
        className="text-sm text-stone-400 hover:text-amber-500"
      >
        <span aria-hidden="true" className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {p.back}
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">{p.editProduct}</h1>

      <ProductForm
        lang={lang}
        options={options}
        initial={product}
        canDelete={user.role === "admin"}
      />

      <section className="mt-12 border-t border-stone-800 pt-6">
        <h2 className="mb-4 text-lg font-semibold text-amber-500">
          {adminDict[lang].p.images}
        </h2>
        <ImageManager
          lang={lang}
          uploadUrl={`/api/admin/images/products/${product.id}`}
          images={product.images}
          onDelete={deleteProductImageAction}
          onReorder={reorderProductImagesAction.bind(null, product.id)}
        />
      </section>
    </>
  );
}
