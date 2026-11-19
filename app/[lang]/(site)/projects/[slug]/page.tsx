import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { getPublicProject } from "@/app/lib/public/projects";
import { SiteImage } from "@/app/components/site-image";
import { ProjectRoom } from "@/app/components/project-room";
import { Reveal3D } from "@/app/components/reveal-3d";

const labels = {
  ar: { back: "كل المشاريع", year: "السنة", duration: "المدة", months: "أشهر" },
  en: {
    back: "All projects",
    year: "Year",
    duration: "Duration",
    months: "months",
  },
} as const;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();
  const project = await getPublicProject(slug, lang);
  if (!project) notFound();
  const l = labels[lang];

  return (
    <ProjectRoom key={slug}>
      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Text panel: smaller than before so the room stays visible around it */}
        <Reveal3D strength={0.35} className="max-w-3xl">
          <div className="rounded-lg border border-gold/20 bg-ink/70 p-6 backdrop-blur-md sm:p-10">
            <Link
              href={`/${lang}/projects`}
              className="text-sm text-gold hover:text-gold-light"
            >
              <span aria-hidden="true" className="inline-block rtl:rotate-180">
                ←
              </span>{" "}
              {l.back}
            </Link>

            <h1
              lang={project.textLanguage}
              className="mt-4 font-display text-4xl text-gold sm:text-5xl"
            >
              {project.title}
            </h1>
            <p className="mt-2 text-muted">
              {[
                project.city,
                project.year && `${l.year}: ${project.year}`,
                project.durationMonths &&
                  `${l.duration}: ${project.durationMonths} ${l.months}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <p
              lang={project.textLanguage}
              className="mt-8 whitespace-pre-line leading-8 text-ivory/90"
            >
              {project.description}
            </p>
          </div>
        </Reveal3D>

        {/* Images float in the room, each one tilting in from depth as you scroll */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {project.images.map((img, i) => (
            <Reveal3D key={img.id} index={i}>
              <SiteImage
                image={img}
                alt={`${project.title} ${i + 1}`}
                priority={i === 0}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="aspect-[4/3] w-full rounded border border-gold/30 object-cover shadow-2xl shadow-black/60"
              />
            </Reveal3D>
          ))}
        </div>
      </main>
    </ProjectRoom>
  );
}
