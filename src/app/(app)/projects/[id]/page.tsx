import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_LABELS,
  type AreaEfectivaRow,
  type AreaEstudioRow,
  type CentroPobladoRow,
  type ComponenteInventario,
  type ConcesionRow,
  type CatchmentPointRow,
  type ExcludableTributaryRow,
  type AnpOverlapRow,
  type Project,
  type RfiSubmission,
  type RiverRow,
  type SamplingStationRow,
} from "@/lib/types";
import AnpOverlapBanner from "@/components/AnpOverlapBanner";
import AreaEstudioPanel from "@/components/AreaEstudioPanel";
import CampoPanel from "@/components/CampoPanel";
import PresupuestoPanel from "@/components/PresupuestoPanel";
import ProjectMap from "@/components/ProjectMap";
import ProjectMapWithEditor from "@/components/ProjectMapWithEditor";
import ReportesPanel from "@/components/ReportesPanel";
import SamplingResultsPanel from "@/components/SamplingResultsPanel";
import SocialBaselinePanel from "@/components/SocialBaselinePanel";
import type { SocialBaselineRow } from "@/lib/inei/types";
import { formatDateTime, formatHa, formatNumber } from "@/lib/format";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "mapa", label: "Mapa" },
  { id: "componentes", label: "Componentes" },
  { id: "areas", label: "Áreas" },
  { id: "linea_base", label: "Línea base" },
  { id: "campo", label: "Campo" },
  { id: "presupuesto", label: "Presupuesto" },
  { id: "documentos", label: "Documentos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

interface ProjectRow extends Project {
  clientes: {
    razon_social: string;
    ruc: string;
    representante: string;
    domicilio: string | null;
    correo: string | null;
    telefono: string | null;
  } | null;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const activeTab: TabId = (TABS.some((t) => t.id === rawTab) ? rawTab : "resumen") as TabId;
  const resumenV2 = process.env.FEATURE_RESUMEN_V2 === "true";
  const supabase = await createClient();

  const [
    { data: project, error: projectError },
    { data: inventario },
    { data: submissions },
    { data: featuresJson, error: featuresError },
    { data: areaRows, error: areaError },
    { data: riversRows, error: riversError },
    { data: receptoresRows, error: receptoresError },
    { data: stationsRows, error: stationsError },
    { data: vegetationRows, error: vegetationError },
    { data: areaEfectivaRows, error: areaEfectivaError },
    { data: concesionesRows, error: concesionesError },
    { data: contoursRows, error: contoursError },
    { data: peruBoundaryRows, error: peruBoundaryError },
    { data: departamentosRows, error: departamentosError },
    { data: provinciasRows, error: provinciasError },
    { data: distritosRows, error: distritosError },
    { data: comunidadesRows, error: comunidadesError },
    { data: viasRows, error: viasError },
    { data: socialBaselineRows },
    { data: catchmentPointRows },
    { data: excludableTributariesRows },
    { data: anpOverlapRows },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `*,
         clientes ( razon_social, ruc, representante, domicilio, correo, telefono )`,
      )
      .eq("id", id)
      .single(),
    supabase
      .from("componente_inventario")
      .select("*")
      .eq("project_id", id)
      .order("categoria")
      .order("componente"),
    supabase
      .from("rfi_submissions")
      .select(
        "id, submitted_at, schema_ok, components_ingested, declared_platforms, actual_platforms, declared_area_ha, computed_area_ha, warnings, errors",
      )
      .eq("project_id", id)
      .order("submitted_at", { ascending: false }),
    supabase.rpc("project_features", { p_id: id }),
    supabase.rpc("get_area_estudio_for_project", { p_project_id: id }),
    supabase.rpc("get_streams_for_district", { p_project_id: id }),
    supabase.rpc("get_centros_poblados_for_project", { p_project_id: id, p_buffer_m: 5000 }),
    supabase.rpc("get_sampling_stations_for_project", { p_project_id: id }),
    supabase.rpc("get_vegetation_for_project", { p_project_id: id }),
    supabase.rpc("get_area_efectiva_for_project", {
      p_project_id: id,
    }),
    supabase.rpc("get_all_concesiones", { p_project_id: id }),
    supabase.rpc("get_contours_for_project", { p_project_id: id, p_buffer_m: 2000 }),
    supabase.rpc("get_peru_boundary"),
    supabase.rpc("get_departamentos_for_project", { p_project_id: id }),
    supabase.rpc("get_provincias_for_project", { p_project_id: id }),
    supabase.rpc("get_distritos_for_project", { p_project_id: id }),
    supabase.rpc("get_comunidades_for_project", { p_project_id: id }),
    supabase.rpc("get_vias_for_project", { p_project_id: id }),
    supabase.rpc("get_social_baseline_for_project", { p_project_id: id }),
    supabase.rpc("get_catchment_points_for_project", { p_project_id: id }),
    supabase.rpc("get_excludable_tributaries_for_project", { p_project_id: id }),
    supabase.rpc("get_anp_overlap_for_project", { p_project_id: id }),
  ]);

  if (projectError || !project) {
    notFound();
  }

  const p = project as ProjectRow;
  const inv = (inventario as ComponenteInventario[] | null) ?? [];
  const subs = (submissions as RfiSubmission[] | null) ?? [];
  const geojson = (featuresJson ?? {
    type: "FeatureCollection",
    features: [],
  }) as GeoJSON.FeatureCollection;

  // ─── Área de estudio derived state ────────────────────────────────
  // The RPC orders approved first, then most recent draft. The first
  // row is the one to render; remaining rows are older drafts kept for
  // history (not shown in v1).
  const areaRowsAll = (areaRows ?? []) as AreaEstudioRow[];
  const area = areaRowsAll[0] ?? null;

  const excludableTributaries =
    (excludableTributariesRows ?? []) as ExcludableTributaryRow[];
  const anpOverlaps = (anpOverlapRows ?? []) as AnpOverlapRow[];

  // `get_catchment_points_for_project` returns 0-2 rows: one per kind.
  const catchmentPointRowsList = (catchmentPointRows ?? []) as CatchmentPointRow[];
  const downstreamCp = catchmentPointRowsList.find((r) => r.kind === "downstream") ?? null;
  const upstreamCp = catchmentPointRowsList.find((r) => r.kind === "upstream") ?? null;
  const catchmentPointFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: catchmentPointRowsList.map((cp) => ({
      type: "Feature",
      geometry: JSON.parse(cp.geom_geojson) as GeoJSON.Geometry,
      properties: {
        kind: cp.kind,
        receiving_nombre: cp.receiving_river_nombre,
        receiving_strahler: cp.receiving_strahler,
        confluent_nombre: cp.confluent_river_nombre,
        confluent_strahler: cp.confluent_strahler,
        path_length_m: cp.path_length_m,
        distance_from_ae_m: cp.distance_from_ae_m,
        min_distance_m: cp.min_distance_m,
        // Pre-compute label so the map expression stays simple.
        label:
          (cp.kind === "upstream" ? "Aguas arriba · " : "Aguas abajo · ") +
          (cp.confluent_river_nombre ??
            `Strahler ${cp.confluent_strahler ?? "?"}`),
      },
    })),
  };

  const rivers = (riversRows ?? []) as RiverRow[];
  const riversFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: rivers.map((r) => ({
      type: "Feature",
      id: r.id,
      geometry: JSON.parse(r.geom_geojson) as GeoJSON.Geometry,
      properties: {
        source_id: r.source_id,
        nombre: r.nombre,
        length_km: r.length_km,
        strahler_order: r.strahler_order,
      },
    })),
  };

  const receptores = (receptoresRows ?? []) as CentroPobladoRow[];
  const receptoresFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: receptores.map((r) => ({
      type: "Feature",
      id: r.id,
      geometry: JSON.parse(r.geom_geojson) as GeoJSON.Geometry,
      properties: {
        nombre: r.nombre,
        ubigeo: r.ubigeo,
        categoria_poblado: r.categoria_poblado,
        categoria_admin: r.categoria_admin,
        distrito: r.distrito,
        provincia: r.provincia,
        departamento: r.departamento,
        inside_area_estudio: r.inside_area_estudio,
      },
    })),
  };

  const stations = (stationsRows ?? []) as SamplingStationRow[];
  const stationsFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      id: s.id,
      geometry: JSON.parse(s.geom_geojson) as GeoJSON.Geometry,
      properties: {
        status: s.status,
        discipline: s.discipline,
        kind: s.kind,
        station_code: s.station_code,
        rationale: s.rationale,
        target_receptor_nombre: s.target_receptor_nombre,
        parameters: s.parameters,
      },
    })),
  };

   interface VegetationRow {
     id: string;
     class_code: string | null;   // MINAM Simbolo (Pj, Br-al, etc.)
     class_name: string;
     area_ha: number | null;
     geom_geojson: string;
   }
   const vegetation = (vegetationRows ?? []) as VegetationRow[];
   const vegetationFc: GeoJSON.FeatureCollection = {
     type: "FeatureCollection",
     features: vegetation.map((v) => ({
       type: "Feature",
       id: v.id,
       geometry: JSON.parse(v.geom_geojson) as GeoJSON.Geometry,
       properties: {
         class_code: v.class_code,
         class_name: v.class_name,
         code: v.class_code ?? v.class_name ?? "",
         name: v.class_name ?? "",
         source: "MINAM",
         area_ha: v.area_ha,
       },
     })),
   };

  const concesiones = (concesionesRows ?? []) as ConcesionRow[];
  const concesionesFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: concesiones.map((c) => ({
      type: "Feature",
      id: c.id,
      geometry: JSON.parse(c.geom_geojson) as GeoJSON.Geometry,
      properties: {
        codigo: c.codigo,
        nombre: c.nombre,
        titular: c.titular,
        area_ha: c.area_ha,
        estado: c.estado,
        tipo: c.tipo,
        is_own: c.is_own,
      },
    })),
  };

  // Curvas de nivel — IGN Carta Nacional 1:100,000.
  interface ContourRow {
    id: number;
    altitud: number;
    geom_geojson: string;
  }
  const contours = (contoursRows ?? []) as ContourRow[];
  const contoursFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: contours.map((c) => ({
      type: "Feature",
      id: c.id,
      geometry: JSON.parse(c.geom_geojson) as GeoJSON.Geometry,
      properties: {
        altitud: c.altitud,
      },
    })),
  };

  // Departamentos / Provincias / Distritos — INEI 2023, filtered to the
  // project's region of interest (area_estudio ∪ area_efectiva ∪ components-bbox).
  interface BoundaryRow {
    id: number;
    codigo?: string;
    ubigeo?: string;
    nombre: string;
    geom_geojson: string;
  }
  function boundariesToFc(
    rows: BoundaryRow[] | null,
    codeField: "codigo" | "ubigeo",
  ): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: (rows ?? []).map((r) => ({
        type: "Feature",
        id: r.id,
        geometry: JSON.parse(r.geom_geojson) as GeoJSON.Geometry,
        properties: { [codeField]: r[codeField], nombre: r.nombre },
      })),
    };
  }
  const departamentosFc = boundariesToFc(
    (departamentosRows ?? null) as BoundaryRow[] | null,
    "codigo",
  );
  const provinciasFc = boundariesToFc(
    (provinciasRows ?? null) as BoundaryRow[] | null,
    "codigo",
  );
  const distritosFc = boundariesToFc(
    (distritosRows ?? null) as BoundaryRow[] | null,
    "ubigeo",
  );

  // Comunidades campesinas — polygons that overlap the project region.
  interface ComunidadRow {
    id: number;
    nombre: string;
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
    estado: string | null;
    area_ha: number | null;
    geom_geojson: string;
  }
  const comunidadesFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: ((comunidadesRows ?? []) as ComunidadRow[]).map((c) => ({
      type: "Feature",
      id: c.id,
      geometry: JSON.parse(c.geom_geojson) as GeoJSON.Geometry,
      properties: {
        nombre: c.nombre,
        estado: c.estado,
        departamento: c.departamento,
        provincia: c.provincia,
        distrito: c.distrito,
        area_ha: c.area_ha,
      },
    })),
  };

  // Red vial MTC — Nacional / Departamental / Vecinal segments.
  interface ViaRow {
    id: number;
    codruta: string | null;
    nombre: string | null;
    jerarquia: string | null;
    jerarquia_long: string | null;
    superficie: string | null;
    estado: string | null;
    longitud_km: number | null;
    geom_geojson: string;
  }
  const viasFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: ((viasRows ?? []) as ViaRow[]).map((v) => ({
      type: "Feature",
      id: v.id,
      geometry: JSON.parse(v.geom_geojson) as GeoJSON.Geometry,
      properties: {
        codruta: v.codruta,
        nombre: v.nombre,
        jerarquia: v.jerarquia,
        jerarquia_long: v.jerarquia_long,
        superficie: v.superficie,
        estado: v.estado,
        longitud_km: v.longitud_km,
      },
    })),
  };

  // Peru country outline (low-zoom reference layer).
  interface PeruBoundaryRow {
    id: number;
    geom_geojson: string;
  }
  const peruBoundaryRow =
    ((peruBoundaryRows ?? []) as PeruBoundaryRow[])[0] ?? null;
  const peruBoundaryFeature: GeoJSON.Feature<
    GeoJSON.MultiPolygon | GeoJSON.Polygon
  > | null = peruBoundaryRow
    ? {
        type: "Feature",
        geometry: JSON.parse(peruBoundaryRow.geom_geojson) as
          | GeoJSON.MultiPolygon
          | GeoJSON.Polygon,
        properties: {},
      }
    : null;

  const areaFeature: GeoJSON.Feature<
    GeoJSON.MultiPolygon | GeoJSON.Polygon
  > | null = area
    ? {
        type: "Feature",
        geometry: JSON.parse(area.geom_geojson) as
          | GeoJSON.MultiPolygon
          | GeoJSON.Polygon,
        properties: {
          status: area.status,
          area_ha: area.area_ha,
        },
      }
    : null;

  // Área efectiva — convex hull of components + 100 m buffer, computed
  // server-side via PostGIS. Always present unless the project has zero
  // components.
  const areaEfectiva =
    ((areaEfectivaRows ?? []) as AreaEfectivaRow[])[0] ?? null;
  const areaEfectivaFeature: GeoJSON.Feature<
    GeoJSON.MultiPolygon | GeoJSON.Polygon
  > | null = areaEfectiva
    ? {
        type: "Feature",
        geometry: JSON.parse(areaEfectiva.geom_geojson) as
          | GeoJSON.MultiPolygon
          | GeoJSON.Polygon,
        properties: {
          area_ha: areaEfectiva.area_ha,
          buffer_m: areaEfectiva.buffer_m,
          components_count: areaEfectiva.components_count,
        },
      }
    : null;

  const grouped = inv.reduce<Record<string, ComponenteInventario[]>>(
    (acc, row) => {
      (acc[row.categoria] ??= []).push(row);
      return acc;
    },
    {},
  );

  return (
    <div className="-mx-8 -mt-6 overflow-x-clip">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <header className="border-b border-stone-100 bg-white px-8 pb-5 pt-7">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-stone-400">
          <Link href="/projects" className="transition-colors hover:text-emerald-600">
            Proyectos
          </Link>
          <svg aria-hidden viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0">
            <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="max-w-xs truncate font-medium text-stone-600">{p.nombre_proyecto}</span>
        </nav>

        {/* Giant serif project name */}
        <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl lg:text-[2.85rem]">
          {p.nombre_proyecto}
        </h1>

        {/* Titular subtitle */}
        {p.clientes?.razon_social ? (
          <p className="mt-2 text-sm text-stone-500">
            {p.clientes.razon_social}
            {p.clientes.ruc ? (
              <span className="text-stone-300"> · RUC {p.clientes.ruc}</span>
            ) : null}
          </p>
        ) : null}

        {/* Metadata chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip>
            {p.region} / {p.provincia} / {p.distrito}
          </Chip>
          {p.commodity?.map((c) => (
            <Chip key={c} variant="emerald">{c}</Chip>
          ))}
          <Chip>
            Zona {p.zona_utm}S · {p.datum ?? "WGS 84"}
          </Chip>
          {p.area_total_ha ? (
            <Chip>
              {formatHa(p.area_total_ha)} ha totales
            </Chip>
          ) : null}
          {p.proyecto_brownfield ? <Chip variant="amber">Brownfield</Chip> : null}
          {p.codigo_cm ? <Chip>CM {p.codigo_cm}</Chip> : null}
          {p.metodo_exploracion?.length ? (
            <Chip>{p.metodo_exploracion.join(", ")}</Chip>
          ) : null}
        </div>
      </header>

      {/* ── TAB STRIP ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <nav
          className="flex items-end gap-0 overflow-x-auto px-8 scrollbar-none"
          aria-label="Secciones del proyecto"
        >
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/projects/${id}?tab=${t.id}`}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800"
              }`}
              aria-current={activeTab === t.id ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
      <div className="px-8 py-6">
        {activeTab === "campo" ? (
          <CampoPanel projectId={id} projectName={p.nombre_proyecto} />
        ) : activeTab === "presupuesto" ? (
          <PresupuestoPanel projectId={id} />
        ) : activeTab === "resumen" ? (
          <ResumenTab
            p={p}
            id={id}
            geojson={geojson}
            featuresError={featuresError}
            upstreamCp={upstreamCp}
            downstreamCp={downstreamCp}
            catchmentPointFc={catchmentPointFc}
            riversFc={riversFc}
            receptoresFc={receptoresFc}
            stationsFc={stationsFc}
            areaFeature={areaFeature}
            area={area}
            areaEfectivaFeature={areaEfectivaFeature}
            areaEfectiva={areaEfectiva}
            vegetationFc={vegetationFc}
            concesionesFc={concesionesFc}
            contoursFc={contoursFc}
            peruBoundaryFeature={peruBoundaryFeature}
            departamentosFc={departamentosFc}
            provinciasFc={provinciasFc}
            distritosFc={distritosFc}
            comunidadesFc={comunidadesFc}
            viasFc={viasFc}
            areaError={areaError}
            areaEfectivaError={areaEfectivaError}
            riversError={riversError}
            receptoresError={receptoresError}
            stationsError={stationsError}
            vegetationError={vegetationError}
            concesionesError={concesionesError}
            contoursError={contoursError}
            peruBoundaryError={peruBoundaryError}
            departamentosError={departamentosError}
            provinciasError={provinciasError}
            distritosError={distritosError}
            comunidadesError={comunidadesError}
            viasError={viasError}
            receptores={receptores}
            stations={stations}
            vegetation={vegetation}
            inv={inv}
            grouped={grouped}
            subs={subs}
            resumenV2={resumenV2}
            excludableTributaries={excludableTributaries}
            anpOverlaps={anpOverlaps}
          />
        ) : activeTab === "linea_base" ? (
          <SocialBaselinePanel
            projectId={id}
            initial={((socialBaselineRows ?? []) as SocialBaselineRow[])[0] ?? null}
            resolvedUbigeo={
              ((socialBaselineRows ?? []) as SocialBaselineRow[])[0]
                ?.resolved_ubigeo ?? null
            }
            distrito={p.distrito}
            provincia={p.provincia}
            region={p.region}
          />
        ) : (
          <EmptyTab tab={activeTab} />
        )}
      </div>
    </div>
  );
}

// ── Resumen tab ───────────────────────────────────────────────────────────────

interface VegetationZone {
  id: string;
  class_code: string | null;
  class_name: string;
  area_ha: number | null;
  geom_geojson: string;
}

function ResumenTab({
  p,
  id,
  geojson,
  featuresError,
  upstreamCp,
  downstreamCp,
  catchmentPointFc,
  riversFc,
  receptoresFc,
  stationsFc,
  areaFeature,
  area,
  areaEfectivaFeature,
  areaEfectiva,
  vegetationFc,
  concesionesFc,
  contoursFc,
  peruBoundaryFeature,
  departamentosFc,
  provinciasFc,
  distritosFc,
  comunidadesFc,
  viasFc,
  areaError,
  areaEfectivaError,
  riversError,
  receptoresError,
  stationsError,
  vegetationError,
  concesionesError,
  contoursError,
  peruBoundaryError,
  departamentosError,
  provinciasError,
  distritosError,
  comunidadesError,
  viasError,
  receptores,
  stations,
  vegetation,
  inv,
  grouped,
  subs,
  resumenV2,
  excludableTributaries,
  anpOverlaps,
}: {
  p: ProjectRow;
  id: string;
  geojson: GeoJSON.FeatureCollection;
  featuresError: { message: string } | null;
  upstreamCp: CatchmentPointRow | null;
  downstreamCp: CatchmentPointRow | null;
  catchmentPointFc: GeoJSON.FeatureCollection;
  riversFc: GeoJSON.FeatureCollection;
  receptoresFc: GeoJSON.FeatureCollection;
  stationsFc: GeoJSON.FeatureCollection;
  areaFeature: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  area: AreaEstudioRow | null;
  areaEfectivaFeature: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  areaEfectiva: AreaEfectivaRow | null;
  vegetationFc: GeoJSON.FeatureCollection;
  concesionesFc: GeoJSON.FeatureCollection;
  contoursFc: GeoJSON.FeatureCollection;
  peruBoundaryFeature: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  departamentosFc: GeoJSON.FeatureCollection;
  provinciasFc: GeoJSON.FeatureCollection;
  distritosFc: GeoJSON.FeatureCollection;
  comunidadesFc: GeoJSON.FeatureCollection;
  viasFc: GeoJSON.FeatureCollection;
  areaError: { message: string } | null;
  areaEfectivaError: { message: string } | null;
  riversError: { message: string } | null;
  receptoresError: { message: string } | null;
  stationsError: { message: string } | null;
  vegetationError: { message: string } | null;
  concesionesError: { message: string } | null;
  contoursError: { message: string } | null;
  peruBoundaryError: { message: string } | null;
  departamentosError: { message: string } | null;
  provinciasError: { message: string } | null;
  distritosError: { message: string } | null;
  comunidadesError: { message: string } | null;
  viasError: { message: string } | null;
  receptores: CentroPobladoRow[];
  stations: SamplingStationRow[];
  vegetation: VegetationZone[];
  inv: ComponenteInventario[];
  grouped: Record<string, ComponenteInventario[]>;
  subs: RfiSubmission[];
  resumenV2: boolean;
  excludableTributaries: ExcludableTributaryRow[];
  anpOverlaps: AnpOverlapRow[];
}) {
  const layerError =
    areaError?.message ??
    areaEfectivaError?.message ??
    riversError?.message ??
    receptoresError?.message ??
    stationsError?.message ??
    vegetationError?.message ??
    concesionesError?.message ??
    contoursError?.message ??
    peruBoundaryError?.message ??
    departamentosError?.message ??
    provinciasError?.message ??
    distritosError?.message ??
    comunidadesError?.message ??
    viasError?.message ??
    null;

  return (
    <div className="space-y-6">
      {/* Regulatory banner — only renders when the project overlaps an ANP or ZA */}
      <AnpOverlapBanner overlaps={anpOverlaps} />

      {/* PROYECTO / TITULAR two-column block */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Proyecto">
          <DefList
            items={[
              ["Ubicación", `${p.region} / ${p.provincia} / ${p.distrito}`],
              ["Código CM", p.codigo_cm ?? "—"],
              ["Área total", p.area_total_ha ? `${p.area_total_ha} ha` : "—"],
              ["UTM / Datum", `${p.zona_utm}S · ${p.datum ?? "WGS 84"}`],
              ["Commodity", p.commodity?.join(", ") ?? "—"],
              ["Método de exploración", p.metodo_exploracion?.join(", ") ?? "—"],
              ["Brownfield", p.proyecto_brownfield ? "Sí" : "No"],
            ]}
          />
        </Card>
        <Card title="Titular">
          <DefList
            items={[
              ["Razón social", p.clientes?.razon_social ?? "—"],
              ["RUC", p.clientes?.ruc ?? "—"],
              ["Representante", p.clientes?.representante ?? "—"],
              ["Domicilio", p.clientes?.domicilio ?? "—"],
              ["Correo", p.clientes?.correo ?? "—"],
              ["Teléfono", p.clientes?.telefono ?? "—"],
            ]}
          />
        </Card>
      </div>

      {/* Map card — Phase 2 layout (with leyenda, vegetation bar, área efectiva) or plain fallback */}
      {resumenV2 ? (
        <>
          <MapWithLeyenda
            projectId={id}
            geojson={geojson}
            featuresError={featuresError}
            catchmentPointFc={catchmentPointFc}
            riversFc={riversFc}
            receptoresFc={receptoresFc}
            stationsFc={stationsFc}
            areaFeature={areaFeature}
            area={area}
            areaEfectivaFeature={areaEfectivaFeature}
            areaEfectiva={areaEfectiva}
            vegetationFc={vegetationFc}
            concesionesFc={concesionesFc}
            contoursFc={contoursFc}
            peruBoundaryFeature={peruBoundaryFeature}
            departamentosFc={departamentosFc}
            provinciasFc={provinciasFc}
            distritosFc={distritosFc}
            comunidadesFc={comunidadesFc}
            viasFc={viasFc}
            vegetation={vegetation}
            layerError={layerError}
          />
          <VegetacionBar vegetation={vegetation} />
          {areaEfectiva && <AreaEfectivaCallout areaEfectiva={areaEfectiva} />}
        </>
      ) : (
        <Card title={`Mapa del proyecto · ${geojson.features.length} componentes georreferenciados`}>
          {featuresError ? (
            <p className="text-sm text-red-600">{featuresError.message}</p>
          ) : geojson.features.length === 0 ? (
            <p className="text-sm text-stone-400">Sin geometría cargada para este proyecto.</p>
          ) : (
            <div className="h-[480px] overflow-hidden rounded-lg">
              <ProjectMap
                geojson={geojson}
                catchmentPoint={catchmentPointFc}
                rivers={riversFc}
                receptores={receptoresFc}
                samplingStations={stationsFc}
                areaEstudio={areaFeature}
                areaEstudioStatus={area?.status ?? null}
                areaEfectiva={areaEfectivaFeature}
                vegetationZones={vegetationFc}
                concesiones={concesionesFc}
                contours={contoursFc}
                peruBoundary={peruBoundaryFeature}
                departamentos={departamentosFc}
                provincias={provinciasFc}
                distritos={distritosFc}
                comunidades={comunidadesFc}
                vias={viasFc}
              />
            </div>
          )}
          {layerError && (
            <p className="mt-2 text-xs text-amber-700">Error cargando capas: {layerError}</p>
          )}
        </Card>
      )}

      {/* Área de estudio panel */}
      <AreaEstudioPanel
        area={area}
        upstreamCp={upstreamCp}
        downstreamCp={downstreamCp}
        projectId={id}
        hasComponents={geojson.features.length > 0}
        hasAreaEstudio={area !== null}
        receptores={receptores}
        stations={stations}
        componentCount={geojson.features.length}
        vegetationZones={vegetation.map((v) => ({
          id: String(v.id),
          class_code: v.class_code?.toString() ?? "",
          class_name: v.class_name ?? "",
          area_ha: v.area_ha ?? 0,
        }))}
        excludableTributaries={excludableTributaries}
      />

      {/* Resultados de Monitoreo */}
      <SamplingResultsPanel
        projectId={id}
        stations={stations.map((s) => ({
          id: s.id,
          station_code: s.station_code,
          kind: s.kind,
          target_receptor_nombre: s.target_receptor_nombre,
        }))}
      />

      {/* Reportes panel */}
      <ReportesPanel projectId={id} projectName={p.nombre_proyecto} />

      {/* Inventario by category */}
      <Card title={`Inventario de componentes (${inv.length} filas)`}>
        <div className="space-y-2">
          {Object.entries(grouped).length === 0 ? (
            <p className="text-sm text-stone-400">Sin inventario.</p>
          ) : (
            Object.entries(grouped).map(([categoria, rows]) => {
              const totalQty = rows.reduce((sum, r) => sum + (r.cantidad ?? 0), 0);
              return (
                <details
                  key={categoria}
                  className="group overflow-hidden rounded-lg border border-stone-200 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-stone-50">
                    <span className="flex items-center gap-2.5">
                      <svg
                        aria-hidden
                        viewBox="0 0 12 12"
                        className="h-3 w-3 text-stone-400 transition-transform duration-150 group-open:rotate-90"
                      >
                        <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium text-stone-700">
                        {CATEGORY_LABELS[categoria] ?? categoria}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-xs tabular-nums text-stone-400">
                      <span>{rows.length} {rows.length === 1 ? "ítem" : "ítems"}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">{totalQty} unid.</span>
                    </span>
                  </summary>
                  <div className="border-t border-stone-100">
                    <table className="min-w-full text-sm">
                      <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Componente</th>
                          <th className="px-4 py-2.5 text-right font-medium">Cantidad</th>
                          <th className="px-4 py-2.5 font-medium">Atributos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {rows.map((r) => (
                          <tr key={r.id} className="transition-colors hover:bg-stone-50/50">
                            <td className="px-4 py-2.5 font-mono text-xs text-stone-700">{r.componente}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">{r.cantidad}</td>
                            <td className="px-4 py-2.5 text-stone-500">
                              {r.attrs && Object.keys(r.attrs).length > 0
                                ? Object.entries(r.attrs).map(([k, v]) => `${k}: ${v}`).join("  ·  ")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })
          )}
        </div>
      </Card>

      {/* RFI Submissions */}
      <Card title={`RFI submissions (${subs.length})`}>
        {subs.length === 0 ? (
          <p className="text-sm text-stone-400">Sin envíos registrados.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Plataformas</th>
                  <th className="px-4 py-3 text-right font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Warnings / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subs.map((s) => {
                  const ok = s.schema_ok && s.components_ingested && (s.errors?.length ?? 0) === 0;
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-stone-50/50">
                      <td className="px-4 py-3 text-stone-500">
                        {formatDateTime(s.submitted_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
                          {ok ? "GREEN" : "RED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {s.declared_platforms ?? "—"} / {s.actual_platforms ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {s.declared_area_ha ?? "—"} ha decl · {s.computed_area_ha ?? "—"} ha calc
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {(s.warnings?.length ?? 0) > 0 ? `${s.warnings?.length} warnings` : ""}
                        {(s.errors?.length ?? 0) > 0 ? ` · ${s.errors?.length} errors` : ""}
                        {(s.warnings?.length ?? 0) + (s.errors?.length ?? 0) === 0 ? "Sin issues" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Vegetation palette + aggregation ─────────────────────────────────────────

// MINAM 2015 Simbolo → color.
const VEGE_COLORS: Record<string, string> = {
  Pj: "#d4a017", Pjh: "#eab308",
  "Br-al": "#166534", "Br-me": "#15803d", Bp: "#14532d", "Bp-A": "#22c55e",
  "Bh-MBT": "#0f766e", "Bh-MBS": "#10b981", "Bh-T": "#059669",
  "Bs-mo": "#a16207", "Bs-MA": "#b45309", "Bs-T": "#92400e",
  Ma: "#84cc16", "Ma-DS": "#bef264", "Ma-T": "#4d7c0f",
  Bof: "#2dd4bf", "L/Co": "#38bdf8", Pa: "#14b8a6",
  Agri: "#f97316", Agro: "#fb923c", Cul: "#fdba74",
  Pc: "#65a30d", ZU: "#dc2626",
};

function vegeColor(code: string | null): string {
  return (code && VEGE_COLORS[code]) ?? "#a8a29e";
}

function aggregateVege(
  vegetation: VegetationZone[],
): { code: string | null; name: string; area: number }[] {
  const byClass = new Map<string, { code: string | null; name: string; area: number }>();
  for (const v of vegetation) {
    const key = v.class_code ?? v.class_name;
    const entry = byClass.get(key);
    const area = v.area_ha ?? 0;
    if (entry) entry.area += area;
    else byClass.set(key, { code: v.class_code, name: v.class_name, area });
  }
  return [...byClass.values()].filter((v) => v.area > 0).sort((a, b) => b.area - a.area);
}

// ── VegetacionBar ─────────────────────────────────────────────────────────────

function VegetacionBar({ vegetation }: { vegetation: VegetationZone[] }) {
  const classes = aggregateVege(vegetation);
  const total = classes.reduce((s, v) => s + v.area, 0);
  if (!classes.length || total === 0) return null;

  const fmt = (n: number): string => formatHa(n);

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-700">
          Vegetación · MINAM 2015
        </h2>
        <span className="text-xs text-stone-400">{fmt(total)} ha total</span>
      </div>

      {/* Stacked bar */}
      <div
        className="flex h-5 w-full overflow-hidden rounded-md"
        role="img"
        aria-label="Distribución de cobertura vegetal por clase"
      >
        {classes.map((v, i) => (
          <div
            key={i}
            style={{ width: `${(v.area / total) * 100}%`, backgroundColor: vegeColor(v.code) }}
            title={`${v.name}: ${fmt(v.area)} ha`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {classes.slice(0, 12).map((v, i) => (
          <div key={i} className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: vegeColor(v.code) }}
            />
            <span className="min-w-0 truncate text-xs text-stone-600">{v.name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-xs text-stone-400">
              {((v.area / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        {classes.length > 12 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-stone-200" />
            <span className="text-xs text-stone-400">+{classes.length - 12} más</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ── MapWithLeyenda ────────────────────────────────────────────────────────────

function MapWithLeyenda({
  projectId,
  geojson,
  featuresError,
  catchmentPointFc,
  riversFc,
  receptoresFc,
  stationsFc,
  areaFeature,
  area,
  areaEfectivaFeature,
  areaEfectiva,
  vegetationFc,
  concesionesFc,
  contoursFc,
  peruBoundaryFeature,
  departamentosFc,
  provinciasFc,
  distritosFc,
  comunidadesFc,
  viasFc,
  vegetation,
  layerError,
}: {
  projectId: string;
  geojson: GeoJSON.FeatureCollection;
  featuresError: { message: string } | null;
  catchmentPointFc: GeoJSON.FeatureCollection;
  riversFc: GeoJSON.FeatureCollection;
  receptoresFc: GeoJSON.FeatureCollection;
  stationsFc: GeoJSON.FeatureCollection;
  areaFeature: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  area: AreaEstudioRow | null;
  areaEfectivaFeature: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  areaEfectiva: AreaEfectivaRow | null;
  vegetationFc: GeoJSON.FeatureCollection;
  concesionesFc: GeoJSON.FeatureCollection;
  contoursFc: GeoJSON.FeatureCollection;
  peruBoundaryFeature: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  departamentosFc: GeoJSON.FeatureCollection;
  provinciasFc: GeoJSON.FeatureCollection;
  distritosFc: GeoJSON.FeatureCollection;
  comunidadesFc: GeoJSON.FeatureCollection;
  viasFc: GeoJSON.FeatureCollection;
  vegetation: VegetationZone[];
  layerError: string | null;
}) {
  const allVegeClasses = aggregateVege(vegetation);
  const vegeClasses = allVegeClasses.slice(0, 6);
  const areaStatusLabel =
    area?.status === "approved"
      ? "Aprobada"
      : area?.status === "superseded"
        ? "Reemplazada"
        : "Borrador";

  const fmt = (n: number): string => formatHa(n);

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-stone-700">Mapa del proyecto</h2>
        <span className="text-xs text-stone-400">
          {geojson.features.length} componentes georreferenciados
        </span>
      </div>

      {/* Body: map + leyenda */}
      <div className="flex min-h-0">
        {/* Map column */}
        <div className="min-w-0 flex-1 p-4">
          {featuresError ? (
            <div className="flex h-[480px] items-center justify-center rounded-lg border border-red-200 bg-red-50">
              <p className="text-sm text-red-600">{featuresError.message}</p>
            </div>
          ) : geojson.features.length === 0 ? (
            <div className="flex h-[480px] items-center justify-center rounded-lg border border-stone-200 bg-stone-50">
              <p className="text-sm text-stone-400">Sin geometría cargada para este proyecto.</p>
            </div>
          ) : (
            <ProjectMapWithEditor
              projectId={projectId}
              areaEfectivaRow={areaEfectiva}
              geojson={geojson}
              catchmentPoint={catchmentPointFc}
              rivers={riversFc}
              receptores={receptoresFc}
              samplingStations={stationsFc}
              areaEstudio={areaFeature}
              areaEstudioStatus={area?.status ?? null}
              areaEfectiva={areaEfectivaFeature}
              vegetationZones={vegetationFc}
              concesiones={concesionesFc}
              contours={contoursFc}
              peruBoundary={peruBoundaryFeature}
              departamentos={departamentosFc}
              provincias={provinciasFc}
              distritos={distritosFc}
              comunidades={comunidadesFc}
              vias={viasFc}
            />
          )}
          {layerError && (
            <p className="mt-2 text-xs text-amber-700">Error cargando capas: {layerError}</p>
          )}
        </div>

        {/* Leyenda panel */}
        <div className="w-[200px] shrink-0 overflow-y-auto border-l border-stone-100 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
            Leyenda
          </p>

          {/* Áreas */}
          {(area || areaEfectiva) && (
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Áreas
              </p>
              {area && (
                <div className="mb-2 flex items-start gap-2">
                  <span className="mt-0.5 h-3 w-3 shrink-0 rounded-[2px] border-2 border-emerald-500 bg-emerald-100" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-stone-700">Área de estudio</p>
                    <p className="text-[10px] text-stone-400">
                      {fmt(area.area_ha)} ha · {areaStatusLabel}
                    </p>
                  </div>
                </div>
              )}
              {areaEfectiva && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 h-3 w-3 shrink-0 rounded-[2px] border-2 border-dashed border-rose-500" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-stone-700">Área efectiva</p>
                    <p className="text-[10px] text-stone-400">{fmt(areaEfectiva.area_ha)} ha</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vegetación */}
          {vegeClasses.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Vegetación
              </p>
              <div className="space-y-1.5">
                {vegeClasses.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: vegeColor(v.code) }}
                    />
                    <span className="min-w-0 truncate text-[11px] text-stone-600">{v.name}</span>
                  </div>
                ))}
                {allVegeClasses.length > 6 && (
                  <p className="text-[10px] text-stone-400">
                    +{allVegeClasses.length - 6} clases más
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── AreaEfectivaCallout ───────────────────────────────────────────────────────

function AreaEfectivaCallout({ areaEfectiva }: { areaEfectiva: AreaEfectivaRow }) {
  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
          Área efectiva
        </h2>
        <span className="text-xs text-emerald-500/70">
          Convex hull + {areaEfectiva.buffer_m} m buffer
        </span>
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <span className="font-serif text-[2.5rem] font-semibold leading-none tracking-tight text-emerald-800">
          {formatNumber(areaEfectiva.area_ha, { decimals: 2 })}
        </span>
        <span className="mb-0.5 text-sm font-medium text-emerald-600">ha</span>
      </div>
      <p className="mt-2 text-xs text-emerald-700/60">
        Footprint físico del proyecto · {areaEfectiva.components_count} componentes
      </p>
    </section>
  );
}

// ── Empty tab placeholder ─────────────────────────────────────────────────────

const TAB_LABELS: Partial<Record<TabId, string>> = {
  mapa: "Vista cartográfica",
  componentes: "Inventario de componentes",
  areas: "Áreas de estudio e influencia",
  linea_base: "Datos de línea base",
  documentos: "Documentos del proyecto",
};

function EmptyTab({ tab }: { tab: TabId }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-stone-300">
          <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zM6 13.25V3.5h8v9.75a.75.75 0 01-1.064.678L9.5 12.2l-3.436 1.728A.75.75 0 016 13.25z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-sm font-medium text-stone-600">{TAB_LABELS[tab] ?? tab}</p>
      <p className="mt-1 text-xs text-stone-400">Próximamente</p>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Chip({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "emerald" | "amber";
}) {
  const styles = {
    default: "bg-stone-100 text-stone-600",
    emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <h2 className="mb-4 text-sm font-semibold text-stone-700">{title}</h2>
      {children}
    </section>
  );
}

function DefList({ items }: { items: [string, string | number | null][] }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-stone-400">{k}</dt>
          <dd className="font-medium text-stone-900">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
