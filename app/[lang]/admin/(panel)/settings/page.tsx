import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { getSettings } from "@/app/lib/admin/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  await requirePageUser(lang, ["admin"]);
  const settings = await getSettings();

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        {adminDict[lang].nav.settings}
      </h1>
      <SettingsForm lang={lang} initial={settings} />
    </>
  );
}
