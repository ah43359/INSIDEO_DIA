import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChapterIndex from "@/components/dia/ChapterIndex";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DiaIndexPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("nombre_proyecto")
    .eq("id", id)
    .single();

  if (error || !project) notFound();
  const projectName = (project as { nombre_proyecto: string }).nombre_proyecto;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3">
          <div>
            <Link href={`/projects/${id}`} className="text-xs text-stone-500 hover:text-stone-700">
              ← Volver al proyecto
            </Link>
            <h1 className="mt-1 text-lg font-semibold text-stone-800">DIA / MDIA</h1>
            <p className="text-sm text-stone-500">{projectName}</p>
          </div>
        </div>
      </header>
      <ChapterIndex projectId={id} projectName={projectName} />
    </div>
  );
}
