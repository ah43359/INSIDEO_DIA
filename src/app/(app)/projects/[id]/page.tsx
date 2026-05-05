import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_LABELS,
  type AreaEfectivaRow,
  type AreaEstudioRow,
  type CentroPobladoRow,
  type ComponenteInventario,
  type MicrocuencaRow,
  type Project,
  type RfiSubmission,
  type RiverRow,
  type SamplingStationRow,
} from "@/lib/types";
import AreaEstudioPanel from "@/components/AreaEstudioPanel";
import ProjectMap from "@/components/ProjectMap";
import ReportesPanel from "@/components/ReportesPanel";

interface PageProps {
  params: Promise<{ id: string }>;
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

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: project, error: projectError },
    { data: inventario },
    { data: submissions },
    { data: featuresJson, error: featuresError },
    { data: microcuencasRows, error: microcuencasError },
    { data: areaRows, error: areaError },
    { data: riversRows, error: riversError },
    { data: receptoresRows, error: receptoresError },
    { data: stationsRows, error: stationsError },
    { data: vegetationRows, error: vegetationError },
    { data: areaEfectivaRows, error: areaEfectivaError },
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
    supabase.rpc("get_microcuencas_for_project", { p_project_id: id }),
    supabase.rpc("get_area_estudio_for_project", { p_project_id: id }),
    supabase.rpc("get_rivers_for_project", { p_project_id: id, p_buffer_m: 5000 }),
    supabase.rpc("get_centros_poblados_for_project", { p_project_id: id, p_buffer_m: 5000 }),
    supabase.rpc("get_sampling_stations_for_project", { p_project_id: id }),
    supabase.rpc("get_vegetation_zones", { p_project_id: id, p_source: null }),
    supabase.rpc("get_area_efectiva_for_project", {
      p_project_id: id,
      p_buffer_m: 100,
    }),
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
  const microcuencas = (microcuencasRows ?? []) as MicrocuencaRow[];
  const areaRowsAll = (areaRows ?? []) as AreaEstudioRow[];
  const area = areaRowsAll[0] ?? null;

  const microcuencasFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: microcuencas.map((m) => ({
      type: "Feature",
      id: m.id,
      geometry: JSON.parse(m.geom_geojson) as GeoJSON.Geometry,
      properties: {
        pfafstetter: m.pfafstetter,
        nombre: m.nombre,
        nivel: m.nivel,
        area_km2: m.area_km2,
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
     id: number;
     code: string;
     name: string;
     source: string;
     area_ha: number;
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
         class_code: v.code,  // Map MINAM code to expected class_code
         class_name: v.name,  // Map MINAM name to expected class_name
         code: v.code,
         name: v.name,
         source: v.source,
         area_ha: v.area_ha,
       },
     })),
   };

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
    <div className="space-y-8">
      <header>
        <Link
          href="/projects"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Proyectos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {p.nombre_proyecto}
        </h1>
        <p className="text-sm text-stone-600">
          {p.clientes?.razon_social}
          {p.clientes?.ruc ? (
            <span className="text-stone-400"> · RUC {p.clientes.ruc}</span>
          ) : null}
        </p>
      </header>

      {/* Top row: project info + cliente info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Proyecto">
          <DefList
            items={[
              ["Ubicación", `${p.region} / ${p.provincia} / ${p.distrito}`],
              ["Código CM", p.codigo_cm ?? "—"],
              ["Área total", p.area_total_ha ? `${p.area_total_ha} ha` : "—"],
              ["UTM / Datum", `${p.zona_utm}S · ${p.datum ?? "WGS 84"}`],
              ["Commodity", p.commodity?.join(", ") ?? "—"],
              [
                "Método de exploración",
                p.metodo_exploracion?.join(", ") ?? "—",
              ],
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

      {/* Map */}
      <Card
        title={`Componentes georreferenciados (${geojson.features.length})`}
      >
        {featuresError ? (
          <p className="text-sm text-red-600">
            No se pudo cargar la geometría: {featuresError.message}
          </p>
        ) : geojson.features.length === 0 ? (
          <p className="text-sm text-stone-500">
            Sin geometría cargada para este proyecto.
          </p>
        ) : (
          <ProjectMap
            geojson={geojson}
            microcuencas={microcuencasFc}
            rivers={riversFc}
            receptores={receptoresFc}
            samplingStations={stationsFc}
            areaEstudio={areaFeature}
            areaEstudioStatus={area?.status ?? null}
            areaEfectiva={areaEfectivaFeature}
            vegetationZones={vegetationFc}
          />
        )}
        {(microcuencasError || areaError || areaEfectivaError || riversError || receptoresError || stationsError || vegetationError) ? (
          <p className="mt-2 text-xs text-amber-700">
            Error cargando capas: {
              microcuencasError?.message || areaError?.message ||
              areaEfectivaError?.message ||
              riversError?.message || receptoresError?.message ||
              stationsError?.message || vegetationError?.message
            }
          </p>
        ) : null}
      </Card>

      {/* Área efectiva — small footprint polygon (convex hull + buffer) */}
      {areaEfectiva ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-stone-700">Área efectiva</h2>
            <span className="text-xs text-stone-500">
              Convex hull + {areaEfectiva.buffer_m} m buffer
            </span>
          </div>
          <p className="mb-3 text-xs text-stone-500">
            Polígono mínimo que envuelve todos los componentes del proyecto.
            Es el footprint físico — distinto del área de estudio (regulatoria)
            y del área de influencia (basada en impactos, en una fase posterior).
          </p>
          <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
            <dt className="text-stone-500">Área</dt>
            <dd className="text-stone-900 tabular-nums">
              {areaEfectiva.area_ha.toLocaleString("es-PE", {
                maximumFractionDigits: 2,
              })}{" "}
              ha
            </dd>
            <dt className="text-stone-500">Buffer</dt>
            <dd className="text-stone-900 tabular-nums">
              {areaEfectiva.buffer_m} m
            </dd>
            <dt className="text-stone-500">Componentes</dt>
            <dd className="text-stone-900 tabular-nums">
              {areaEfectiva.components_count}
            </dd>
          </dl>
        </section>
      ) : null}

      {/* Área de estudio panel */}
      <AreaEstudioPanel
        area={area}
        microcuencas={microcuencas}
        projectId={id}
        hasComponents={geojson.features.length > 0}
        hasAreaEstudio={area !== null}
        receptores={receptores}
        stations={stations}
        componentCount={geojson.features.length}
        vegetationZones={vegetation.map((v) => ({
          id: String(v.id),
          class_code: v.code ?? "",
          class_name: v.name ?? "",
          area_ha: v.area_ha,
        }))}
      />

      {/* Reportes panel */}
      <ReportesPanel projectId={id} projectName={p.nombre_proyecto} />

      {/* Inventario by category — collapsed by default; native <details>
          gives free keyboard support and no client-component overhead. */}
      <Card title={`Inventario de componentes (${inv.length} filas)`}>
        <div className="space-y-2">
          {Object.entries(grouped).length === 0 ? (
            <p className="text-sm text-stone-500">Sin inventario.</p>
          ) : (
            Object.entries(grouped).map(([categoria, rows]) => {
              const totalQty = rows.reduce((sum, r) => sum + (r.cantidad ?? 0), 0);
              return (
                <details
                  key={categoria}
                  className="group rounded-md border border-stone-200 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-stone-50">
                    <span className="flex items-center gap-2">
                      <svg
                        aria-hidden
                        viewBox="0 0 12 12"
                        className="h-3 w-3 text-stone-400 transition-transform group-open:rotate-90"
                      >
                        <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium text-stone-700">
                        {CATEGORY_LABELS[categoria] ?? categoria}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-stone-500 tabular-nums">
                      <span>
                        {rows.length} {rows.length === 1 ? "ítem" : "ítems"}
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">
                        {totalQty} unid.
                      </span>
                    </span>
                  </summary>
                  <div className="overflow-hidden border-t border-stone-200">
                    <table className="min-w-full divide-y divide-stone-200 text-sm">
                      <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Componente</th>
                          <th className="px-3 py-2 text-right font-medium">
                            Cantidad
                          </th>
                          <th className="px-3 py-2 font-medium">Atributos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {rows.map((r) => (
                          <tr key={r.id}>
                            <td className="px-3 py-2 font-mono text-xs">
                              {r.componente}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.cantidad}
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {r.attrs && Object.keys(r.attrs).length > 0
                                ? Object.entries(r.attrs)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join("  ·  ")
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

      {/* Submissions */}
      <Card title={`RFI submissions (${subs.length})`}>
        {subs.length === 0 ? (
          <p className="text-sm text-stone-500">Sin envíos registrados.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-stone-200">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Plataformas
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Área</th>
                  <th className="px-3 py-2 font-medium">Warnings / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subs.map((s) => {
                  const ok = s.schema_ok && s.components_ingested && (s.errors?.length ?? 0) === 0;
                  return (
                    <tr key={s.id}>
                      <td className="px-3 py-2 text-stone-600">
                        {new Date(s.submitted_at).toLocaleString("es-PE")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            ok
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ok ? "GREEN" : "RED"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.declared_platforms ?? "—"} /{" "}
                        {s.actual_platforms ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.declared_area_ha ?? "—"} ha decl ·{" "}
                        {s.computed_area_ha ?? "—"} ha calc
                      </td>
                      <td className="px-3 py-2 text-stone-600">
                        {(s.warnings?.length ?? 0) > 0
                          ? `${s.warnings?.length} warnings`
                          : ""}
                        {(s.errors?.length ?? 0) > 0
                          ? ` · ${s.errors?.length} errors`
                          : ""}
                        {(s.warnings?.length ?? 0) +
                          (s.errors?.length ?? 0) ===
                        0
                          ? "Sin issues"
                          : ""}
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

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-stone-700">{title}</h2>
      {children}
    </section>
  );
}

function DefList({ items }: { items: [string, string | number | null][] }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-stone-500">{k}</dt>
          <dd className="text-stone-900">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
