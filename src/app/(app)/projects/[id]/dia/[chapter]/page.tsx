import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Cap1Editor from "@/components/cap1/Cap1Editor";
import Cap2Editor from "@/components/cap2/Cap2Editor";
import Cap3Editor from "@/components/cap3/Cap3Editor";
import Cap4Editor from "@/components/cap4/Cap4Editor";
import Cap5Editor from "@/components/cap5/Cap5Editor";
import Cap6Editor from "@/components/cap6/Cap6Editor";
import Cap7Editor from "@/components/cap7/Cap7Editor";
import DiaChapterHeader from "@/components/dia/DiaChapterHeader";
import { deriveCap1Prefill } from "@/lib/dia/cap1/derive";
import { deriveCap2Prefill } from "@/lib/dia/cap2/derive";
import { deriveCap3Prefill } from "@/lib/dia/cap3/derive";
import { deriveCap4Prefill } from "@/lib/dia/cap4/derive";
import { deriveCap5Prefill } from "@/lib/dia/cap5/derive";
import { deriveCap6Prefill } from "@/lib/dia/cap6/derive";
import { deriveCap7Prefill } from "@/lib/dia/cap7/derive";
import { findChapter, isValidChapterId } from "@/lib/dia/chapters";
import { componentGeomFromProjectFeaturesRpc } from "@/lib/supabase/project-features";
import { PROJECT_SELECT_WITH_CLIENTE_FOR_DIA } from "@/lib/supabase/project-selects";
import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string; chapter: string }>;
}

interface ProjectRow extends Project {
  clientes: Cliente | null;
}

interface DeriveInput {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
}

export default async function DiaChapterPage({ params }: PageProps) {
  const { id, chapter } = await params;
  const chapterNum = Number.parseInt(chapter, 10);
  if (!Number.isFinite(chapterNum) || !isValidChapterId(chapterNum)) notFound();
  const entry = findChapter(chapterNum);
  if (!entry) notFound();

  const supabase = await createClient();

  const [
    { data: project, error: projectError },
    { data: inventario },
    { data: featuresJson },
    { data: areaRows },
  ] = await Promise.all([
    supabase.from("projects").select(PROJECT_SELECT_WITH_CLIENTE_FOR_DIA).eq("id", id).single(),
    supabase.from("componente_inventario").select("*").eq("project_id", id),
    supabase.rpc("project_features", { p_id: id }),
    supabase.rpc("get_area_estudio_for_project", { p_project_id: id }),
  ]);

  if (projectError || !project) notFound();

  const p = project as ProjectRow;
  const componentes = (inventario as ComponenteInventario[] | null) ?? [];
  const componentsGeom = componentGeomFromProjectFeaturesRpc(id, featuresJson);
  const areaRowsAll = (areaRows ?? []) as AreaEstudioRow[];
  const areaEstudio = areaRowsAll[0] ?? null;

  const deriveInput: DeriveInput = {
    project: p,
    cliente: p.clientes,
    componentes,
    componentsGeom,
    areaEstudio,
  };

  if (entry.status === "planned") {
    return (
      <div className="min-h-screen bg-stone-50">
        <DiaChapterHeader projectId={id} projectName={p.nombre_proyecto} title={entry.longTitle} />
        <div className="mx-auto max-w-[800px] px-6 py-12 text-center">
          <p className="text-sm text-stone-500">Este capítulo aún no está implementado.</p>
          <p className="mt-2 text-xs text-stone-400">
            Vuelve al índice para editar los capítulos disponibles.
          </p>
          <Link
            href={`/projects/${id}/dia`}
            className="mt-4 inline-block rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100"
          >
            ← Índice DIA
          </Link>
        </div>
      </div>
    );
  }

  // Each chapter has its own bespoke editor that wraps the shared
  // ChapterEditor and may add chapter-specific UI via slot props. Cap 2
  // is fully bespoke (UTM zone selector + basin auto-detect); the others
  // are thin wrappers today but own the file structure for future tweaks.
  return (
    <div className="min-h-screen bg-stone-50">
      <DiaChapterHeader projectId={id} projectName={p.nombre_proyecto} title={entry.longTitle} />
      {renderChapterEditor(entry.id, {
        projectId: id,
        projectName: p.nombre_proyecto,
        chapterTitle: entry.shortTitle,
        deriveInput,
      })}
    </div>
  );
}

interface EditorRenderArgs {
  projectId: string;
  projectName: string;
  chapterTitle: string;
  deriveInput: DeriveInput;
}

function renderChapterEditor(
  chapterId: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  args: EditorRenderArgs,
): React.ReactNode {
  const { projectId, projectName, chapterTitle, deriveInput } = args;
  switch (chapterId) {
    case 1: {
      const { state, warnings } = deriveCap1Prefill(deriveInput);
      return (
        <Cap1Editor
          projectId={projectId}
          projectName={projectName}
          chapterTitle={chapterTitle}
          prefill={state}
          warnings={warnings}
        />
      );
    }
    case 2: {
      const { state, warnings } = deriveCap2Prefill(deriveInput);
      return (
        <Cap2Editor
          projectId={projectId}
          projectName={projectName}
          prefill={state}
          warnings={warnings}
        />
      );
    }
    case 3: {
      const { state, warnings } = deriveCap3Prefill(deriveInput);
      return (
        <Cap3Editor
          projectId={projectId}
          projectName={projectName}
          chapterTitle={chapterTitle}
          prefill={state}
          warnings={warnings}
        />
      );
    }
    case 4: {
      const { state, warnings } = deriveCap4Prefill(deriveInput);
      return (
        <Cap4Editor
          projectId={projectId}
          projectName={projectName}
          chapterTitle={chapterTitle}
          prefill={state}
          warnings={warnings}
        />
      );
    }
    case 5: {
      const { state, warnings } = deriveCap5Prefill(deriveInput);
      return (
        <Cap5Editor
          projectId={projectId}
          projectName={projectName}
          chapterTitle={chapterTitle}
          prefill={state}
          warnings={warnings}
        />
      );
    }
    case 6: {
      const { state, warnings } = deriveCap6Prefill(deriveInput);
      return (
        <Cap6Editor
          projectId={projectId}
          projectName={projectName}
          chapterTitle={chapterTitle}
          prefill={state}
          warnings={warnings}
        />
      );
    }
    case 7: {
      const { state, warnings } = deriveCap7Prefill(deriveInput);
      return (
        <Cap7Editor
          projectId={projectId}
          projectName={projectName}
          chapterTitle={chapterTitle}
          prefill={state}
          warnings={warnings}
        />
      );
    }
  }
}
