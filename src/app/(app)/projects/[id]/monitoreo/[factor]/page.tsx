"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FACTOR_DEFS,
  FACTOR_DEFS_MAP,
  FACTOR_STYLES,
  type FactorKind,
} from "@/lib/monitoreo/eca-registry";
import {
  computeCompleteness,
  getActiveParams,
  summarizeExceedances,
} from "@/lib/monitoreo/factor-checks";
import {
  generateMonitoreoDocx,
  downloadDocx,
} from "@/lib/monitoreo/docx-generator";
import MonitoreoMatrix, { type MatrixStation } from "@/components/MonitoreoMatrix";
import EcaReferenceCards from "@/components/EcaReferenceCards";
import MonitoreoImportModal from "@/components/MonitoreoImportModal";
import KpiTile from "../_components/KpiTile";
import CompletenessBar from "../_components/CompletenessBar";
import ExceedanceSummary from "../_components/ExceedanceSummary";
import ParamsTable from "../_components/ParamsTable";
import MonitoreoHeader from "../_components/MonitoreoHeader";
import FactorTabs from "../_components/FactorTabs";
import Pill from "../_components/Pill";

type MeasurementCampaign = "linea_base" | "construccion" | "operacion" | "cierre";

const CAMPAIGN_LABELS: Record<MeasurementCampaign, string> = {
  linea_base: "Línea Base",
  construccion: "Construcción",
  operacion: "Operación",
  cierre: "Cierre",
};

const VALID_FACTORS = new Set<FactorKind>([
  "aire",
  "agua_superficial",
  "agua_subterranea",
  "ruido",
  "suelos",
  "sedimentos",
  "vibraciones",
]);

interface StationRow {
  id: string;
  project_id: string;
  station_code: string;
  kind: string;
  target_receptor_nombre: string | null;
  datum: string | null;
  utm_zone: string | null;
  coord_este: number | null;
  coord_norte: number | null;
  altitud_m: number | null;
  campaign: string | null;
}

interface MeasurementRow {
  id: string;
  station_id: string;
  station_code: string;
  campaign: string;
  measurement_date: string;
  parameters: Record<string, { value: number; unit: string }>;
  eca_compliance: Record<
    string,
    { compliant: boolean; threshold: number; value: number }
  >;
}

const STEPS = [
  { id: "project",  label: "Proyecto",   icon: "📋" },
  { id: "norm",     label: "Normativa",  icon: "⚖️" },
  { id: "stations", label: "Estaciones", icon: "📍" },
  { id: "params",   label: "Parámetros", icon: "🔬" },
  { id: "results",  label: "Resultados", icon: "📊" },
  { id: "resumen",  label: "Resumen",    icon: "✨" },
];

function isValidCampaign(v: string | null): v is MeasurementCampaign {
  return v === "linea_base" || v === "construccion" || v === "operacion" || v === "cierre";
}

export default function MonitoreoFactorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const factorParam = params.factor as string;

  if (!VALID_FACTORS.has(factorParam as FactorKind)) {
    notFound();
  }
  const factor = factorParam as FactorKind;
  const factorDef = FACTOR_DEFS_MAP[factor];
  const style = FACTOR_STYLES[factor];

  const initialCampaign = searchParams.get("campaign");
  const [campaign, setCampaign] = useState<MeasurementCampaign>(
    isValidCampaign(initialCampaign) ? initialCampaign : "linea_base",
  );

  const supabase = createClient();
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [stations, setStations] = useState<StationRow[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [docxLoading, setDocxLoading] = useState(false);

  const [step, setStep] = useState(0);
  const [showImport, setShowImport] = useState(false);

  const [projInfo, setProjInfo] = useState({
    lab: "",
    acreditacion: "",
    fecha: "",
    desc: "",
    instrumento: "DIA",
    numeroServicios: "",
    rD: "",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, campaign]);

  async function loadData() {
    setLoading(true);
    const [projRes, stationRes, measRes] = await Promise.all([
      supabase
        .from("projects")
        .select("nombre_proyecto, clientes(razon_social)")
        .eq("id", projectId)
        .single(),
      supabase.from("project_sampling_stations").select("*").eq("project_id", projectId),
      supabase.rpc("get_measurements_for_project", {
        p_project_id: projectId,
        p_campaign: campaign,
      }),
    ]);
    if (projRes.data) {
      setProjectName(projRes.data.nombre_proyecto ?? "");
      setClientName(
        (projRes.data.clientes as { razon_social?: string } | null)?.razon_social ?? "",
      );
    }
    if (stationRes.data) setStations(stationRes.data as StationRow[]);
    if (measRes.data) setMeasurements(measRes.data as MeasurementRow[]);
    setLoading(false);
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const factorStations: MatrixStation[] = useMemo(
    () =>
      stations
        .filter((s) => s.kind === factor)
        .map((s) => ({
          id: s.id,
          code: s.station_code,
          campaign: s.campaign ?? CAMPAIGN_LABELS[campaign],
          date: "",
          datum: s.datum ?? "WGS84",
          zona: s.utm_zone ?? "",
          este: s.coord_este ?? undefined,
          norte: s.coord_norte ?? undefined,
          alt: s.altitud_m ?? undefined,
          desc: s.target_receptor_nombre ?? undefined,
        })),
    [stations, factor, campaign],
  );

  const results = useMemo(() => {
    const out: Record<string, Record<string, string | number>> = {};
    for (const m of measurements) {
      const sta = stations.find((s) => s.id === m.station_id);
      const code = sta?.station_code ?? m.station_code;
      if (!out[code]) out[code] = {};
      for (const [paramId, paramData] of Object.entries(m.parameters)) {
        out[code][paramId] = paramData.value;
      }
    }
    return out;
  }, [measurements, stations]);

  // Annotate matrix stations with their measurement date
  const factorStationsWithDate: MatrixStation[] = useMemo(() => {
    return factorStations.map((s) => {
      const m = measurements.find((mm) => {
        const sta = stations.find((x) => x.id === mm.station_id);
        return (sta?.station_code ?? mm.station_code) === s.code;
      });
      return { ...s, date: m?.measurement_date?.split("T")[0] ?? "" };
    });
  }, [factorStations, measurements, stations]);

  const stationCodes = factorStationsWithDate.map((s) => s.code);
  const activeParams = getActiveParams(factor);
  const exceedances = summarizeExceedances({
    factor,
    stationCodes,
    results,
  });
  const completeness = computeCompleteness({
    factor,
    stationCodes,
    results,
  });

  // Cross-factor exceedance badges for the tab strip — uses the all-stations and
  // all-measurements payload already loaded on the page.
  const factorBadges = useMemo(() => {
    const badges: Partial<Record<FactorKind, number>> = {};
    for (const f of FACTOR_DEFS) {
      const fStations = stations.filter((s) => s.kind === f.id);
      const fCodes = fStations.map((s) => s.station_code);
      const fResults: Record<string, Record<string, string | number>> = {};
      for (const m of measurements) {
        const sta = stations.find((s) => s.id === m.station_id);
        if (sta?.kind !== f.id) continue;
        const code = sta.station_code;
        if (!fResults[code]) fResults[code] = {};
        for (const [paramId, paramData] of Object.entries(m.parameters)) {
          fResults[code][paramId] = paramData.value;
        }
      }
      const ex = summarizeExceedances({
        factor: f.id,
        stationCodes: fCodes,
        results: fResults,
      });
      badges[f.id] = ex.length;
    }
    return badges;
  }, [stations, measurements]);

  const completitudPct =
    completeness.total === 0 ? 0 : Math.round(completeness.ratio * 100);

  // ── Mutations ─────────────────────────────────────────────────────────────
  async function handleCellChange(stationCode: string, paramId: string, value: string) {
    if (!value || isNaN(parseFloat(value))) return;
    const sta = stations.find((s) => s.station_code === stationCode);
    if (!sta) return;
    const numericVal = parseFloat(value);
    await supabase.rpc("insert_station_measurement", {
      p_station_id: sta.id,
      p_campaign: campaign,
      p_measurement_date: new Date().toISOString().split("T")[0],
      p_parameters: { [paramId]: { value: numericVal, unit: "" } },
      p_notes: null,
    });
    await loadData();
  }

  async function handleImportResults(
    rows: { stationCode: string; paramId: string; value: number; unit: string; date: string }[],
  ) {
    let inserted = 0;
    for (const row of rows) {
      const sta = stations.find((s) => s.station_code === row.stationCode);
      if (!sta) continue;
      const { error } = await supabase.rpc("insert_station_measurement", {
        p_station_id: sta.id,
        p_campaign: campaign,
        p_measurement_date: row.date || new Date().toISOString().split("T")[0],
        p_parameters: { [row.paramId]: { value: row.value, unit: row.unit } },
        p_notes: "Importado desde archivo",
      });
      if (!error) inserted++;
    }
    if (inserted > 0) await loadData();
  }

  async function handleExportDocx() {
    setDocxLoading(true);
    try {
      const stationsWithDates = factorStationsWithDate.map((s) => ({
        ...s,
        date: s.date || new Date().toISOString().split("T")[0],
      }));
      const blob = await generateMonitoreoDocx({
        factor: factorDef,
        projectInfo: {
          nombre: projectName,
          cliente: clientName,
          instrumento: projInfo.instrumento,
          numeroServicios: projInfo.numeroServicios,
          fecha: projInfo.fecha,
          rD: projInfo.rD,
          lab: projInfo.lab,
          acreditacion: projInfo.acreditacion,
          desc: projInfo.desc,
        },
        stations: stationsWithDates,
        params: [],
        results,
      });
      const slug = projectName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const filename = `INSIDEO_${factorDef.section}_${factorDef.sectionTitle.replace(/\s+/g, "_")}_${slug}.docx`;
      downloadDocx(blob, filename);
    } catch (e) {
      console.error("DOCX generation failed:", e);
      alert("Error generando DOCX: " + String(e));
    }
    setDocxLoading(false);
  }

  function handleExportJson() {
    const payload = {
      factor: factorDef,
      campaign,
      projectInfo: {
        nombre: projectName,
        cliente: clientName,
        ...projInfo,
      },
      stations: factorStationsWithDate,
      params: activeParams,
      results,
      exceedances,
      completeness,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (projectName || "proyecto")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    a.href = url;
    a.download = `INSIDEO_${factor}_${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stepComplete = (i: number): boolean => {
    switch (i) {
      case 0: return !!projectName;
      case 1: return true;
      case 2: return factorStationsWithDate.length > 0;
      case 3: return true;
      case 4: return Object.values(results).some((r) => Object.keys(r).length > 0);
      case 5: return completeness.filled > 0;
      default: return false;
    }
  };

  const importStations = stations
    .filter((s) => s.kind === factor)
    .map((s) => ({ id: s.id, code: s.station_code }));

  const importParams = activeParams.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <MonitoreoHeader
        breadcrumbs={[
          { label: "Proyectos", href: "/projects" },
          { label: projectName || "Proyecto", href: `/projects/${projectId}` },
          { label: "Resultados de Monitoreo", href: `/projects/${projectId}/monitoreo` },
          { label: factorDef.label },
        ]}
        title={factorDef.sectionTitle}
        titleIcon={<span style={{ color: style.accent }}>{style.icon}</span>}
        subtitle={
          <>
            {clientName && <span>{clientName}</span>}
            {clientName && <span className="text-stone-300"> · </span>}
            <span className="text-stone-400">{factorDef.decree}</span>
          </>
        }
        pills={
          <>
            <Pill icon="📅" tone="neutral">
              Campaña: {CAMPAIGN_LABELS[campaign]}
            </Pill>
            <Pill icon="📍" tone="neutral">
              {factorStationsWithDate.length} estaciones
            </Pill>
            <Pill icon="🔬" tone="neutral">
              {activeParams.length} parámetros
            </Pill>
            <Pill
              icon="📈"
              tone={completitudPct >= 80 ? "ok" : completitudPct >= 40 ? "warn" : "neutral"}
            >
              Completitud {completitudPct}%
            </Pill>
            <Pill
              dotColor={exceedances.length > 0 ? "#dc2626" : "#10b981"}
              tone={exceedances.length > 0 ? "danger" : "ok"}
            >
              {exceedances.length > 0
                ? `${exceedances.length} excedencias`
                : "Sin excedencias"}
            </Pill>
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <span aria-hidden>⤓</span>
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button
              type="button"
              onClick={handleExportDocx}
              disabled={docxLoading || factorStationsWithDate.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              <span aria-hidden>📄</span>
              <span>{docxLoading ? "Generando…" : "Exportar DOCX"}</span>
            </button>
          </>
        }
      />

      <FactorTabs
        projectId={projectId}
        active={factor}
        campaign={campaign}
        badges={factorBadges}
      />

      {/* Campaign selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-stone-600">Cambiar campaña:</span>
        {Object.entries(CAMPAIGN_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCampaign(key as MeasurementCampaign)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              campaign === key
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step navigation */}
      <div className="flex items-center gap-0 rounded-lg border border-stone-200 bg-white overflow-hidden shadow-sm">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = !active && stepComplete(i);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium transition-colors relative ${
                active
                  ? "bg-stone-900 text-white"
                  : done
                  ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                  : "bg-white text-stone-400 hover:bg-stone-50"
              }`}
            >
              <span>{done ? "✓" : s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
              {i < STEPS.length - 1 && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-300 text-lg leading-none hidden sm:block">
                  ›
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[300px] rounded-lg border border-stone-200 bg-white p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-stone-400">Cargando…</span>
          </div>
        ) : (
          <>
            {step === 0 && (
              <div className="max-w-2xl space-y-4">
                <h2 className="text-lg font-bold text-stone-800">Información del Proyecto</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nombre del Proyecto">
                    <input type="text" value={projectName} readOnly className={READ_ONLY_INPUT} />
                  </Field>
                  <Field label="Cliente">
                    <input type="text" value={clientName} readOnly className={READ_ONLY_INPUT} />
                  </Field>
                  <Field label="Instrumento de Gestión">
                    <select
                      value={projInfo.instrumento}
                      onChange={(e) => setProjInfo({ ...projInfo, instrumento: e.target.value })}
                      className={EDIT_INPUT}
                    >
                      <option value="DIA">DIA</option>
                      <option value="EIA">EIA</option>
                      <option value="EIA-sd">EIA-sd</option>
                      <option value="ITS">ITS</option>
                      <option value="PAMA">PAMA</option>
                    </select>
                  </Field>
                  <Field label="N° de Servicios">
                    <input
                      type="text"
                      value={projInfo.numeroServicios}
                      onChange={(e) => setProjInfo({ ...projInfo, numeroServicios: e.target.value })}
                      placeholder="Ej. INSIDEO-2024-001"
                      className={EDIT_INPUT}
                    />
                  </Field>
                  <Field label="Fecha de Monitoreo">
                    <input
                      type="date"
                      value={projInfo.fecha}
                      onChange={(e) => setProjInfo({ ...projInfo, fecha: e.target.value })}
                      className={EDIT_INPUT}
                    />
                  </Field>
                  <Field label="Resolución Directoral (R.D.)">
                    <input
                      type="text"
                      value={projInfo.rD}
                      onChange={(e) => setProjInfo({ ...projInfo, rD: e.target.value })}
                      placeholder="Ej. R.D. N° 123-2024-MINEM/DGAAM"
                      className={EDIT_INPUT}
                    />
                  </Field>
                  <Field label="Laboratorio">
                    <input
                      type="text"
                      value={projInfo.lab}
                      onChange={(e) => setProjInfo({ ...projInfo, lab: e.target.value })}
                      placeholder="Ej. ALAB E.I.R.L."
                      className={EDIT_INPUT}
                    />
                  </Field>
                  <Field label="Acreditación">
                    <input
                      type="text"
                      value={projInfo.acreditacion}
                      onChange={(e) => setProjInfo({ ...projInfo, acreditacion: e.target.value })}
                      placeholder="Ej. INACAL"
                      className={EDIT_INPUT}
                    />
                  </Field>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Descripción</label>
                    <textarea
                      value={projInfo.desc}
                      onChange={(e) => setProjInfo({ ...projInfo, desc: e.target.value })}
                      rows={2}
                      placeholder="Descripción del monitoreo"
                      className={EDIT_INPUT}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-stone-800 mb-4">Marco Normativo</h2>
                <EcaReferenceCards factor={factor} />
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-stone-800 mb-4">Estaciones de Monitoreo</h2>
                {factorStationsWithDate.length === 0 ? (
                  <EmptyState
                    primary={`No hay estaciones de ${factorDef.label.toLowerCase()} para este proyecto.`}
                    secondary="Ve a la pestaña de estaciones del proyecto para crear estaciones de monitoreo."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-stone-200">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-stone-900">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">Código</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">Receptor</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">Datum</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">Zona UTM</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-white">Este</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-white">Norte</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-white">Altitud (m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factorStationsWithDate.map((s, i) => (
                          <tr key={s.code} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                            <td className="px-3 py-2 font-medium text-stone-800 border-t border-stone-100">{s.code}</td>
                            <td className="px-3 py-2 text-stone-600 border-t border-stone-100">{s.desc || "–"}</td>
                            <td className="px-3 py-2 text-stone-600 border-t border-stone-100">{s.datum || "WGS84"}</td>
                            <td className="px-3 py-2 text-stone-600 border-t border-stone-100">{s.zona || "–"}</td>
                            <td className="px-3 py-2 text-right text-stone-600 border-t border-stone-100 tabular-nums">{s.este ?? "–"}</td>
                            <td className="px-3 py-2 text-right text-stone-600 border-t border-stone-100 tabular-nums">{s.norte ?? "–"}</td>
                            <td className="px-3 py-2 text-right text-stone-600 border-t border-stone-100 tabular-nums">{s.alt ?? "–"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-stone-50 border-t border-stone-200 text-xs text-stone-500">
                      {factorStationsWithDate.length} estación(es)
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-stone-800">Parámetros de Monitoreo</h2>
                <p className="text-sm text-stone-500">
                  Umbrales ECA por categoría/zona/período. Las columnas resaltadas reflejan el filtro
                  activo en la matriz de resultados.
                </p>
                <ParamsTable factor={factor} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-stone-800">Matriz de Resultados</h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImport(true)}
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      Importar XLSX/CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDocx}
                      disabled={docxLoading || factorStationsWithDate.length === 0}
                      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {docxLoading ? "Generando…" : "Exportar DOCX"}
                    </button>
                  </div>
                </div>

                {factorStationsWithDate.length === 0 ? (
                  <EmptyState
                    primary={`No hay estaciones de ${factorDef.label.toLowerCase()} para este proyecto.`}
                  />
                ) : (
                  <>
                    <CompletenessBar
                      filled={completeness.filled}
                      total={completeness.total}
                      accent={style.accent}
                    />
                    <MonitoreoMatrix
                      factor={factor}
                      stations={factorStationsWithDate}
                      results={results}
                      onCellChange={handleCellChange}
                    />
                  </>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-stone-800">Resumen y Exportación</h2>

                {/* KPI strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiTile
                    label="Estaciones"
                    value={factorStationsWithDate.length}
                    icon="📍"
                    accent={style.accent}
                  />
                  <KpiTile
                    label="Parámetros activos"
                    value={activeParams.length}
                    icon="🔬"
                    accent={style.accent}
                  />
                  <KpiTile
                    label="Completitud"
                    value={`${Math.round(completeness.ratio * 100)}%`}
                    hint={`${completeness.filled} / ${completeness.total} celdas`}
                    icon="📈"
                    accent={style.accent}
                  />
                  <KpiTile
                    label="Excedencias"
                    value={exceedances.length}
                    icon={exceedances.length > 0 ? "⚠" : "✓"}
                    accent={exceedances.length > 0 ? "#b91c1c" : "#15803d"}
                  />
                </div>

                <CompletenessBar
                  filled={completeness.filled}
                  total={completeness.total}
                  accent={style.accent}
                />

                <ExceedanceSummary items={exceedances} />

                {/* Export panel */}
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <h3 className="text-sm font-semibold text-stone-800 mb-2">Exportar</h3>
                  <p className="text-xs text-stone-500 mb-3">
                    Descarga el reporte para anexar al instrumento de gestión ambiental, o exporta
                    el dataset crudo en JSON para respaldos y reimportaciones.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleExportDocx}
                      disabled={docxLoading || factorStationsWithDate.length === 0}
                      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {docxLoading ? "Generando…" : "Exportar DOCX"}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Descargar JSON
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-30"
          >
            ← Anterior
          </button>
          <div className="text-xs text-stone-400">
            Paso {step + 1} de {STEPS.length}
          </div>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      )}

      {showImport && (
        <MonitoreoImportModal
          stations={importStations}
          params={importParams}
          campaign={campaign}
          onImport={handleImportResults}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

const READ_ONLY_INPUT =
  "w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700";
const EDIT_INPUT =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-stone-600">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-stone-300 py-12 text-center">
      <p className="text-stone-500">{primary}</p>
      {secondary && <p className="mt-1 text-sm text-stone-400">{secondary}</p>}
    </div>
  );
}
