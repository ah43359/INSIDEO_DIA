import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Cap2Editor from "@/components/cap2/Cap2Editor";
import ChapterEditor from "@/components/dia/ChapterEditor";
import { deriveCap1Prefill } from "@/lib/dia/cap1/derive";
import { DG_FIELDS as CAP1_DG_FIELDS, SECTIONS as CAP1_SECTIONS } from "@/lib/dia/cap1/fields";
import { deriveCap2Prefill } from "@/lib/dia/cap2/derive";
import { findChapter, isValidChapterId } from "@/lib/dia/chapters";
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

interface ProjectFeatureGeoJson {
  type: "FeatureCollection";
  features: Array<{
    id?: string | number;
    properties?: Record<string, unknown> | null;
    geometry: GeoJSON.Geometry;
  }>;
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
    supabase
      .from("projects")
      .select(
        `*,
         clientes ( id, razon_social, ruc, domicilio, representante, dni_representante, cargo, telefono, correo )`,
      )
      .eq("id", id)
      .single(),
    supabase.from("componente_inventario").select("*").eq("project_id", id),
    supabase.rpc("project_features", { p_id: id }),
    supabase.rpc("get_area_estudio_for_project", { p_project_id: id }),
  ]);

  if (projectError || !project) notFound();

  const p = project as ProjectRow;
  const componentes = (inventario as ComponenteInventario[] | null) ?? [];
  const fc = (featuresJson ?? { type: "FeatureCollection", features: [] }) as ProjectFeatureGeoJson;
  const componentsGeom: ComponentGeomFeature[] = fc.features.map((f) => {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    return {
      id: String(f.id ?? ""),
      project_id: id,
      nombre: String(props.nombre ?? ""),
      tipo: String(props.tipo ?? ""),
      categoria: typeof props.categoria === "string" ? props.categoria : null,
      area_m2: typeof props.area_m2 === "number" ? props.area_m2 : null,
      longitud_tunel_m: typeof props.longitud_tunel_m === "number" ? props.longitud_tunel_m : null,
      geom_geojson: f.geometry ? JSON.stringify(f.geometry) : null,
    };
  });
  const areaRowsAll = (areaRows ?? []) as AreaEstudioRow[];
  const areaEstudio = areaRowsAll[0] ?? null;

  if (entry.status === "planned") {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header projectId={id} projectName={p.nombre_proyecto} title={entry.longTitle} />
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

  if (entry.id === 1) {
    const { state, warnings } = deriveCap1Prefill({
      project: p,
      cliente: p.clientes,
      componentes,
      componentsGeom,
      areaEstudio,
    });
    return (
      <div className="min-h-screen bg-stone-50">
        <Header projectId={id} projectName={p.nombre_proyecto} title={entry.longTitle} />
        <ChapterEditor
          chapterId={1}
          chapterTitle={entry.shortTitle}
          projectId={id}
          projectName={p.nombre_proyecto}
          prefill={state}
          warnings={warnings}
          sections={CAP1_SECTIONS}
          dgGroups={CAP1_DG_FIELDS}
          initialActiveId="1.1"
          initiallyOpenIds={["1.0"]}
        />
      </div>
    );
  }

  // Cap. 2 keeps its bespoke editor (UTM zone selector + basin auto-detect)
  if (entry.id === 2) {
    const { state, warnings } = deriveCap2Prefill({
      project: p,
      cliente: p.clientes,
      componentes,
      componentsGeom,
      areaEstudio,
    });
    return (
      <div className="min-h-screen bg-stone-50">
        <Header projectId={id} projectName={p.nombre_proyecto} title={entry.longTitle} />
        <Cap2Editor
          projectId={id}
          projectName={p.nombre_proyecto}
          prefill={state}
          warnings={warnings}
        />
      </div>
    );
  }

  notFound();
}

function Header({
  projectId,
  projectName,
  title,
}: {
  projectId: string;
  projectName: string;
  title: string;
}) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
        <div>
          <Link
            href={`/projects/${projectId}/dia`}
            className="text-xs text-stone-500 hover:text-stone-700"
          >
            ← Índice DIA
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-stone-800">{title}</h1>
          <p className="text-sm text-stone-500">{projectName}</p>
        </div>
      </div>
    </header>
  );
}
