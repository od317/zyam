"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { stage } from "@/app/lib/nav-state";

export function ProjectLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      className={className}
      onClick={async (e) => {
        // New tab, new window and so on: leave it to the browser.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
          return;
        if (stage.busy) return e.preventDefault(); // the doors are already opening
        if (!stage.enter) return; // 3D not ready, or reduce motion: normal navigation
        e.preventDefault();
        router.prefetch(href);
        const ok = await stage.enter(); // cards fade, doors open, camera enters
        if (ok) router.push(href);
      }}
    >
      {children}
    </Link>
  );
}
