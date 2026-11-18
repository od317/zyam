import { notFound, redirect } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { getCurrentUser } from "@/app/lib/auth/session";
import { logoutAction } from "./login/actions";

export default async function AdminHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/admin/login`);

  return (
    <main className="mx-auto mt-24 max-w-md px-4">
      <h1 className="text-2xl font-bold">Hello, {user.name}</h1>
      <p className="mt-2 text-stone-400">Role: {user.role}</p>
      <form action={logoutAction} className="mt-6">
        <input type="hidden" name="lang" value={lang} />
        <button className="rounded border border-stone-600 px-3 py-2">
          Log out
        </button>
      </form>
    </main>
  );
}
