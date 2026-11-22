"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { setPublishedAction } from "./actions";

export function RowActions({
  id,
  published,
  lang,
}: {
  id: number;
  published: boolean;
  lang: Language;
}) {
  const t = adminDict[lang].p;
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setPublishedAction(id, !published);
          router.refresh();
        })
      }
      className="rounded border border-stone-700 px-3 py-1 text-sm hover:border-amber-600 disabled:opacity-50"
    >
      {published ? t.unpublish : t.publish}
    </button>
  );
}
