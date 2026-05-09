"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FACTOR_DEFS,
  AIRE_PARAMS,
  AGUA_MULTI_PARAMS,
  AGUA_SINGLE_PARAMS,
  RUIDO_PARAMS,
  SUELOS_PARAMS,
  SEDIMENTOS_PARAMS,
  AGUA_SUB_PARAMS,
  type FactorKind,
  type FactorDef,
} from "@/lib/monitoreo/eca-registry";
import {
  generateMonitoreoDocx,
  downloadDocx,
} from "@/lib/monitoreo/docx-generator";
import MonitoreoMatrix, { type MatrixStation } from "@/components/MonitoreoMatrix";
import EcaReferenceCards from "@/components/EcaReferenceCards";
import MonitoreoImportModal from "@/components/MonitoreoImportModal";

type MeasurementCampaign = "linea_base" | "construccion" | "operacion" | "cierre";

const CAMPAIGN_LABELS: Record<MeasurementCampaign, string> = {
  linea_base: "Línea Base",
  construccion: "Construcción",
  operacion: "Operación",
  cierre: "Cierre",
};

const FACTOR_COLORS: Record<FactorKind, string> = {
  aire:              "bg-blue-100 text-blue-800 border-blue-200",
  agua_superficial:  "bg-sky-100 text-sky-800 border-sky-200",
  agua_subterranea:  "bg-indigo-100 text-indigo-800 border-indigo-200",
  ruido:             "bg-amber-100 text-amber-800 border-amber-200",
  suelos:            "bg-orange-100 text-orange-800 border-orange-200",
  sedimentos:        "bg-purple-100 text-purple-800 border-purple-200",
  vibraciones:       "bg-stone-100 text-stone-700 border-stone-300",
};

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
  eca_compliance: Record<string, { compliant: boolean; threshold: number; value: number }>;
}

const STEPS = [
  { id: "project",  label: "Proyecto",    icon: "📋", desc: "Info general" },
  { id: "norm",     label: "Normativa",   icon: "⚖️", desc: "Marco legal y ECA" },
  { id: "stations", label: "Estaciones",  icon: "📍", desc: "Puntos de monitoreo" },
  { id: "params",   label: "Parámetros",  icon: "🔬", desc: "Contaminantes" },
  { id: "results",  label: "Resultados",  icon: "📊", desc: "Matriz de datos" },
];

function getParamsForFactor(factor: FactorKind): { id: string; name: string }[] {
  switch (factor) {
    case "aire": return AIRE_PARAMS.filter(p => p.on).map(p => ({ id: p.id, name: p.name }));
    case "agua_superficial": return [
      ...AGUA_SINGLE_PARAMS.filter(p => p.on).map(p => ({ id: p.id, name: p.name })),
      ...AGUA_MULTI_PARAMS.filter(p => p.on).map(p => ({ id: p.id, name: p.name })),
    ];
    case "agua_subterranea": return AGUA_SUB_PARAMS.filter(p => p.on).map(p => ({ id: p.id, name: p.name }));
    case "ruido": return RUIDO_PARAMS.filter(p => p.on).map(p => ({ id: p.id, name: p.name }));
    case "suelos": return SUELOS_PARAMS.filter(p => p.on).map(p => ({ id: p.id, name: p.name }));
    case "sedimentos": return SEDIMENTOS_PARAMS.filter(p => p.on).map(p => ({ id: p.id, name: p.name }));
    default: return [];
  }
}

export default function MonitoreoPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  // ─── Data state ──────────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [stations, setStations] = useState<StationRow[]>([]);
  const [campaign, setCampaign] = useState<MeasurementCampaign>("linea_base");
  const [activeFactor, setActiveFactor] = useState<FactorKind>("aire");
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [docxLoading, setDocxLoading] = useState(false);

  // Wizard step
  const [step, setStep] = useState(0);

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Project info fields
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
      supabase.from("projects").select("nombre_proyecto, clientes(razon_social)").eq("id", projectId).single(),
      supabase.from("project_sampling_stations").select("*").eq("project_id", projectId),
      supabase.rpc("get_measurements_for_project", { p_project_id: projectId, p_campaign: campaign }),
    ]);
    if (projRes.data) {
      setProjectName(projRes.data.nombre_proyecto ?? "");
      setClientName((projRes.data.clientes as { razon_social?: string } | null)?.razon_social ?? "");
    }
    if (stationRes.data) setStations(stationRes.data as StationRow[]);
    if (measRes.data) setMeasurements(measRes.data as MeasurementRow[]);
    setLoading(false);
  }

  const activeFactorDef: FactorDef = FACTOR_DEFS.find((f) => f.id === activeFactor)!;

  const factorStations: MatrixStation[] = stations
    .filter((s) => s.kind === activeFactor)
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
    }));

  const results: Record<string, Record<string, string | number>> = {};
  for (const m of measurements) {
    const sta = stations.find((s) => s.id === m.station_id);
    const code = sta?.station_code ?? m.station_code;
    if (!results[code]) results[code] = {};
    const idx = factorStations.findIndex((s) => s.code === code);
    if (idx >= 0 && !factorStations[idx].date) {
      factorStations[idx] = { ...factorStations[idx], date: m.measurement_date?.split("T")[0] ?? "" };
    }
    for (const [paramId, paramData] of Object.entries(m.parameters)) {
      results[code][paramId] = paramData.value;
    }
  }

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

  async function handleExportDocx() {
    setDocxLoading(true);
    try {
      const stationsWithDates: MatrixStation[] = factorStations.map((s) => ({
        ...s,
        date: s.date || new Date().toISOString().split("T")[0],
      }));
      const blob = await generateMonitoreoDocx({
        factor: activeFactorDef,
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
      const filename = `INSIDEO_${activeFactorDef.section}_${activeFactorDef.sectionTitle.replace(/\s+/g, "_")}_${slug}.docx`;
      downloadDocx(blob, filename);
    } catch (e) {
      console.error("DOCX generation failed:", e);
      alert("Error generando DOCX: " + String(e));
    }
    setDocxLoading(false);
  }

  async function handleImportResults(results: { stationCode: string; paramId: string; value: number; unit: string; date: string }[]) {
    let inserted = 0;
    for (const row of results) {
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

  const stepComplete = (i: number): boolean => {
    switch (i) {
      case 0: return !!projectName;
      case 1: return true;
      case 2: return factorStations.length > 0;
      case 3: return true;
      case 4: return Object.values(results).some((r) => Object.keys(r).length > 0);
      default: return false;
    }
  };

  const importStations = stations
    .filter((s) => s.kind === activeFactor)
    .map((s) => ({ id: s.id, code: s.station_code }));

  const importParams = getParamsForFactor(activeFactor);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/projects/${projectId}`}
              className="text-xs text-stone-500 hover:text-stone-800"
            >
              ← {projectName || "Proyecto"}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Resultados de Monitoreo
          </h1>
          <p className="text-sm text-stone-500">
            {clientName && <span>{clientName} · </span>}
            <span className="font-medium">{activeFactorDef.sectionTitle}</span>
            {" · "}
            <span className="text-stone-400">{activeFactorDef.decree}</span>
          </p>
        </div>
      </div>

      {/* Factor tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {FACTOR_DEFS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFactor(f.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFactor === f.id
                ? `${FACTOR_COLORS[f.id]} border-current font-semibold`
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Campaign selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-stone-600">Campaña:</span>
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
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-300 text-lg leading-none hidden sm:block">›</span>
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
            {/* Step 0: Proyecto */}
            {step === 0 && (
              <div className="max-w-2xl space-y-4">
                <h2 className="text-lg font-bold text-stone-800">Información del Proyecto</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Nombre del Proyecto</label>
                    <input type="text" value={projectName} readOnly className="w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Cliente</label>
                    <input type="text" value={clientName} readOnly className="w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Instrumento de Gestión</label>
                    <select value={projInfo.instrumento} onChange={(e) => setProjInfo({ ...projInfo, instrumento: e.target.value })} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700">
                      <option value="DIA">DIA</option>
                      <option value="EIA">EIA</option>
                      <option value="EIA-sd">EIA-sd</option>
                      <option value="ITS">ITS</option>
                      <option value="PAMA">PAMA</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">N° de Servicios</label>
                    <input type="text" value={projInfo.numeroServicios} onChange={(e) => setProjInfo({ ...projInfo, numeroServicios: e.target.value })} placeholder="Ej. INSIDEO-2024-001" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Fecha de Monitoreo</label>
                    <input type="date" value={projInfo.fecha} onChange={(e) => setProjInfo({ ...projInfo, fecha: e.target.value })} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Resolución Directoral (R.D.)</label>
                    <input type="text" value={projInfo.rD} onChange={(e) => setProjInfo({ ...projInfo, rD: e.target.value })} placeholder="Ej. R.D. N° 123-2024-MINEM/DGAAM" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Laboratorio</label>
                    <input type="text" value={projInfo.lab} onChange={(e) => setProjInfo({ ...projInfo, lab: e.target.value })} placeholder="Ej. ALAB E.I.R.L." className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Acreditación</label>
                    <input type="text" value={projInfo.acreditacion} onChange={(e) => setProjInfo({ ...projInfo, acreditacion: e.target.value })} placeholder="Ej. INACAL" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-stone-600">Descripción</label>
                    <textarea value={projInfo.desc} onChange={(e) => setProjInfo({ ...projInfo, desc: e.target.value })} rows={2} placeholder="Descripción del monitoreo" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Normativa */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-stone-800 mb-4">Marco Normativo</h2>
                <EcaReferenceCards factor={activeFactor} />
              </div>
            )}

            {/* Step 2: Estaciones */}
            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-stone-800 mb-4">Estaciones de Monitoreo</h2>
                {factorStations.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-stone-300 py-12 text-center">
                    <p className="text-stone-500">No hay estaciones de {activeFactorDef.label.toLowerCase()} para este proyecto.</p>
                    <p className="mt-1 text-sm text-stone-400">Ve a la pestaña de estaciones del proyecto para crear estaciones de monitoreo.</p>
                  </div>
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
                        {factorStations.map((s, i) => (
                          <tr key={s.code} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                            <td className="px-3 py-2 font-medium text-stone-800 border-t border-stone-100">{s.code}</td>
                            <td className="px-3 py-2 text-stone-600 border-t border-stone-100">{s.desc || "–"}</td>
                            <td className="px-3 py-2 text-stone-600 border-t border-stone-100">{s.datum || "WGS84"}</td>
                            <td className="px-3 py-2 text-stone-600 border-t border-stone-100">{s.zona || "–"}</td>
                            <td className="px-3 py-2 text-right text-stone-600 border-t border-stone-100">{s.este != null ? s.este : "–"}</td>
                            <td className="px-3 py-2 text-right text-stone-600 border-t border-stone-100">{s.norte != null ? s.norte : "–"}</td>
                            <td className="px-3 py-2 text-right text-stone-600 border-t border-stone-100">{s.alt != null ? s.alt : "–"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-stone-50 border-t border-stone-200 text-xs text-stone-500">
                      {factorStations.length} estación(es)
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Parámetros */}
            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-stone-800 mb-4">Parámetros de Monitoreo</h2>
                <div className="overflow-x-auto rounded-lg border border-stone-200">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-stone-900">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-white">Parámetro</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-white">Unidad</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-white">Período</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-white">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importParams.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                          <td className="px-3 py-2 font-medium text-stone-700 border-t border-stone-100">{p.name}</td>
                          <td className="px-3 py-2 text-center text-stone-500 border-t border-stone-100">
                            {(() => {
                              const ap = AIRE_PARAMS.find(x => x.id === p.id);
                              if (ap) return ap.unit;
                              const asp = AGUA_SINGLE_PARAMS.find(x => x.id === p.id);
                              if (asp) return asp.unit;
                              const amp = AGUA_MULTI_PARAMS.find(x => x.id === p.id);
                              if (amp) return amp.unit;
                              const rp = RUIDO_PARAMS.find(x => x.id === p.id);
                              if (rp) return rp.unit;
                              const sp = SUELOS_PARAMS.find(x => x.id === p.id);
                              if (sp) return sp.unit;
                              const sedp = SEDIMENTOS_PARAMS.find(x => x.id === p.id);
                              if (sedp) return sedp.unit;
                              const gwp = AGUA_SUB_PARAMS.find(x => x.id === p.id);
                              if (gwp) return gwp.unit;
                              return "–";
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center text-stone-500 border-t border-stone-100">
                            {(() => {
                              const ap = AIRE_PARAMS.find(x => x.id === p.id);
                              if (ap) return ap.period;
                              const asp = AGUA_SINGLE_PARAMS.find(x => x.id === p.id);
                              if (asp) return asp.period;
                              const amp = AGUA_MULTI_PARAMS.find(x => x.id === p.id);
                              if (amp) return amp.period;
                              const rp = RUIDO_PARAMS.find(x => x.id === p.id);
                              if (rp) return rp.period;
                              const sp = SUELOS_PARAMS.find(x => x.id === p.id);
                              if (sp) return sp.period;
                              const sedp = SEDIMENTOS_PARAMS.find(x => x.id === p.id);
                              if (sedp) return sedp.period;
                              const gwp = AGUA_SUB_PARAMS.find(x => x.id === p.id);
                              if (gwp) return gwp.period;
                              return "–";
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center border-t border-stone-100">
                            <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                              Activo
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 4: Resultados */}
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
                      disabled={docxLoading || factorStations.length === 0}
                      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {docxLoading ? "Generando…" : "Exportar DOCX"}
                    </button>
                  </div>
                </div>

                {factorStations.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-stone-300 py-16 text-center">
                    <p className="text-stone-500">
                      No hay estaciones de {activeFactorDef.label.toLowerCase()} para este proyecto.
                    </p>
                  </div>
                ) : (
                  <MonitoreoMatrix
                    factor={activeFactor}
                    stations={factorStations}
                    results={results}
                    onCellChange={handleCellChange}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Previous/Next navigation */}
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

      {/* Import modal */}
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
