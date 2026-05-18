"use client";

import { useState } from "react";
import type { SocialBaselineRow } from "@/lib/inei/types";

interface Props {
  projectId: string;
  initial: SocialBaselineRow | null;
  resolvedUbigeo: string | null;
  distrito: string;
  provincia: string;
  region: string;
}

type ScrapeStatus = "idle" | "loading" | "done" | "error";

export default function SocialBaselinePanel({
  projectId,
  initial,
  resolvedUbigeo,
  distrito,
  provincia,
  region,
}: Props) {
  const [data, setData] = useState<SocialBaselineRow | null>(initial);
  const [status, setStatus] = useState<ScrapeStatus>("idle");
  const [sources, setSources] = useState<string[]>([]);
  const [scrapeErrors, setScrapeErrors] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function runScrape() {
    setStatus("loading");
    setErrorMsg(null);
    setScrapeErrors([]);
    try {
      const res = await fetch(`/api/projects/${projectId}/social-baseline`, {
        method: "POST",
      });
      const json = await res.json() as {
        data?: SocialBaselineRow;
        sourcesHit?: string[];
        scrapeErrors?: string[];
        error?: string;
      };
      if (!res.ok || json.error) {
        setErrorMsg(json.error ?? "Error al consultar INEI.");
        setStatus("error");
        return;
      }
      setData(json.data ?? null);
      setSources(json.sourcesHit ?? []);
      setScrapeErrors(json.scrapeErrors ?? []);
      setStatus("done");
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  const ubigeo = data?.ubigeo ?? resolvedUbigeo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-700">
              Línea base social — distrito de {distrito}
            </h2>
            <p className="mt-1 text-xs text-stone-400">
              {provincia} · {region}
              {ubigeo ? (
                <span className="ml-2 font-mono">UBIGEO {ubigeo}</span>
              ) : null}
            </p>
            {data?.fetched_at ? (
              <p className="mt-1 text-[11px] text-stone-400">
                Datos INEI al{" "}
                {new Date(data.fetched_at).toLocaleDateString("es-PE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={runScrape}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {status === "loading" ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Consultando INEI…
              </>
            ) : data ? (
              "Actualizar de INEI"
            ) : (
              "Obtener datos de INEI"
            )}
          </button>
        </div>

        {/* Source badges */}
        {sources.length > 0 && status === "done" && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <span
                key={s}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200"
              >
                ✓ {s}
              </span>
            ))}
          </div>
        )}

        {scrapeErrors.length > 0 && (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            <p className="font-semibold">Fuentes parciales:</p>
            <ul className="mt-1 list-disc pl-4">
              {scrapeErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
            {errorMsg}
          </div>
        )}

        {!ubigeo && (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            El distrito <strong>{distrito}</strong> no está en la tabla{" "}
            <code>ref_distritos</code>. La capa de límites distritales (INEI 2023)
            debe estar ingestada para que el UBIGEO se resuelva automáticamente.
          </div>
        )}

        {!data && status !== "loading" && (
          <p className="mt-4 text-sm text-stone-400">
            Presioná <em>Obtener datos de INEI</em> para importar la estadística
            distrital del Censo 2017 y fuentes complementarias.
          </p>
        )}
      </div>

      {/* Data grid */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="Demografía" icon="👥" fuente={data.demografia?.fuente}>
            <Row label="Población total" value={fmt(data.demografia?.poblacion_total, "hab")} />
            <Row label="Urbana" value={pct(data.demografia?.pct_urbana)} />
            <Row label="Rural" value={pct(data.demografia?.pct_urbana !== null ? 100 - (data.demografia?.pct_urbana ?? 0) : null)} />
            <Row label="Hombres" value={fmt(data.demografia?.hombres, "hab")} />
            <Row label="Mujeres" value={fmt(data.demografia?.mujeres, "hab")} />
            <Row label="Relación masculinidad" value={data.demografia?.relacion_masculinidad != null ? `${data.demografia.relacion_masculinidad.toFixed(1)} H/100M` : null} />
            <Row label="Densidad" value={data.demografia?.densidad_hab_km2 != null ? `${data.demografia.densidad_hab_km2.toFixed(1)} hab/km²` : null} />
            <Row label="Tasa crecimiento intercensal" value={pct(data.demografia?.tasa_crecimiento_pct)} />
            <Row label="0–14 años" value={pct(data.demografia?.pct_0_14)} />
            <Row label="15–64 años" value={pct(data.demografia?.pct_15_64)} />
            <Row label="65+ años" value={pct(data.demografia?.pct_65_mas)} />
          </Card>

          <Card title="Educación" icon="📚" fuente={data.educacion?.fuente}>
            <Row label="Analfabetismo (15+)" value={pct(data.educacion?.tasa_analfabetismo_pct)} />
            <Row label="Asistencia primaria" value={pct(data.educacion?.tasa_asistencia_primaria_pct)} />
            <Row label="Asistencia secundaria" value={pct(data.educacion?.tasa_asistencia_secundaria_pct)} />
            <Row label="Sin nivel educativo" value={pct(data.educacion?.pct_sin_nivel_educativo)} />
            <Row label="Nivel primario" value={pct(data.educacion?.pct_primaria)} />
            <Row label="Nivel secundario" value={pct(data.educacion?.pct_secundaria)} />
            <Row label="Nivel superior" value={pct(data.educacion?.pct_superior)} />
          </Card>

          <Card title="Salud" icon="🏥" fuente={data.salud?.fuente}>
            <Row label="Con seguro de salud" value={pct(data.salud?.pct_con_seguro)} />
            <Row label="SIS" value={pct(data.salud?.pct_sis)} />
            <Row label="EsSalud" value={pct(data.salud?.pct_essalud)} />
            <Row label="Mortalidad infantil" value={data.salud?.tasa_mortalidad_infantil != null ? `${data.salud.tasa_mortalidad_infantil.toFixed(1)} ‰` : null} />
            <Row label="Desnutrición crónica infantil" value={pct(data.salud?.tasa_desnutricion_cronica_pct)} />
            <Row label="Establec. de salud" value={data.salud?.n_establecimientos_salud != null ? String(data.salud.n_establecimientos_salud) : null} />
          </Card>

          <Card title="Vivienda y servicios básicos" icon="🏠" fuente={data.vivienda?.fuente}>
            <Row label="Viviendas totales" value={fmt(data.vivienda?.n_viviendas, "viv.")} />
            <Row label="Agua red pública" value={pct(data.vivienda?.pct_agua_red_publica)} />
            <Row label="Desagüe red pública" value={pct(data.vivienda?.pct_desague_red_publica)} />
            <Row label="Electricidad" value={pct(data.vivienda?.pct_electricidad)} />
            <Row label="Pared material noble" value={pct(data.vivienda?.pct_pared_material_noble)} />
            <Row label="Piso cemento o mejor" value={pct(data.vivienda?.pct_piso_cemento_o_mejor)} />
          </Card>

          <Card title="Economía y pobreza" icon="📊" fuente={data.economia?.fuente}>
            <Row label="PEA total" value={fmt(data.economia?.pea_total, "pers.")} />
            <Row label="PEA ocupada" value={fmt(data.economia?.pea_ocupada, "pers.")} />
            <Row label="Sector primario" value={pct(data.economia?.pct_sector_primario)} />
            <Row label="Sector secundario" value={pct(data.economia?.pct_sector_secundario)} />
            <Row label="Sector terciario" value={pct(data.economia?.pct_sector_terciario)} />
            <Row label="Pobreza total" value={pct(data.economia?.pct_pobreza_total)} />
            <Row label="Pobreza extrema" value={pct(data.economia?.pct_pobreza_extrema)} />
          </Card>

          <Card title="Índices de desarrollo" icon="📈" fuente={data.indices?.fuente}>
            <Row label="IDH" value={data.indices?.idh != null ? data.indices.idh.toFixed(4) : null} />
            <Row label="Año IDH" value={data.indices?.idh_anno != null ? String(data.indices.idh_anno) : null} />
            <Row label="IPM" value={data.indices?.ipm != null ? data.indices.ipm.toFixed(4) : null} />
            <Row label="Año IPM" value={data.indices?.ipm_anno != null ? String(data.indices.ipm_anno) : null} />
          </Card>
        </div>
      )}

      {/* Sources footer */}
      {data?.fuentes && data.fuentes.length > 0 && (
        <p className="text-[11px] text-stone-400">
          <span className="font-medium text-stone-500">Fuentes:</span>{" "}
          {data.fuentes.join(" · ")}
        </p>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Card({
  title,
  icon,
  fuente,
  children,
}: {
  title: string;
  icon: string;
  fuente?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        <span aria-hidden>{icon}</span>
        {title}
      </h3>
      <dl className="space-y-1.5">{children}</dl>
      {fuente && (
        <p className="mt-3 text-[10px] text-stone-400">Fuente: {fuente}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-stone-100 pb-1 last:border-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="font-mono text-xs text-stone-900 tabular-nums">
        {value ?? <span className="text-stone-300">—</span>}
      </dd>
    </div>
  );
}

// ── Formatters ──────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, unit: string): string | null {
  if (n == null) return null;
  return `${n.toLocaleString("es-PE")} ${unit}`;
}

function pct(n: number | null | undefined): string | null {
  if (n == null) return null;
  return `${n.toFixed(1)}%`;
}
