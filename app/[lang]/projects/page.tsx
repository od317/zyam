import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { listProjects } from "@/app/lib/projects";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();

  const projects = await listProjects(lang);

  return (
    <main dir={lang === "ar" ? "rtl" : "ltr"}>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>{p.translations[0]?.title ?? p.slug}</li>
        ))}
      </ul>
    </main>
  );
}
