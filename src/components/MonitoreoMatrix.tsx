"use client";

import { useRef, useState, useCallback } from "react";
import {
  AGUA_CATEGORIES,
  AGUA_MULTI_PARAMS,
  AGUA_SINGLE_PARAMS,
  AIRE_PARAMS,
  RUIDO_PARAMS,
  RUIDO_ZONES,
  SUELOS_CATEGORIES,
  SUELOS_PARAMS,
  AGUA_SUB_PARAMS,
  SEDIMENTOS_PARAMS,
  type AguaCategory,
  type FactorKind,
  type NoiseZone,
  type SoilCategory,
} from "@/lib/monitoreo/eca-registry";
import {
  exceedsAir,
  exceedsAguaMulti,
  exceedsRuido,
  exceedsSuelos,
  exceedsGroundwater,
  formatValue,
} from "@/lib/monitoreo/exceedance";

export interface MatrixStation {
  id: string;
  code: string;
  campaign: string;
  date: string;
  este?: number;
  norte?: number;
  datum?: string;
  zona?: string;
  alt?: number;
  desc?: string;
}

interface MonitoreoMatrixProps {
  factor: FactorKind;
  stations: MatrixStation[];
  /** stationCode → paramId → value */
  results: Record<string, Record<string, string | number>>;
  onCellChange?: (stationCode: string, paramId: string, value: string) => void;
  readOnly?: boolean;
}

const factorStyles: Record<FactorKind, { bg: string; text: string; accent: string }> = {
  aire:              { bg: "#DBEAFE", text: "#1E40AF", accent: "#3B82F6" },
  agua_superficial:  { bg: "#E0F2FE", text: "#075985", accent: "#0EA5E9" },
  agua_subterranea:  { bg: "#EFF6FF", text: "#1E40AF", accent: "#60A5FA" },
  ruido:             { bg: "#FEF9C3", text: "#854D0E", accent: "#EAB308" },
  suelos:            { bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B" },
  sedimentos:         { bg: "#FDF4FF", text: "#7E22CE", accent: "#A855F7" },
  vibraciones:       { bg: "#F3F4F6", text: "#374151", accent: "#9CA3AF" },
};

export default function MonitoreoMatrix({
  factor,
  stations,
  results,
  onCellChange,
  readOnly = false,
}: MonitoreoMatrixProps) {
  const style = factorStyles[factor] || factorStyles.aire;
  const [editing, setEditing] = useState<{ station: string; param: string } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Category/zone selectors ─────────────────────────────────────────────
  const [aguaCat, setAguaCat] = useState<AguaCategory>("cat3r");
  const [ruidoZone, setRuidoZone] = useState<NoiseZone>("zi");
  const [suelosCat, setSuelosCat] = useState<SoilCategory>("ind");

  // ─── Params for current factor ─────────────────────────────────────────
  const params = getParamsForFactor(factor);

  function startEdit(stationCode: string, paramId: string, currentVal: string) {
    if (readOnly) return;
    setEditing({ station: stationCode, param: paramId });
    setDraftValue(String(currentVal ?? ""));
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    if (!editing) return;
    onCellChange?.(editing.station, editing.param, draftValue);
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  const getEcaDisplay = useCallback(
    (paramId: string): string => {
      if (factor === "agua_superficial") {
        const p = AGUA_MULTI_PARAMS.find((x) => x.id === paramId);
        return p?.thresholds[aguaCat] ?? "–";
      }
      if (factor === "ruido") {
        const p = RUIDO_PARAMS.find((x) => x.id === paramId);
        return p?.thresholds[ruidoZone] ?? "–";
      }
      if (factor === "suelos") {
        const p = SUELOS_PARAMS.find((x) => x.id === paramId);
        return p?.thresholds[suelosCat] ?? "–";
      }
      if (factor === "agua_subterranea") {
        const p = AGUA_SUB_PARAMS.find((x) => x.id === paramId);
        return p?.eca ?? "–";
      }
      return "–";
    },
    [factor, aguaCat, ruidoZone, suelosCat],
  );

  const checkExceeds = useCallback(
    (paramId: string, raw: string | number | undefined): boolean => {
      if (factor === "aire") {
        const p = AIRE_PARAMS.find((x) => x.id === paramId);
        return exceedsAir(raw, p?.eca ?? null);
      }
      if (factor === "agua_superficial") {
        const p = AGUA_MULTI_PARAMS.find((x) => x.id === paramId);
        if (!p) return false;
        const cat3r = p.thresholds[aguaCat] ?? p.thresholds.cat3r;
        return exceedsAguaMulti(raw, cat3r, "gt");
      }
      if (factor === "ruido") {
        const p = RUIDO_PARAMS.find((x) => x.id === paramId);
        if (!p) return false;
        return exceedsRuido(raw, p.thresholds, ruidoZone);
      }
      if (factor === "suelos") {
        const p = SUELOS_PARAMS.find((x) => x.id === paramId);
        if (!p) return false;
        return exceedsSuelos(raw, p.thresholds, suelosCat);
      }
      if (factor === "agua_subterranea") {
        const p = AGUA_SUB_PARAMS.find((x) => x.id === paramId);
        if (!p) return false;
        return exceedsGroundwater(raw, p.eca, p.compare_op);
      }
      return false;
    },
    [factor, aguaCat, ruidoZone, suelosCat],
  );

  if (params.length === 0) {
    return (
      <p className="text-sm text-stone-500 py-4">
        No hay parámetros configurados para este factor.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      {/* Category/zone selector bar */}
      {factor === "agua_superficial" && (
        <div className="flex items-center gap-3 border-b border-stone-200 bg-blue-50 px-4 py-2">
          <span className="text-xs font-semibold text-blue-900">Categoría ECA:</span>
          {AGUA_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAguaCat(c.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                aguaCat === c.value
                  ? "bg-blue-700 text-white"
                  : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {factor === "ruido" && (
        <div className="flex items-center gap-3 border-b border-stone-200 bg-amber-50 px-4 py-2">
          <span className="text-xs font-semibold text-amber-900">Zona:</span>
          {RUIDO_ZONES.map((z) => (
            <button
              key={z.value}
              type="button"
              onClick={() => setRuidoZone(z.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                ruidoZone === z.value
                  ? "bg-amber-600 text-white"
                  : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      )}

      {factor === "suelos" && (
        <div className="flex items-center gap-3 border-b border-stone-200 bg-orange-50 px-4 py-2">
          <span className="text-xs font-semibold text-orange-900">Clasificación:</span>
          {SUELOS_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setSuelosCat(c.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                suelosCat === c.value
                  ? "bg-orange-700 text-white"
                  : "bg-white text-orange-700 border border-orange-200 hover:bg-orange-100"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Matrix table */}
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                className="sticky left-0 z-20 border border-stone-200 bg-stone-100 px-3 py-2 text-left text-xs font-semibold text-stone-600"
                style={{ minWidth: 200 }}
              >
                Parámetro
              </th>
              <th className="border border-stone-200 bg-stone-100 px-3 py-2 text-center text-xs font-semibold text-stone-600 w-16">
                Unidad
              </th>
              <th className="border border-stone-200 bg-stone-100 px-3 py-2 text-center text-xs font-semibold text-stone-600 w-20">
                ECA
              </th>
              {stations.map((s) => (
                <th
                  key={s.id}
                  className="border border-stone-200 px-2 py-2 text-center text-xs font-semibold"
                  style={{ backgroundColor: style.bg, color: style.text, minWidth: 100 }}
                >
                  <div className="font-bold">{s.code}</div>
                  <div className="font-normal text-xs opacity-80">{s.campaign}</div>
                  <div className="font-normal text-xs opacity-70">{s.date}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {params.map((p) => {
              if (!p.on) return null;
              return (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="sticky left-0 z-10 border border-stone-200 bg-white px-3 py-2 text-stone-700">
                    {p.name}
                  </td>
                  <td className="border border-stone-200 bg-stone-50 px-2 py-2 text-center text-xs text-stone-500">
                    {p.unit}
                  </td>
                  <td className="border border-stone-200 bg-blue-50 px-2 py-2 text-center text-xs font-medium text-blue-700">
                    {getEcaDisplay(p.id)}
                  </td>
                  {stations.map((s) => {
                    const raw = results[s.code]?.[p.id];
                    const hasVal = raw != null && String(raw).trim() !== "";
                    const exceeds = checkExceeds(p.id, raw);

                    const isEditing =
                      editing?.station === s.code && editing?.param === p.id;

                    let bg = "white";
                    let textColor = "#374151";
                    if (hasVal) {
                      bg = exceeds ? "#FEF2F2" : "#F0FDF4";
                      textColor = exceeds ? "#991B1B" : "#166534";
                    }

                    return (
                      <td
                        key={s.id}
                        className="border border-stone-200 px-1 py-1 text-center cursor-pointer hover:ring-1 hover:ring-inset hover:ring-stone-300"
                        style={{ backgroundColor: bg }}
                        onClick={() => {
                          if (!readOnly && !isEditing) {
                            startEdit(s.code, p.id, String(raw ?? ""));
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="w-full border-none bg-transparent text-center text-sm font-medium outline-none"
                            style={{ color: textColor }}
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`text-sm font-medium ${
                              hasVal ? "font-semibold" : "text-stone-300 italic"
                            }`}
                            style={{ color: hasVal ? textColor : undefined }}
                          >
                            {hasVal ? formatValue(raw) : "–"}
                          </span>
                        )}
                        {hasVal && exceeds && (
                          <span className="ml-0.5 text-xs" style={{ color: "#991B1B" }}>
                            ⚠
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-stone-200 bg-stone-50 px-4 py-2">
        <span className="text-xs text-stone-500">
          Haga clic en una celda para editar. Los valores en{' '}
          <span className="font-semibold text-emerald-700">verde</span> cumplen el ECA;{' '}
          <span className="font-semibold text-red-700">rojo</span> lo exceden.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 border border-emerald-200" />
          <span className="text-xs text-stone-500">Cumple</span>
          <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border border-red-200" />
          <span className="text-xs text-stone-500">Excede</span>
          <span className="inline-block h-3 w-3 rounded-sm bg-white border border-stone-300" />
          <span className="text-xs text-stone-500">Sin dato</span>
        </div>
      </div>
    </div>
  );
}

// ─── Parameter helpers ─────────────────────────────────────────────────────

interface Param {
  id: string;
  name: string;
  unit: string;
  eca: string;
  period?: string;
  on: boolean;
}

function getParamsForFactor(factor: FactorKind): Param[] {
  switch (factor) {
    case "aire":
      return AIRE_PARAMS.map((p) => ({
        id: p.id, name: p.name, unit: p.unit, eca: p.eca != null ? String(p.eca) : "–",
        period: p.period, on: p.on,
      }));
    case "agua_superficial":
      return [
        ...AGUA_SINGLE_PARAMS.filter((p) => p.on).map((p) => ({
          id: p.id, name: p.name, unit: p.unit, eca: p.eca != null ? String(p.eca) : "–",
          period: p.period, on: p.on,
        })),
        ...AGUA_MULTI_PARAMS.filter((p) => p.on).map((p) => ({
          id: p.id, name: p.name, unit: p.unit, eca: "multi", period: p.period, on: p.on,
        })),
      ];
    case "agua_subterranea":
      return AGUA_SUB_PARAMS.map((p) => ({
        id: p.id, name: p.name, unit: p.unit, eca: p.eca, period: p.period, on: p.on,
      }));
    case "ruido":
      return RUIDO_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, eca: "multi", period: p.period, on: p.on,
      }));
    case "suelos":
      return SUELOS_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, eca: "multi", period: p.period, on: p.on,
      }));
    case "sedimentos":
      return SEDIMENTOS_PARAMS.map((p) => ({
        id: p.id, name: p.name, unit: p.unit, eca: p.eca != null ? String(p.eca) : "–",
        period: p.period, on: p.on,
      }));
    default:
      return [];
  }
}
