import Link from "next/link";

export function Pagination({
  page,
  pages,
  hrefFor,
  prev,
  next,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  prev: string;
  next: string;
}) {
  if (pages <= 1) return null;
  const link = "text-gold hover:text-gold-light";
  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-center gap-6 text-sm"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={link}>
          <span aria-hidden="true" className="inline-block rtl:rotate-180">
            ←
          </span>{" "}
          {prev}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={link}>
          {next}{" "}
          <span aria-hidden="true" className="inline-block rtl:rotate-180">
            →
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
