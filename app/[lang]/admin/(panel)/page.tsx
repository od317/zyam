import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { adminCounts } from "@/app/lib/admin/read";

export default async function AdminHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const user = await requirePageUser(lang);
  const t = adminDict[lang];
  const c = await adminCounts(user);

  const cards = [
    {
      label: t.stats.newInquiries,
      value: c.newInquiries,
      href: `/${lang}/admin/inquiries`,
    },
    {
      label: t.stats.published,
      value: c.published,
      href: `/${lang}/admin/projects?status=published`,
    },
    {
      label: t.stats.drafts,
      value: c.drafts,
      href: `/${lang}/admin/projects?status=draft`,
    },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold">
        {t.hello}, {user.name}
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((x) => (
          <Link
            key={x.label}
            href={x.href}
            className="rounded border border-stone-800 bg-stone-900/60 p-5 hover:border-amber-600"
          >
            <p className="text-3xl font-bold text-amber-500">{x.value}</p>
            <p className="mt-1 text-sm text-stone-400">{x.label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
