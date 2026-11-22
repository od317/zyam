import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { adminCounts } from "@/app/lib/admin/read";
import { logoutAction } from "../login/actions";

export const metadata = { robots: { index: false, follow: false } };

export default function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950" />}>
      <Shell params={params}>{children}</Shell>
    </Suspense>
  );
}

async function Shell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const user = await requirePageUser(lang);
  const t = adminDict[lang];
  const { newInquiries } = await adminCounts(user);

  // Add a line here each time a screen is built.
  const nav = [
    { href: `/${lang}/admin`, label: t.nav.home, badge: 0, exact: true },
    { href: `/${lang}/admin/projects`, label: t.nav.projects, badge: 0 },
    { href: `/${lang}/admin/products`, label: t.nav.products, badge: 0 },
    { href: `/${lang}/admin/finishes`, label: t.nav.finishes, badge: 0 },
    {
      href: `/${lang}/admin/inquiries`,
      label: t.nav.inquiries,
      badge: newInquiries,
    },
    { href: `/${lang}/admin/taxonomy`, label: t.nav.taxonomy, badge: 0 },
    ...(user.role === "admin"
      ? [{ href: `/${lang}/admin/settings`, label: t.nav.settings, badge: 0 }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-amber-500">{t.title}</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-stone-300 hover:text-amber-500"
              >
                {n.label}
                {n.badge > 0 && (
                  <span className="ms-1 rounded-full bg-amber-600 px-1.5 text-xs font-semibold text-stone-950">
                    {n.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-4 text-sm">
            <span className="text-stone-400">
              {user.name} · {t.role[user.role]}
            </span>
            <Link
              href={`/${lang === "ar" ? "en" : "ar"}/admin`}
              className="text-stone-300 hover:text-amber-500"
            >
              {lang === "ar" ? "English" : "العربية"}
            </Link>
            <form action={logoutAction}>
              <input type="hidden" name="lang" value={lang} />
              <button className="text-stone-300 hover:text-amber-500">
                {t.logout}
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
