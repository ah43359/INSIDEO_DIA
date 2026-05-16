"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";

interface StationInfo {
  id: string;
  code: string;
}

interface ParamInfo {
  id: string;
  name: string;
}

interface ImportResult {
  stationCode: string;
  paramId: string;
  value: number;
  unit: string;
  date: string;
}

interface MonitoreoImportModalProps {
  stations: StationInfo[];
  params: ParamInfo[];
  campaign: string;
  onImport: (results: ImportResult[]) => void;
  onClose: () => void;
}

function simStr(a: string, b: string): number {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const wa = a.split(/\s+/);
  const wb = b.split(/\s+/);
  const common = wa.filter((t) => wb.some((u) => u.includes(t) || t.includes(u)));
  return (common.length / Math.max(wa.length, wb.length)) * 0.7;
}

function detectOrientation(
  rows: string[][],
  staCodes: string[],
  paramNames: string[]
): "cols" | "rows" {
  if (rows.length < 2) return "cols";
  const headerRow = rows[0].map((c) => String(c || ""));
  const firstCol = rows.map((r) => String(r[0] || ""));
  const staMatchH = staCodes.reduce(
    (s, c) => s + headerRow.reduce((m, h) => Math.max(m, simStr(h, c)), 0),
    0
  );
  const staMatchV = staCodes.reduce(
    (s, c) => s + firstCol.reduce((m, h) => Math.max(m, simStr(h, c)), 0),
    0
  );
  return staMatchH >= staMatchV ? "cols" : "rows";
}

export default function MonitoreoImportModal({
  stations,
  params,
  campaign,
  onImport,
  onClose,
}: MonitoreoImportModalProps) {
  const [phase, setPhase] = useState<"upload" | "parsing" | "mapping" | "error">("upload");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<string[][] | null>(null);
  const [orient, setOrient] = useState<"cols" | "rows">("cols");
  const [preview, setPreview] = useState<{
    count: number;
    sample: string[][];
    mappedHeaders: { header: string; match: string }[];
  } | null>(null);
  const [drag, setDrag] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const staCodes = stations.map((s) => s.code);
  const paramNames = params.map((p) => p.name);

  async function handleFile(file: File) {
    if (!file) return;
    setPhase("parsing");
    setMsg("Procesando archivo...");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const buf = await file.arrayBuffer();

      let data: string[][] = [];

      if (ext === "csv") {
        const text = await file.text();
        data = text
          .trim()
          .split("\n")
          .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
      } else {
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
          header: 1,
        });
        data = json as string[][];
      }

      if (!data || data.length < 2) {
        setPhase("error");
        setMsg("El archivo no contiene datos suficientes (mín. 2 filas).");
        return;
      }

      const det = detectOrientation(data, staCodes, paramNames);
      setOrient(det);
      setRows(data);
      setPreview(buildPreview(data, det));
      setPhase("mapping");
    } catch (e: unknown) {
      setPhase("error");
      setMsg("Error al procesar: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function buildPreview(data: string[][], orientation: "cols" | "rows") {
    const headerRow = data[0].map((c) => String(c || "").trim());
    const mappedHeaders: { header: string; match: string }[] = [];

    if (orientation === "cols") {
      // Columns = stations
      headerRow.forEach((h, ci) => {
        if (ci === 0) {
          mappedHeaders.push({ header: h, match: "Parámetro" });
          return;
        }
        let best: StationInfo | null = null;
        let bs = 0;
        for (const s of stations) {
          const score = simStr(h, s.code);
          if (score > bs) { bs = score; best = s; }
        }
        mappedHeaders.push({
          header: h,
          match: best !== null && bs > 0.4 ? `Estación: ${best.code}` : "⚠ Sin mapeo",
        });
      });
    } else {
      // Rows = stations, columns = params
      headerRow.forEach((h, ci) => {
        if (ci === 0) {
          mappedHeaders.push({ header: h, match: "Estación" });
          return;
        }
        let best: ParamInfo | null = null;
        let bs = 0;
        for (const p of params) {
          const score = simStr(h, p.name);
          if (score > bs) { bs = score; best = p; }
        }
        mappedHeaders.push({
          header: h,
          match: best !== null && bs > 0.25 ? `Parámetro: ${best.name}` : "⚠ Sin mapeo",
        });
      });
    }

    // Count total matched values
    let count = 0;
    for (let ri = 1; ri < data.length; ri++) {
      const row = data[ri];
      for (let ci = 1; ci < row.length; ci++) {
        const val = String(row[ci] || "").trim();
        if (val && val !== "–" && val !== "-") count++;
      }
    }

    return {
      count,
      sample: data.slice(0, 6),
      mappedHeaders,
    };
  }

  function doImport() {
    if (!rows) return;
    const results: ImportResult[] = [];

    if (orient === "cols") {
      const headerRow = rows[0].map((c) => String(c || "").trim());
      const colToStation: Record<number, StationInfo> = {};

      headerRow.forEach((h, ci) => {
        if (ci === 0) return;
        let best: StationInfo | null = null;
        let bs = 0;
        for (const s of stations) {
          const score = simStr(h, s.code);
          if (score > bs) { bs = score; best = s; }
        }
        if (best !== null && bs > 0.4) colToStation[ci] = best;
      });

      for (let ri = 1; ri < rows.length; ri++) {
        const row = rows[ri];
        const paramCell = String(row[0] || "").trim();
        if (!paramCell) continue;
        let bestParam: ParamInfo | null = null;
        let bps = 0;
        for (const p of params) {
          const score = simStr(paramCell, p.name);
          if (score > bps) { bps = score; bestParam = p; }
        }
        if (bestParam === null || bps < 0.25) continue;

        Object.entries(colToStation).forEach(([ciStr, sta]) => {
          const ci = parseInt(ciStr);
          const val = String(row[ci] || "").trim();
          if (!val || val === "–" || val === "-") return;
          const num = parseFloat(val.replace(",", "."));
          if (isNaN(num)) return;
          results.push({
            stationCode: sta.code,
            paramId: bestParam!.id,
            value: num,
            unit: "",
            date: "",
          });
        });
      }
    } else {
      const headerRow = rows[0].map((c) => String(c || "").trim());
      const colToParam: Record<number, ParamInfo> = {};

      headerRow.forEach((h, ci) => {
        if (ci === 0) return;
        let best: ParamInfo | null = null;
        let bs = 0;
        for (const p of params) {
          const score = simStr(h, p.name);
          if (score > bs) { bs = score; best = p; }
        }
        if (best !== null && bs > 0.25) colToParam[ci] = best;
      });

      for (let ri = 1; ri < rows.length; ri++) {
        const row = rows[ri];
        const staCell = String(row[0] || "").trim();
        if (!staCell) continue;
        let bestStation: StationInfo | null = null;
        let bss = 0;
        for (const s of stations) {
          const score = simStr(staCell, s.code);
          if (score > bss) { bss = score; bestStation = s; }
        }
        if (bestStation === null || bss < 0.25) continue;

        Object.entries(colToParam).forEach(([ciStr, param]) => {
          const ci = parseInt(ciStr);
          const val = String(row[ci] || "").trim();
          if (!val || val === "–" || val === "-") return;
          const num = parseFloat(val.replace(",", "."));
          if (isNaN(num)) return;
          results.push({
            stationCode: bestStation!.code,
            paramId: param!.id,
            value: num,
            unit: "",
            date: "",
          });
        });
      }
    }

    setImportedCount(results.length);
    if (results.length > 0) {
      onImport(results);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white flex-shrink-0">
          <div className="font-bold text-sm">📥 Importar resultados desde archivo</div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload phase */}
          {(phase === "upload" || phase === "error") && (
            <div>
              {phase === "error" && (
                <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <span>⚠</span>
                  <span>{msg}</span>
                </div>
              )}

              {/* Summary */}
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                <span>📊</span>
                <span>
                  Estaciones: {staCodes.join(", ") || "(ninguna)"} — Parámetros: {params.length}
                </span>
              </div>

              {/* Template download reminder */}
              <div className="flex items-center gap-3 p-4 mb-4 rounded-lg border border-teal-200 bg-white">
                <span className="text-2xl flex-shrink-0">📋</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-stone-700 mb-0.5">
                    Formato esperado
                  </div>
                  <div className="text-xs text-stone-500">
                    Parámetros en filas, estaciones en columnas (o viceversa). Detectamos la orientación automáticamente.
                  </div>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  drag
                    ? "border-blue-500 bg-blue-50"
                    : "border-stone-300 bg-stone-50 hover:bg-stone-100"
                }`}
                onClick={() => document.getElementById("import-file-input")?.click()}
              >
                <input
                  id="import-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <div className="text-4xl mb-3">📂</div>
                <div className="font-bold text-sm text-stone-700 mb-1">
                  Arrastra tu archivo o haz clic para seleccionar
                </div>
                <div className="text-xs text-stone-400">
                  Formatos: CSV, Excel (.xlsx / .xls)
                </div>
                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                  {["📊 CSV", "📗 Excel"].map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-600"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Format hints */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                  <div className="font-semibold text-xs text-stone-700 mb-2">
                    Opción A — Estaciones en columnas:
                  </div>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr>
                        {["Parámetro", "EST-1", "EST-2"].map((h) => (
                          <th key={h} className="px-2 py-1 bg-stone-900 text-white border border-stone-300">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[["PM10", "45.2", "38.1"], ["PM2.5", "22.0", "18.5"]].map((r, i) => (
                        <tr key={i}>
                          {r.map((c, j) => (
                            <td
                              key={j}
                              className={`px-2 py-1 border border-stone-300 text-center ${
                                j === 0 ? "bg-blue-50 font-semibold" : ""
                              }`}
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50">
                  <div className="font-semibold text-xs text-stone-700 mb-2">
                    Opción B — Estaciones en filas:
                  </div>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr>
                        {["Estación", "PM10", "PM2.5"].map((h) => (
                          <th key={h} className="px-2 py-1 bg-stone-900 text-white border border-stone-300">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[["EST-1", "45.2", "22.0"], ["EST-2", "38.1", "18.5"]].map((r, i) => (
                        <tr key={i}>
                          {r.map((c, j) => (
                            <td
                              key={j}
                              className={`px-2 py-1 border border-stone-300 text-center ${
                                j === 0 ? "bg-teal-50 font-semibold" : ""
                              }`}
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Parsing phase */}
          {phase === "parsing" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-4xl mb-4">⏳</div>
              <div className="font-semibold text-sm text-stone-700">{msg}</div>
            </div>
          )}

          {/* Mapping phase */}
          {phase === "mapping" && preview && (
            <div>
              {/* Summary badge */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-semibold">
                  ✓ {preview.count} valores detectados
                </span>
              </div>

              {/* Orientation toggle */}
              <div className="p-4 mb-4 rounded-lg border border-blue-200 bg-white">
                <div className="font-semibold text-xs text-stone-700 mb-3">
                  Orientación detectada:
                </div>
                <div className="flex gap-3">
                  {[
                    ["cols", "Estaciones en columnas"],
                    ["rows", "Estaciones en filas"],
                  ].map(([v, l]) => (
                    <label
                      key={v}
                      className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border transition-colors flex-1 text-sm ${
                        orient === v
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={orient === v}
                        onChange={() => {
                          setOrient(v as "cols" | "rows");
                          if (rows) setPreview(buildPreview(rows, v as "cols" | "rows"));
                        }}
                        className="accent-blue-600"
                      />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              {/* Column mapping */}
              <div className="p-4 mb-4 rounded-lg border border-stone-200 bg-white">
                <div className="font-semibold text-xs text-stone-700 mb-3">
                  Mapeo de columnas:
                </div>
                <div className="flex flex-wrap gap-2">
                  {preview.mappedHeaders.map((h, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        h.match.startsWith("⚠")
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-teal-50 border-teal-200 text-teal-800"
                      }`}
                    >
                      &quot;{h.header}&quot; → {h.match}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {preview.sample.map((row, ri) => (
                      <tr
                        key={ri}
                        className={ri === 0 ? "bg-stone-900" : ri % 2 === 0 ? "bg-white" : "bg-stone-50"}
                      >
                        {row.slice(0, 8).map((cell, ci) => (
                          <td
                            key={ci}
                            className={`px-3 py-2 border border-stone-200 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis ${
                              ri === 0
                                ? "text-white font-semibold"
                                : ci === 0
                                ? "text-stone-700 font-semibold"
                                : "text-stone-600"
                            }`}
                          >
                            {String(cell || "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-stone-200 bg-stone-50 flex-shrink-0">
          {phase === "error" && (
            <button
              type="button"
              onClick={() => setPhase("upload")}
              className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
            >
              ← Volver
            </button>
          )}
          {phase === "mapping" && (
            <button
              type="button"
              onClick={() => { setPhase("upload"); setRows(null); setPreview(null); }}
              className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
            >
              ← Cambiar archivo
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            Cancelar
          </button>
          {phase === "mapping" && preview && (
            <button
              type="button"
              onClick={doImport}
              className="rounded-lg bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              ✓ Importar {preview.count} valores
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
