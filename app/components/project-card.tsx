import type { toProjectCard } from "@/app/lib/public/projects";
import { SiteImage } from "./site-image";
import { ProjectLink } from "./project-link";

type Card = ReturnType<typeof toProjectCard>;

export function ProjectCard({ p, lang }: { p: Card; lang: "ar" | "en" }) {
  return (
    <ProjectLink
      href={`/${lang}/projects/${p.slug}`}
      className="group block overflow-hidden rounded border border-line bg-ink-2/75 backdrop-blur-sm"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <SiteImage
          image={p.image}
          alt={p.title}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="font-display text-xl text-gold" lang={p.textLanguage}>
          {p.title}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {[p.city, p.year].filter(Boolean).join(" · ")}
        </p>
      </div>
    </ProjectLink>
  );
}
