import { redirect } from "next/navigation";
import type { Role } from "@/app/generated/prisma/client";
import { getCurrentUser } from "./session";

export type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export class AuthError extends Error {}

// For server actions: throws if nobody is logged in or the role isn't allowed.
export async function requireUser(
  allowed: Role[] = ["admin", "editor"],
): Promise<Actor> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not logged in");
  if (!allowed.includes(user.role)) throw new AuthError("Not allowed");
  return user;
}

// For pages: redirects instead of throwing.
export async function requirePageUser(
  lang: string,
  allowed: Role[] = ["admin", "editor"],
) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/admin/login`);
  if (!allowed.includes(user.role)) redirect(`/${lang}/admin`);
  return user;
}
