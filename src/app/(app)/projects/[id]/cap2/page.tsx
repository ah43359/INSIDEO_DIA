import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Cap2Editor from "@/components/cap2/Cap2Editor";
import { deriveCap2Prefill } from "@/lib/cap2/derive";
import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
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

export default async function Cap2Page({ params }: PageProps) {
  const { id } = await params;
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

  const { state: prefillState, warnings } = deriveCap2Prefill({
    project: p,
    cliente: p.clientes,
    componentes,
    componentsGeom,
    areaEstudio,
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
          <div>
            <Link
              href={`/projects/${id}`}
              className="text-xs text-stone-500 hover:text-stone-700"
            >
              ← Volver al proyecto
            </Link>
            <h1 className="mt-1 text-lg font-semibold text-stone-800">
              Capítulo 2 — Descripción del Proyecto
            </h1>
            <p className="text-sm text-stone-500">{p.nombre_proyecto}</p>
          </div>
          <div className="text-right text-xs text-stone-400">
            {componentes.length} componente(s) · {areaEstudio ? "área de estudio definida" : "sin área de estudio"}
          </div>
        </div>
      </header>
      <Cap2Editor projectId={id} projectName={p.nombre_proyecto} prefill={prefillState} warnings={warnings} />
    </div>
  );
}
