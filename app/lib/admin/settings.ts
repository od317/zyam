import { prisma } from "../prisma";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import {
  settingsInput,
  isPlainKey,
  isTranslatedKey,
} from "../validation/taxonomy";
import { PLAIN_SETTINGS, TRANSLATED_SETTINGS } from "../settings-keys";
import { assertAdmin } from "./common";

export async function getSettings() {
  const [plainRows, translatedRows] = await Promise.all([
    prisma.siteSetting.findMany(),
    prisma.siteSettingTranslation.findMany(),
  ]);
  const plain: Record<string, string> = Object.fromEntries(
    PLAIN_SETTINGS.map((k) => [k, ""]),
  );
  for (const r of plainRows) if (r.key in plain) plain[r.key] = r.value;

  const translated: Record<string, { ar: string; en: string }> =
    Object.fromEntries(TRANSLATED_SETTINGS.map((k) => [k, { ar: "", en: "" }]));
  for (const r of translatedRows)
    if (r.key in translated) translated[r.key][r.language] = r.value;

  return { plain, translated };
}

export async function updateSettings(actor: Actor, input: unknown) {
  assertAdmin(actor);
  const p = settingsInput.safeParse(input);
  if (!p.success)
    return { ok: false as const, errors: { _form: "Invalid input" } };
  const { plain, translated } = p.data;

  // Unknown keys are rejected, not ignored: a typo should be loud.
  const bad = [
    ...Object.keys(plain).filter((k) => !isPlainKey(k)),
    ...Object.keys(translated).filter((k) => !isTranslatedKey(k)),
  ];
  if (bad.length)
    return {
      ok: false as const,
      errors: { _form: `Unknown setting: ${bad.join(", ")}` },
    };

  const email = plain.contact_email;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false as const, errors: { contact_email: "Invalid email" } };

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(plain)) {
      await tx.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
    for (const [key, v] of Object.entries(translated)) {
      for (const language of ["ar", "en"] as const) {
        await tx.siteSettingTranslation.upsert({
          where: { key_language: { key, language } },
          create: { key, language, value: v[language] },
          update: { value: v[language] },
        });
      }
    }
    await audit(
      actor.id,
      "settings.update",
      "SiteSetting",
      undefined,
      { keys: Object.keys({ ...plain, ...translated }) },
      tx,
    );
  });
  return { ok: true as const };
}
