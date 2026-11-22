import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getProductFormOptions } from "@/app/lib/admin/read";
import { ProductForm } from "../product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const user = await requirePageUser(lang);
  const p = adminDict[lang].pr;
  const options = await getProductFormOptions(user, lang);

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
      <h1 className="mb-6 mt-3 text-2xl font-bold">{p.newProduct}</h1>
      <ProductForm lang={lang} options={options} />
      <p className="mt-4 text-sm text-stone-500">
        {adminDict[lang].p.imagesAfterSave}
      </p>
    </>
  );
}
