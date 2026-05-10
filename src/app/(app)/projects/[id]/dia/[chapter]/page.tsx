import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Cap2Editor from "@/components/cap2/Cap2Editor";
import ChapterEditor from "@/components/dia/ChapterEditor";
import DiaChapterHeader from "@/components/dia/DiaChapterHeader";
import { deriveCap1Prefill } from "@/lib/dia/cap1/derive";
import { DG_FIELDS as CAP1_DG_FIELDS, SECTIONS as CAP1_SECTIONS } from "@/lib/dia/cap1/fields";
import { deriveCap2Prefill } from "@/lib/dia/cap2/derive";
import { deriveCap3Prefill } from "@/lib/dia/cap3/derive";
import { DG_FIELDS as CAP3_DG_FIELDS, SECTIONS as CAP3_SECTIONS } from "@/lib/dia/cap3/fields";
import { deriveCap4Prefill } from "@/lib/dia/cap4/derive";
import { DG_FIELDS as CAP4_DG_FIELDS, SECTIONS as CAP4_SECTIONS } from "@/lib/dia/cap4/fields";
import { deriveCap5Prefill } from "@/lib/dia/cap5/derive";
import { DG_FIELDS as CAP5_DG_FIELDS, SECTIONS as CAP5_SECTIONS } from "@/lib/dia/cap5/fields";
import { deriveCap6Prefill } from "@/lib/dia/cap6/derive";
import { DG_FIELDS as CAP6_DG_FIELDS, SECTIONS as CAP6_SECTIONS } from "@/lib/dia/cap6/fields";
import { migrateCap6V1ToV2 } from "@/lib/dia/cap6/migration";
import { deriveCap7Prefill } from "@/lib/dia/cap7/derive";
import { DG_FIELDS as CAP7_DG_FIELDS, SECTIONS as CAP7_SECTIONS } from "@/lib/dia/cap7/fields";
import { findChapter, isValidChapterId } from "@/lib/dia/chapters";
import type { ChapterId } from "@/lib/dia/framework/manifest";
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

interface FrameworkChapterConfig {
  derive: (input: DeriveInput) => {
    state: { introFields: Record<string, string>; dgFields: Record<string, string>; content: Record<string, string> };
    warnings: string[];
  };
  sections: typeof CAP1_SECTIONS;
  dgGroups: typeof CAP1_DG_FIELDS;
  initialActiveId: string;
  initiallyOpenIds: readonly string[];
  migrate?: (state: { introFields: Record<string, string>; dgFields: Record<string, string>; content: Record<string, string> }) => { introFields: Record<string, string>; dgFields: Record<string, string>; content: Record<string, string> };
}

// Caps 1, 3, 4, 5, 6, 7 use the generic ChapterEditor. Cap. 2 keeps its
// bespoke editor below.
const FRAMEWORK_CHAPTERS: Partial<Record<ChapterId, FrameworkChapterConfig>> = {
  1: {
    derive: deriveCap1Prefill,
    sections: CAP1_SECTIONS,
    dgGroups: CAP1_DG_FIELDS,
    initialActiveId: "1.1",
    initiallyOpenIds: ["1.0"],
  },
  3: {
    derive: deriveCap3Prefill,
    sections: CAP3_SECTIONS as unknown as typeof CAP1_SECTIONS,
    dgGroups: CAP3_DG_FIELDS as unknown as typeof CAP1_DG_FIELDS,
    initialActiveId: "3.1",
    initiallyOpenIds: ["3.0", "3.2", "3.3", "3.4"],
  },
  4: {
    derive: deriveCap4Prefill,
    sections: CAP4_SECTIONS as unknown as typeof CAP1_SECTIONS,
    dgGroups: CAP4_DG_FIELDS as unknown as typeof CAP1_DG_FIELDS,
    initialActiveId: "4.1",
    initiallyOpenIds: ["4.0"],
  },
  5: {
    derive: deriveCap5Prefill,
    sections: CAP5_SECTIONS as unknown as typeof CAP1_SECTIONS,
    dgGroups: CAP5_DG_FIELDS as unknown as typeof CAP1_DG_FIELDS,
    initialActiveId: "5.1",
    initiallyOpenIds: ["5.0"],
  },
  6: {
    derive: deriveCap6Prefill,
    sections: CAP6_SECTIONS as unknown as typeof CAP1_SECTIONS,
    dgGroups: CAP6_DG_FIELDS as unknown as typeof CAP1_DG_FIELDS,
    initialActiveId: "6.0.0",
    initiallyOpenIds: ["6.0", "6.2", "6.3"],
    migrate: migrateCap6V1ToV2,
  },
  7: {
    derive: deriveCap7Prefill,
    sections: CAP7_SECTIONS as unknown as typeof CAP1_SECTIONS,
    dgGroups: CAP7_DG_FIELDS as unknown as typeof CAP1_DG_FIELDS,
    initialActiveId: "7.1",
    initiallyOpenIds: ["7.0"],
  },
};

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

  // Cap. 2 keeps its bespoke editor (UTM zone selector + basin auto-detect)
  if (entry.id === 2) {
    const { state, warnings } = deriveCap2Prefill(deriveInput);
    return (
      <div className="min-h-screen bg-stone-50">
        <DiaChapterHeader projectId={id} projectName={p.nombre_proyecto} title={entry.longTitle} />
        <Cap2Editor
          projectId={id}
          projectName={p.nombre_proyecto}
          prefill={state}
          warnings={warnings}
        />
      </div>
    );
  }

  const config = FRAMEWORK_CHAPTERS[entry.id];
  if (!config) notFound();

  const { state, warnings } = config.derive(deriveInput);
  return (
    <div className="min-h-screen bg-stone-50">
      <DiaChapterHeader projectId={id} projectName={p.nombre_proyecto} title={entry.longTitle} />
      <ChapterEditor
        chapterId={entry.id}
        chapterTitle={entry.shortTitle}
        projectId={id}
        projectName={p.nombre_proyecto}
        prefill={state}
        warnings={warnings}
        sections={config.sections}
        dgGroups={config.dgGroups}
        initialActiveId={config.initialActiveId}
        initiallyOpenIds={config.initiallyOpenIds}
        migrate={config.migrate}
      />
    </div>
  );
}
