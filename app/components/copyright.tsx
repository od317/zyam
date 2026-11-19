import { cacheLife } from "next/cache";

// The year is read once and cached, so the page can be prerendered.
export async function Copyright({ rights }: { rights: string }) {
  "use cache";
  cacheLife("days");

  return (
    <p className="border-t border-line py-4 text-center text-xs text-muted">
      © {new Date().getFullYear()} Zyam Design · {rights}
    </p>
  );
}
