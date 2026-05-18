import type {
  AreaEstudioRow,
  CentroPobladoRow,
  MicrocuencaRow,
  SamplingStationRow,
} from "@/lib/types";
import AreaEstudioActions from "@/components/AreaEstudioActions";

interface AreaEstudioPanelProps {
  /** Latest área de estudio row (approved if any, else most recent draft). */
  area: AreaEstudioRow | null;
  /** Microcuencas that intersect the project (independent of any draft). */
  microcuencas: MicrocuencaRow[];
  /** Centros poblados within the área de estudio + buffer. */
  receptores: CentroPobladoRow[];
  /** Proposed sampling stations (current draft + approved). */
  stations: SamplingStationRow[];
  /** Project UUID — passed to the actions for derive/upload/propose. */
  projectId: string;
  /** Whether the project has any components_geom rows. Disables Generate
   *  if empty. */
  hasComponents: boolean;
  /** Whether the project has an active área de estudio polygon. The
   *  "propose stations" button is gated on this. */
  hasAreaEstudio: boolean;
  /** Current number of components_geom rows. */
  componentCount: number;
  /** Vegetation zones from MINAM 2015 cobertura vegetal. */
  vegetationZones: VegetationZoneRow[];
}

interface VegetationZoneRow {
  id: string;
  class_code: string;
  class_name: string;
  area_ha: number;
}

const STATUS_LABEL: Record<AreaEstudioRow["status"], string> = {
  draft: "Borrador",
  approved: "Aprobada",
  superseded: "Reemplazada",
};

const STATUS_BADGE: Record<AreaEstudioRow["status"], string> = {
  draft: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  superseded: "bg-stone-100 text-stone-600",
};

const KIND_LABEL: Record<string, string> = {
  aire: "Aire",
  ruido: "Ruido",
  vibraciones: "Vibraciones",
  agua_superficial: "Agua superficial",
  agua_subterranea: "Agua subterránea",
  suelos: "Suelos",
  sedimentos: "Sedimentos",
};

const KIND_COLOR: Record<string, string> = {
  aire: "#10b981",
  ruido: "#a855f7",
  vibraciones: "#ef4444",
  agua_superficial: "#0ea5e9",
  agua_subterranea: "#0284c7",
  suelos: "#a16207",
  sedimentos: "#854d0e",
};

// MINAM 2015 Simbolo → color. Subset covers the common cobertura vegetal
// classes; unknown codes fall back to a neutral stone gray in the legend.
const VEG_CLASS_COLOR: Record<string, string> = {
  Pj: "#d4a017",
  Pjh: "#eab308",
  "Br-al": "#166534",
  "Br-me": "#15803d",
  Bp: "#14532d",
  "Bp-A": "#22c55e",
  "Bh-MBT": "#0f766e",
  "Bh-MBS": "#10b981",
  "Bh-T": "#059669",
  "Bs-mo": "#a16207",
  "Bs-MA": "#b45309",
  "Bs-T": "#92400e",
  Ma: "#84cc16",
  "Ma-DS": "#bef264",
  "Ma-T": "#4d7c0f",
  Bof: "#2dd4bf",
  "L/Co": "#38bdf8",
  Pa: "#14b8a6",
  Agri: "#f97316",
  Agro: "#fb923c",
  Cul: "#fdba74",
  Pc: "#65a30d",
  ZU: "#dc2626",
  Roq: "#71717a",
  D: "#fde68a",
  Lo: "#facc15",
  Tu: "#a78bfa",
  Gn: "#e0e7ff",
};

interface PanelStationGroup {
  kind: string;
  rows: SamplingStationRow[];
}

function groupStations(stations: SamplingStationRow[]): PanelStationGroup[] {
  const map = new Map<string, SamplingStationRow[]>();
  for (const s of stations) {
    const arr = map.get(s.kind) ?? [];
    arr.push(s);
    map.set(s.kind, arr);
  }
  const order = ["aire", "ruido", "vibraciones",
                 "agua_superficial", "agua_subterranea",
                 "suelos", "sedimentos"];
  return [...map.entries()]
    .map(([kind, rows]) => ({ kind, rows }))
    .sort((a, b) => {
      const ai = order.indexOf(a.kind);
      const bi = order.indexOf(b.kind);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

export default function AreaEstudioPanel({
  area,
  microcuencas,
  receptores,
  stations,
  projectId,
  hasComponents,
  hasAreaEstudio,
  componentCount,
  vegetationZones,
}: AreaEstudioPanelProps) {
  const stationGroups = groupStations(stations);
  const insideAE = receptores.filter((r) => r.inside_area_estudio).length;

  // Aggregate vegetation zones by class.
  const vegByClass = new Map<string, { name: string; area_ha: number; patches: number }>();
  for (const v of vegetationZones) {
    const existing = vegByClass.get(v.class_code);
    if (existing) {
      existing.area_ha += v.area_ha;
      existing.patches += 1;
    } else {
      vegByClass.set(v.class_code, { name: v.class_name, area_ha: v.area_ha, patches: 1 });
    }
  }
  const vegClasses = [...vegByClass.entries()]
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => b.area_ha - a.area_ha);
  const totalVegArea = vegClasses.reduce((s, v) => s + v.area_ha, 0);
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-700">
          Área de estudio
        </h2>
        {area ? (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[area.status]}`}
          >
            {STATUS_LABEL[area.status]}
          </span>
        ) : (
          <span className="text-xs text-stone-500">Sin generar</span>
        )}
      </div>

      <p className="mb-4 text-xs text-stone-500">
        Polígono base para ubicar las estaciones de muestreo de la línea base.
        No es el área de influencia (AID/AII), que se determina más adelante a
        partir de los impactos.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Polígono actual
          </h3>
          {area ? (
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-stone-500">Área</dt>
              <dd className="text-stone-900 tabular-nums">
                {area.area_ha.toLocaleString("es-PE", {
                  maximumFractionDigits: 1,
                })}{" "}
                ha
              </dd>
              <dt className="text-stone-500">Generado</dt>
              <dd className="text-stone-900">
                {new Date(area.generated_at).toLocaleString("es-PE")}
                <span className="ml-2 text-xs text-stone-500">
                  ({area.generated_by})
                </span>
              </dd>
              {area.approved_at ? (
                <>
                  <dt className="text-stone-500">Aprobado</dt>
                  <dd className="text-stone-900">
                    {new Date(area.approved_at).toLocaleString("es-PE")}
                  </dd>
                </>
              ) : null}
              <dt className="text-stone-500">Buffer receptor</dt>
              <dd className="text-stone-900 tabular-nums">
                {area.inputs_snapshot.receptor_buffer_m} m
              </dd>
              <dt className="text-stone-500">Drenaje</dt>
              <dd className="text-stone-900 font-mono text-xs">
                {area.inputs_snapshot.drainage_provider}
              </dd>
              <dt className="text-stone-500">Componentes</dt>
              <dd className="text-stone-900 tabular-nums">
                {area.inputs_snapshot.components_count}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-stone-500">
              Aún no se ha generado un polígono para este proyecto. Ejecutar:
              <code className="mt-2 block rounded bg-stone-100 px-2 py-1 font-mono text-xs">
                python skills/reference-layers/scripts/derive_area_estudio.py
                --project-id &lt;uuid&gt;
              </code>
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Metadatos de derivación
          </h3>
          {area && area.inputs_snapshot ? (
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-stone-500">Estrategia</dt>
              <dd className="text-stone-900 font-mono text-xs">
                {area.inputs_snapshot.strategy === "subbasin_envelope"
                  ? "Sub-cuencas (ridgelines)"
                  : area.inputs_snapshot.strategy === "buffer_drainage"
                    ? "Buffer + drenaje (legacy)"
                    : area.inputs_snapshot.strategy ?? "—"}
              </dd>
              {area.inputs_snapshot.strategy === "subbasin_envelope" ? (
                <>
                  <dt className="text-stone-500">Área objetivo</dt>
                  <dd className="text-stone-900 tabular-nums">
                    {area.inputs_snapshot.target_area_ha?.toLocaleString("es-PE", { maximumFractionDigits: 0 }) ?? "—"} ha
                  </dd>
                  <dt className="text-stone-500">Umbral de río</dt>
                  <dd className="text-stone-900 tabular-nums">
                    {area.inputs_snapshot.stream_threshold_cells ?? "—"} celdas
                  </dd>
                  <dt className="text-stone-500">Saltos vecinos máx</dt>
                  <dd className="text-stone-900 tabular-nums">
                    {area.inputs_snapshot.max_hops ?? "—"}
                  </dd>
                  <dt className="text-stone-500">Sub-cuencas usadas</dt>
                  <dd className="text-stone-900 tabular-nums">
                    {area.inputs_snapshot.n_subbasins_used ?? "—"}
                  </dd>
                  <dt className="text-stone-500">Saltos usados</dt>
                  <dd className="text-stone-900 tabular-nums">
                    {area.inputs_snapshot.hops_used ?? "—"}
                  </dd>
                </>
              ) : (
                <>
                  <dt className="text-stone-500">Buffer receptor</dt>
                  <dd className="text-stone-900 tabular-nums">
                    {area.inputs_snapshot.receptor_buffer_m != null
                      ? `${area.inputs_snapshot.receptor_buffer_m} m`
                      : "—"}
                  </dd>
                  <dt className="text-stone-500">Drenaje</dt>
                  <dd className="text-stone-900 font-mono text-xs">
                    {area.inputs_snapshot.drainage_provider ?? "—"}
                  </dd>
                  <dt className="text-stone-500">Microcuencas máx</dt>
                  <dd className="text-stone-900 tabular-nums">
                    {area.inputs_snapshot.max_microcuenca_area_km2 != null
                      ? `${area.inputs_snapshot.max_microcuenca_area_km2} km²`
                      : "—"}
                  </dd>
                  <dt className="text-stone-500">UH usadas</dt>
                  <dd className="text-stone-900 font-mono text-xs">
                    {(area.inputs_snapshot.microcuencas_used_pfafstetter?.length ?? 0) > 0
                      ? area.inputs_snapshot.microcuencas_used_pfafstetter!.join(", ")
                      : "—"}
                  </dd>
                </>
              )}
              <dt className="text-stone-500">CRS UTM</dt>
              <dd className="text-stone-900 font-mono text-xs">
                {area.inputs_snapshot.crs_utm ?? "—"}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-stone-500">Sin derivación ejecutada.</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Microcuencas intersectadas ({microcuencas.length})
          </h3>
          {microcuencas.length === 0 ? (
            <p className="text-sm text-stone-500">
              Ninguna microcuenca de <code>ref_microcuencas</code> intersecta los
              componentes. Verificar que la capa ANA Pfafstetter esté ingestada.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {microcuencas.map((m) => (
                <li
                  key={m.id}
                  className="flex items-baseline justify-between rounded border border-stone-200 px-2 py-1"
                >
                  <span className="font-mono text-xs">{m.pfafstetter}</span>
                  <span className="ml-2 flex-1 truncate text-stone-700">
                    {m.nombre ?? <span className="text-stone-400">sin nombre</span>}
                  </span>
                  <span className="ml-2 text-xs text-stone-500 tabular-nums">
                    N{m.nivel}
                    {m.area_km2 != null
                      ? ` · ${m.area_km2.toFixed(1)} km²`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Zonas de vegetación (MINAM 2015)
          </h3>
          {vegClasses.length === 0 ? (
            <p className="text-sm text-stone-500">
              Vegetación aún no calculada. Se deriva automáticamente al generar
              el área de estudio.
            </p>
          ) : (
            <div>
              <p className="mb-2 text-xs text-stone-500 tabular-nums">
                {vegClasses.length} clases · {totalVegArea.toFixed(1)} ha totales
              </p>
              <ul className="space-y-1 text-sm">
                {vegClasses.map((vc) => (
                  <li
                    key={vc.code}
                    className="flex items-baseline justify-between rounded border border-stone-200 px-2 py-1"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: VEG_CLASS_COLOR[vc.code] ?? "#78909c" }}
                      />
                      <span className="text-stone-700">{vc.name}</span>
                    </span>
                    <span className="text-xs text-stone-500 tabular-nums">
                      {vc.area_ha.toFixed(1)} ha
                      {vc.patches > 1 && <span className="ml-1">({vc.patches} parches)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Receptores sensibles + estaciones de muestreo ── */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <details className="rounded-md border border-stone-200 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-stone-50">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#ec4899" }}
              />
              <span className="font-medium text-stone-700">
                Receptores sensibles
              </span>
            </span>
            <span className="text-xs text-stone-500 tabular-nums">
              {receptores.length} en buffer · {insideAE} en AE
            </span>
          </summary>
          <div className="border-t border-stone-200 px-3 py-2 text-xs">
            {receptores.length === 0 ? (
              <p className="text-stone-500">
                Ningún centro poblado dentro del área de estudio + 5 km.
                Verificar que la capa CCPP (INEI/IGN) esté ingestada.
              </p>
            ) : (
              <ul className="max-h-60 space-y-1 overflow-auto">
                {receptores.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-baseline justify-between gap-2 border-b border-stone-100 pb-1 last:border-b-0"
                  >
                    <span className="flex items-baseline gap-2 truncate">
                      <span className="text-stone-800">{r.nombre}</span>
                      {r.inside_area_estudio && (
                        <span className="rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-medium text-emerald-800">
                          AE
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {r.categoria_poblado ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>

        <details className="rounded-md border border-stone-200 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-stone-50">
            <span className="flex items-center gap-2">
              <span aria-hidden className="inline-flex items-center gap-0.5">
                {stationGroups.slice(0, 4).map((g) => (
                  <span
                    key={g.kind}
                    className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white"
                    style={{
                      backgroundColor: KIND_COLOR[g.kind] ?? "#1f2937",
                    }}
                  />
                ))}
                {stationGroups.length === 0 && (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-stone-300" />
                )}
              </span>
              <span className="font-medium text-stone-700">
                Estaciones de muestreo
              </span>
            </span>
            <span className="text-xs text-stone-500 tabular-nums">
              {stations.length} {stations.length === 1 ? "estación" : "estaciones"}
            </span>
          </summary>
          <div className="border-t border-stone-200 px-3 py-2 text-xs">
            {stationGroups.length === 0 ? (
              <p className="text-stone-500">
                Sin estaciones propuestas. Generá el área de estudio y luego
                presioná &ldquo;Proponer estaciones&rdquo; abajo.
              </p>
            ) : (
              <ul className="space-y-2">
                {stationGroups.map((g) => (
                  <li key={g.kind}>
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: KIND_COLOR[g.kind] ?? "#1f2937",
                        }}
                      />
                      <span className="font-medium text-stone-700">
                        {KIND_LABEL[g.kind] ?? g.kind}
                      </span>
                      <span className="text-stone-500 tabular-nums">
                        ({g.rows.length})
                      </span>
                    </div>
                    <ul className="ml-4 space-y-0.5">
                      {g.rows.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-baseline justify-between"
                        >
                          <span className="font-mono text-[11px] text-stone-700">
                            {s.station_code}
                          </span>
                          <span className="truncate text-stone-500">
                            {s.target_receptor_nombre ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>

      <div className="mt-5">
        <AreaEstudioActions
          projectId={projectId}
          hasComponents={hasComponents}
          hasAreaEstudio={hasAreaEstudio}
          componentCount={componentCount}
          lastDeriveComponentCount={area?.inputs_snapshot.components_count ?? null}
        />
      </div>
    </section>
  );
}
