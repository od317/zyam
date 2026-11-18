"use server";

import { redirect } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { getMeta } from "@/app/lib/auth/request-meta";
import { startLogin, finishLogin } from "@/app/lib/auth/login";
import { destroySession, getCurrentUser } from "@/app/lib/auth/session";
import { audit } from "@/app/lib/auth/audit";

export type FormState = { error?: string };

function langOf(formData: FormData) {
  const lang = String(formData.get("lang") ?? "");
  return isLanguage(lang) ? lang : "ar";
}

export async function passwordAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = langOf(formData);
  const res = await startLogin(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
    await getMeta(),
  );
  if (!res.ok) return { error: res.error };
  redirect(`/${lang}/admin/verify`);
}

export async function otpAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = langOf(formData);
  const res = await finishLogin(
    String(formData.get("code") ?? ""),
    await getMeta(),
  );
  if (!res.ok) return { error: res.error };
  redirect(`/${lang}/admin`);
}

export async function logoutAction(formData: FormData) {
  const lang = langOf(formData);
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "logout", "User", user.id);
  redirect(`/${lang}/admin/login`);
}
