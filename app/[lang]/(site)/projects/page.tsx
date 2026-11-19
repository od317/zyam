// app/[lang]/(site)/projects/page.tsx
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { listPublicProjects } from "@/app/lib/public/projects";
import { ProjectCard } from "@/app/components/project-card";
import { ProjectsFade } from "@/app/components/projects-fade";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const { items } = await listPublicProjects({ lang });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <ProjectsFade>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProjectCard key={p.slug} p={p} lang={lang} />
          ))}
        </div>
      </ProjectsFade>
    </main>
  );
}
