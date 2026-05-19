"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  type MeasurementCampaign,
  type StationMeasurement,
  CAMPAIGN_LABEL,
  KIND_LABEL,
  STATION_COLORS,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";

interface SamplingResultsPanelProps {
  projectId: string;
  stations: {
    id: string;
    station_code: string;
    kind: string;
    target_receptor_nombre: string | null;
  }[];
}

interface StationGroup {
  kind: string;
  label: string;
  stations: {
    id: string;
    code: string;
    customName: string | null;
    target: string | null;
    hasData: boolean;
    lastDate: string | null;
    compliant: boolean | null;
  }[];
}

const CAMPAIGNS: MeasurementCampaign[] = [
  "linea_base",
  "construccion",
  "operacion",
  "cierre",
];

const PARAM_CONFIG: Record<string, { key: string; label: string; unit: string; eca?: number; ecaMin?: number; ecaMax?: number }[]> = {
  aire: [
    { key: "PM10", label: "PM10", unit: "μg/m³", eca: 100 },
    { key: "PM2.5", label: "PM2.5", unit: "μg/m³", eca: 50 },
    { key: "SO2", label: "SO2", unit: "μg/m³", eca: 100 },
    { key: "NO2", label: "NO2", unit: "μg/m³", eca: 200 },
    { key: "CO", label: "CO", unit: "μg/m³", eca: 30000 },
    { key: "O3", label: "O3", unit: "μg/m³", eca: 100 },
    { key: "Pb", label: "Pb", unit: "μg/m³", eca: 1.5 },
  ],
  ruido: [
    { key: "LAeq_diurno", label: "LAeq día", unit: "dB(A)", eca: 80 },
    { key: "LAeq_nocturno", label: "LAeq noche", unit: "dB(A)", eca: 70 },
  ],
  agua_superficial: [
    { key: "pH", label: "pH", unit: "-", ecaMin: 6.5, ecaMax: 8.5 },
    { key: "OD", label: "Oxígeno Disuelto", unit: "mg/L", eca: 5 },
    { key: "DBO5", label: "DBO5", unit: "mg/L", eca: 15 },
    { key: "DQO", label: "DQO", unit: "mg/L", eca: 40 },
    { key: "conductividad", label: "Conductividad", unit: "μS/cm", eca: 1000 },
    { key: "turbidez", label: "Turbidez", unit: "NTU", eca: 100 },
    { key: "Pb", label: "Plomo (Pb)", unit: "mg/L", eca: 0.05 },
    { key: "As", label: "Arsénico (As)", unit: "mg/L", eca: 0.1 },
    { key: "Cd", label: "Cadmio (Cd)", unit: "mg/L", eca: 0.01 },
    { key: "Cu", label: "Cobre (Cu)", unit: "mg/L", eca: 0.1 },
    { key: "Zn", label: "Zinc (Zn)", unit: "mg/L", eca: 0.5 },
  ],
  agua_subterranea: [
    { key: "pH", label: "pH", unit: "-", ecaMin: 6.5, ecaMax: 8.5 },
    { key: "OD", label: "Oxígeno Disuelto", unit: "mg/L", eca: 4 },
    { key: "conductividad", label: "Conductividad", unit: "μS/cm", eca: 1500 },
  ],
  soils: [
    { key: "pH", label: "pH", unit: "-", ecaMin: 5.5, ecaMax: 9.0 },
    { key: "materia_organica", label: "Materia Orgánica", unit: "%", eca: 1 },
    { key: "Pb", label: "Plomo (Pb)", unit: "mg/kg", eca: 70 },
    { key: "As", label: "Arsénico (As)", unit: "mg/kg", eca: 0.07 },
  ],
  sedimentos: [
    { key: "materia_organica", label: "Materia Orgánica", unit: "%", eca: 2 },
    { key: "Pb", label: "Plomo (Pb)", unit: "mg/kg", eca: 50 },
  ],
};

export default function SamplingResultsPanel({
  projectId,
  stations,
}: SamplingResultsPanelProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<MeasurementCampaign>("linea_base");
  const [measurements, setMeasurements] = useState<StationMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const supabase = createClient();

  function downloadCSVTemplate() {
    const template = `station_code,fecha,parametro,valor,unidad
AIR-001,2024-01-15,PM10,45.2,ug/m3
AIR-001,2024-01-15,PM2.5,22.1,ug/m3
AIR-001,2024-01-15,SO2,15.5,ug/m3
AIR-001,2024-01-15,NO2,30.2,ug/m3
AIR-001,2024-01-15,CO,2500,ug/m3
AIR-001,2024-01-15,O3,45.0,ug/m3
AIR-001,2024-01-15,Pb,0.5,ug/m3
NOI-001,2024-01-15,LAeq_diurno,65.0,dB(A)
NOI-001,2024-01-15,LAeq_nocturno,55.0,dB(A)
AGS-001,2024-01-15,pH,7.2,-
AGS-001,2024-01-15,OD,6.5,mg/L
AGS-001,2024-01-15,DBO5,8.5,mg/L
AGS-001,2024-01-15,DQO,25.0,mg/L
AGS-001,2024-01-15,conductividad,450,μS/cm
AGS-001,2024-01-15,turbidez,25,NTU
AGS-001,2024-01-15,Pb,0.02,mg/L
AGS-001,2024-01-15,As,0.01,mg/L
AGS-001,2024-01-15,Cd,0.005,mg/L
AGS-001,2024-01-15,Cu,0.03,mg/L
AGS-001,2024-01-15,Zn,0.15,mg/L
SUE-001,2024-01-15,pH,6.8,-
SUE-001,2024-01-15,materia_organica,2.5,%
SUE-001,2024-01-15,Pb,35.0,mg/kg
SUE-001,2024-01-15,As,0.03,mg/kg`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_mediciones.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Resultados de Monitoreo Ambiental", 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Proyecto: ${projectId}`, 20, 30);
    doc.text(`Campoña: ${CAMPAIGN_LABEL[campaign]}`, 20, 36);
    doc.text(`Fecha: ${formatDate(new Date())}`, 20, 42);
    
    let y = 55;
    
    for (const group of stationGroups) {
      if (y > 270) { doc.addPage(); y = 20; }
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(group.label, 20, y);
      y += 8;
      
      for (const station of group.stations) {
        if (y > 280) { doc.addPage(); y = 20; }
        
        const ms = measurements.filter(m => m.station_id === station.id);
        if (ms.length === 0) continue;
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${station.code}${station.target ? ` → ${station.target}` : ""}`, 25, y);
        y += 6;
        
        for (const m of ms) {
          if (y > 285) { doc.addPage(); y = 20; }
          
          const params = m.parameters || {};
          const dateStr = m.measurement_date || "-";
          
          for (const [key, val] of Object.entries(params)) {
            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);
            doc.text(`  ${dateStr} | ${key}: ${val.value} ${val.unit}`, 30, y);
            y += 5;
          }
        }
        y += 2;
      }
      y += 5;
    }
    
    doc.save(`monitoreo_${campaign}_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  useEffect(() => {
    loadMeasurements();
  }, [projectId, campaign]);

  async function loadMeasurements() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_measurements_for_project", {
      p_project_id: projectId,
      p_campaign: campaign,
    });
    if (!error && data) {
      setMeasurements(data as StationMeasurement[]);
    }
    setLoading(false);
  }

  const stationGroups: StationGroup[] = stations.reduce<StationGroup[]>(
    (acc, s) => {
      const group = acc.find((g) => g.kind === s.kind);
      if (!group) {
        acc.push({ kind: s.kind, label: KIND_LABEL[s.kind] || s.kind, stations: [] });
      }
      return acc;
    },
    []
  ).map((g) => {
    g.stations = stations.filter((s) => s.kind === g.kind).map((s) => {
      const ms = measurements.filter((m) => m.station_id === s.id);
      return {
        id: s.id,
        code: s.station_code,
        customName: (s as any).custom_name || null,
        target: s.target_receptor_nombre,
        hasData: ms.length > 0,
        lastDate: ms[0]?.measurement_date || null,
        compliant: ms[0]?.eca_compliance ? Object.values(ms[0].eca_compliance).every((p: any) => p.compliant) : null,
      };
    });
    return g;
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-700">
          Resultados de Monitoreo
        </h2>
        <div className="flex gap-3 items-center">
          <Link
            href={`/projects/${projectId}/monitoreo`}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 transition-colors"
          >
            Abrir asistente completo →
          </Link>
          <button
            type="button"
            onClick={exportPDF}
            disabled={measurements.length === 0}
            className="text-xs text-stone-600 hover:text-stone-900 underline disabled:opacity-40 disabled:no-underline"
          >
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={() => downloadCSVTemplate()}
            className="text-xs text-stone-600 hover:text-stone-900 underline"
          >
            Descargar plantilla CSV
          </button>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="text-xs text-stone-600 hover:text-stone-900 underline"
          >
            Subir CSV
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CAMPAIGNS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCampaign(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              campaign === c ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {CAMPAIGN_LABEL[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-stone-500">Cargando...</p>
      ) : (
        <ul className="space-y-3">
          {stationGroups.map((group) => (
            <li key={group.kind}>
              <details className="group rounded-md border border-stone-200 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 hover:bg-stone-50">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: STATION_COLORS[group.kind] || STATION_COLORS.default }} />
                    <span className="text-sm font-medium text-stone-700">{group.label}</span>
                    <span className="text-xs text-stone-500">({group.stations.length})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {group.stations.some((s) => s.hasData) && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        group.stations.every((s) => s.compliant === true) ? "bg-emerald-100 text-emerald-800"
                        : group.stations.every((s) => s.compliant === false) ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                      }`}>
                        {group.stations.filter((s) => s.compliant === true).length}/{group.stations.length}
                      </span>
                    )}
                    <svg aria-hidden className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <div className="border-t border-stone-200 px-3 py-2">
                  <ul className="space-y-1">
                    {group.stations.map((station) => (
                      <li key={station.id} className="relative">
                        <div className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-stone-50">
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs text-stone-700">{station.customName || station.code}</span>
                            {station.customName && <span className="text-[10px] text-stone-400">({station.code})</span>}
                            {station.target && !station.customName && <span className="text-[10px] text-stone-500">→ {station.target}</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            {station.hasData && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                station.compliant ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              }`}>
                                {station.compliant ? "✓" : "✗"}
                              </span>
                            )}
                            <div className="relative">
                              <button 
                                type="button" 
                                onClick={() => setActiveMenu(activeMenu === station.id ? null : station.id)}
                                className="rounded px-2 py-0.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
                              >
                                {station.hasData ? "Opciones ▼" : "Agregar ▼"}
                              </button>
                              {activeMenu === station.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-stone-200 bg-white shadow-lg z-10">
                                  <button
                                    type="button"
                                    onClick={() => { setActiveMenu(null); setEditingName(station.id); setNewName(station.customName || ""); }}
                                    className="block w-full px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                                  >
                                    ✏️ Renombrar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setActiveMenu(null); setShowForm(station.id); }}
                                    className="block w-full px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                                  >
                                    📝 Ingresar manualmente
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setActiveMenu(null); setShowUpload(true); }}
                                    className="block w-full px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                                  >
                                    📤 Subir CSV
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {stationGroups.length === 0 && <p className="text-xs text-stone-500">Sin estaciones propuestas.</p>}

      {showForm && (
        <MeasurementModal
          stationId={showForm}
          stationCode={stations.find((s) => s.id === showForm)?.station_code || ""}
          stationKind={stations.find((s) => s.id === showForm)?.kind || ""}
          campaign={campaign}
          onClose={() => setShowForm(null)}
          onSaved={() => { setShowForm(null); loadMeasurements(); }}
        />
      )}

      {showUpload && (
        <CSVUploadModal
          projectId={projectId}
          campaign={campaign}
          stations={stations}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadMeasurements(); }}
        />
      )}

      {editingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Renombrar estación</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre personalizado"
              className="mb-4 w-full rounded border border-stone-300 px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingName(null)}
                className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/projects/${projectId}/stations`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ station_id: editingName, custom_name: newName }),
                  });
                  setEditingName(null);
                }}
                className="rounded bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

interface MeasurementModalProps {
  stationId: string;
  stationCode: string;
  stationKind: string;
  campaign: MeasurementCampaign;
  onClose: () => void;
  onSaved: () => void;
}

function MeasurementModal({ stationId, stationCode, stationKind, campaign, onClose, onSaved }: MeasurementModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [params, setParams] = useState<Record<string, string>>({});
  const supabase = createClient();

  const config = PARAM_CONFIG[stationKind] || [];
  const kindKey = stationKind === "agua_superficial" ? "agua_superficial" :
                   stationKind === "agua_subterranea" ? "agua_subterranea" :
                   stationKind === "suelos" ? "soils" : stationKind;
  const fullConfig = PARAM_CONFIG[kindKey] || config;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const parameters: Record<string, { value: number; unit: string }> = {};
    for (const p of fullConfig) {
      if (params[p.key]) {
        parameters[p.key] = { value: parseFloat(params[p.key]), unit: p.unit };
      }
    }

    try {
      const { error: insertError } = await supabase.rpc("insert_station_measurement", {
        p_station_id: stationId,
        p_campaign: campaign,
        p_measurement_date: date,
        p_parameters: parameters,
        p_notes: null,
      });
      if (insertError) setError(insertError.message);
      else onSaved();
    } catch (e) { setError(String(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-900">{stationCode} — {KIND_LABEL[stationKind]}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>
        <p className="mb-4 text-sm text-stone-500">Campaña: {CAMPAIGN_LABEL[campaign]}</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700">Fecha de medición</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-sm" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Parámetros</label>
            <div className="space-y-2 max-h-60 overflow-auto">
              {fullConfig.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <label className="w-28 text-xs text-stone-600">{p.label}</label>
                  <input type="number" step="any" placeholder={p.eca ? `ECA: ${p.eca}` : p.ecaMin ? `ECA: ${p.ecaMin}-${p.ecaMax}` : ""}
                    value={params[p.key] || ""} onChange={(e) => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                    className="flex-1 rounded border border-stone-300 px-2 py-1 text-sm" />
                  <span className="w-16 text-xs text-stone-500">{p.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">Error: {error}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">Cancelar</button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CSVUploadModalProps {
  projectId: string;
  campaign: MeasurementCampaign;
  stations: { id: string; station_code: string; kind: string }[];
  onClose: () => void;
  onUploaded: () => void;
}

function CSVUploadModal({ projectId, campaign, stations, onClose, onUploaded }: CSVUploadModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let rows: string[][] = [];
      
      const ext = file.name.split(".").pop()?.toLowerCase();
      
      if (ext === "xlsx" || ext === "xls") {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
        
        rows = jsonData.map((row) => {
          const line = [
            row.station_code || row.Station_Code || row["station code"] || "",
            row.fecha || row.Fecha || row.date || row.Date || row.fecha_medicion || "",
            row.parametro || row.Parametro || row.Parametro || row.parametro || "",
            row.valor || row.Valor || row.valor || row.value || row.Value || "",
            row.unidad || row.Unidad || row.unidad || row.unit || row.Unit || ""
          ];
          return line;
        });
      } else {
        const text = await file.text();
        rows = text.trim().split("\n").map(line => line.split(",").map(c => c.trim()));
      }

      const header = rows[0].map(h => h.toLowerCase().trim());
      const idxCode = header.indexOf("station_code");
      const idxFecha = header.indexOf("fecha");
      const idxParam = header.indexOf("parametro");
      const idxValor = header.indexOf("valor");
      const idxUnidad = header.indexOf("unidad");

      if (idxCode === -1 || idxParam === -1 || idxValor === -1) {
        setError("Archivo requiere columnas: station_code, parametro, valor");
        setSaving(false);
        return;
      }

      const stationMap = new Map(stations.map(s => [s.station_code, s.id]));
      let inserted = 0;

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length < 3) continue;

        const code = cols[idxCode];
        const stationId = stationMap.get(code);
        if (!stationId) continue;

        const param = cols[idxParam];
        const valor = parseFloat(cols[idxValor]);
        if (isNaN(valor)) continue;

        const unidad = idxUnidad >= 0 ? cols[idxUnidad] : "";
        const fecha = idxFecha >= 0 ? cols[idxFecha] : new Date().toISOString().split("T")[0];

        const parameters: Record<string, { value: number; unit: string }> = {};
        parameters[param] = { value: valor, unit: unidad };

        const { error } = await supabase.rpc("insert_station_measurement", {
          p_station_id: stationId,
          p_campaign: campaign,
          p_measurement_date: fecha,
          p_parameters: parameters,
          p_notes: `Importado de ${file.name}`,
        });

        if (!error) inserted++;
      }

      if (inserted > 0) {
        setSuccess(`${inserted} dato(s) importado(s)`);
        setTimeout(onUploaded, 1000);
      } else {
        setError("No se encontraron datos válidos");
      }
    } catch (err) {
      setError("Error: " + String(err));
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-900">Subir datos CSV</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        <div className="mb-4 rounded border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-medium text-stone-700 mb-2">Formato requerido:</p>
          <pre className="text-xs text-stone-600 overflow-x-auto">
{`station_code,fecha,parametro,valor,unidad
AIR-001,2024-01-15,PM10,45.2,ug/m3
AIR-001,2024-01-15,PM2.5,22.1,ug/m3
AGS-001,2024-01-15,pH,7.2,-
AGS-001,2024-01-15,DBO5,8.5,mg/L`}
          </pre>
          <p className="text-xs text-stone-500 mt-2">
            Columnas: station_code, fecha, parametro, valor, unidad
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleUpload}
          className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600">{success}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}