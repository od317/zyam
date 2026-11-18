import { Prisma } from "../../generated/prisma/client";
import type { Actor } from "../auth/require-user";

export type ActionResult =
  | { ok: true; id: number }
  | { ok: false; errors: Record<string, string> };

export const fail = (errors: Record<string, string>): ActionResult => ({
  ok: false,
  errors,
});

export function assertStaff(actor: Actor) {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");
}

export function assertAdmin(actor: Actor) {
  if (actor.role !== "admin") throw new Error("Only admins can delete");
}

export function mapDbError(e: unknown): ActionResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = JSON.stringify(e.meta ?? {}).toLowerCase();
      return fail(
        target.includes("code")
          ? { code: "This code is already used" }
          : { slug: "This slug is already used" },
      );
    }
    if (e.code === "P2003")
      return fail({ _form: "A linked item does not exist" });
  }
  throw e;
}
