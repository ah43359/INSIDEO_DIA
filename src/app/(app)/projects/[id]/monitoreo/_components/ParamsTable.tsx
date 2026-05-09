"use client";

import {
  AGUA_CATEGORIES,
  AGUA_MULTI_PARAMS,
  AGUA_SINGLE_PARAMS,
  AGUA_SUB_PARAMS,
  AIRE_PARAMS,
  RUIDO_PARAMS,
  RUIDO_ZONES,
  SEDIMENTOS_PARAMS,
  SUELOS_CATEGORIES,
  SUELOS_PARAMS,
  type AguaCategory,
  type FactorKind,
  type NoiseZone,
  type SoilCategory,
} from "@/lib/monitoreo/eca-registry";

interface ParamsTableProps {
  factor: FactorKind;
  /** Optional: highlight the column matching the active selector. */
  activeAguaCat?: AguaCategory;
  activeRuidoZone?: NoiseZone;
  activeSuelosCat?: SoilCategory;
}

const HEADER_BASE =
  "px-3 py-2 text-center text-xs font-semibold border-b border-stone-200";
const HEADER_DARK = `${HEADER_BASE} bg-stone-900 text-white`;
const ROW_NAME = "px-3 py-2 font-medium text-stone-800 border-t border-stone-100";
const ROW_CELL = "px-3 py-2 text-center text-stone-700 border-t border-stone-100";
const ROW_MUTED = "px-3 py-2 text-center text-stone-500 border-t border-stone-100";

function ActiveBadge({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
      Inactivo
    </span>
  );
}

export default function ParamsTable({
  factor,
  activeAguaCat,
  activeRuidoZone,
  activeSuelosCat,
}: ParamsTableProps) {
  // ── Aire / Sedimentos: single-threshold ───────────────────────────────────
  if (factor === "aire" || factor === "sedimentos") {
    const rows = factor === "aire" ? AIRE_PARAMS : SEDIMENTOS_PARAMS;
    return (
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-stone-900">
              <th className={`${HEADER_DARK} text-left`}>Parámetro</th>
              <th className={HEADER_DARK}>Unidad</th>
              <th className="px-3 py-2 text-center text-xs font-semibold border-b border-stone-200 bg-emerald-700 text-white">
                ECA
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold border-b border-stone-200 bg-amber-600 text-white">
                Período
              </th>
              <th className={HEADER_DARK}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                <td className={ROW_NAME}>{p.name}</td>
                <td className={ROW_MUTED}>{p.unit}</td>
                <td className="px-3 py-2 text-center font-semibold text-emerald-700 bg-emerald-50/40 border-t border-stone-100 tabular-nums">
                  {p.eca != null ? String(p.eca) : "–"}
                </td>
                <td className="px-3 py-2 text-center text-amber-800 bg-amber-50/40 border-t border-stone-100">
                  {p.period}
                </td>
                <td className={`${ROW_CELL} text-center`}>
                  <ActiveBadge on={p.on} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Agua subterránea: single ECA + compare op ────────────────────────────
  if (factor === "agua_subterranea") {
    return (
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-stone-900">
              <th className={`${HEADER_DARK} text-left`}>Parámetro</th>
              <th className={HEADER_DARK}>Unidad</th>
              <th className="px-3 py-2 text-center text-xs font-semibold border-b border-stone-200 bg-emerald-700 text-white">
                ECA
              </th>
              <th className={HEADER_DARK}>Comparación</th>
              <th className={HEADER_DARK}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {AGUA_SUB_PARAMS.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                <td className={ROW_NAME}>{p.name}</td>
                <td className={ROW_MUTED}>{p.unit}</td>
                <td className="px-3 py-2 text-center font-semibold text-emerald-700 bg-emerald-50/40 border-t border-stone-100 tabular-nums">
                  {p.eca}
                </td>
                <td className={ROW_MUTED}>{p.compare_op}</td>
                <td className={`${ROW_CELL} text-center`}>
                  <ActiveBadge on={p.on} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Agua superficial: 6 ECA category columns ─────────────────────────────
  if (factor === "agua_superficial") {
    return (
      <div className="space-y-4">
        {AGUA_SINGLE_PARAMS.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <div className="bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 border-b border-stone-200">
              Parámetros con ECA único (Categoría 3)
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-900">
                  <th className={`${HEADER_DARK} text-left`}>Parámetro</th>
                  <th className={HEADER_DARK}>Unidad</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold border-b border-stone-200 bg-emerald-700 text-white">
                    ECA
                  </th>
                  <th className={HEADER_DARK}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {AGUA_SINGLE_PARAMS.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                    <td className={ROW_NAME}>{p.name}</td>
                    <td className={ROW_MUTED}>{p.unit}</td>
                    <td className="px-3 py-2 text-center font-semibold text-emerald-700 bg-emerald-50/40 border-t border-stone-100 tabular-nums">
                      {p.eca != null ? String(p.eca) : "–"}
                    </td>
                    <td className={`${ROW_CELL} text-center`}>
                      <ActiveBadge on={p.on} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <div className="bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 border-b border-stone-200">
            Parámetros con ECA por categoría (D.S. 004-2017-MINAM)
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-stone-900">
                <th className={`${HEADER_DARK} text-left sticky left-0 z-10 bg-stone-900`}>
                  Parámetro
                </th>
                <th className={HEADER_DARK}>Unidad</th>
                {AGUA_CATEGORIES.map((c) => {
                  const active = activeAguaCat === c.value;
                  return (
                    <th
                      key={c.value}
                      className={`px-2 py-2 text-center text-[11px] font-semibold border-b ${
                        active
                          ? "bg-blue-700 text-white border-blue-900"
                          : "bg-blue-50 text-blue-800 border-stone-200"
                      }`}
                    >
                      {c.label.split(":")[0].trim()}
                    </th>
                  );
                })}
                <th className={HEADER_DARK}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {AGUA_MULTI_PARAMS.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                  <td className={`${ROW_NAME} sticky left-0 z-10 ${i % 2 === 0 ? "bg-white" : "bg-stone-50"}`}>
                    {p.name}
                  </td>
                  <td className={ROW_MUTED}>{p.unit}</td>
                  {AGUA_CATEGORIES.map((c) => {
                    const active = activeAguaCat === c.value;
                    return (
                      <td
                        key={c.value}
                        className={`px-2 py-2 text-center text-xs tabular-nums border-t border-stone-100 ${
                          active
                            ? "bg-blue-100 font-semibold text-blue-900"
                            : "text-blue-700 bg-blue-50/40"
                        }`}
                      >
                        {p.thresholds[c.value] || "–"}
                      </td>
                    );
                  })}
                  <td className={`${ROW_CELL} text-center`}>
                    <ActiveBadge on={p.on} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Ruido: 4 zone columns + período ───────────────────────────────────────
  if (factor === "ruido") {
    return (
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-stone-900">
              <th className={`${HEADER_DARK} text-left`}>Parámetro</th>
              <th className={HEADER_DARK}>Unidad</th>
              {RUIDO_ZONES.map((z) => {
                const active = activeRuidoZone === z.value;
                return (
                  <th
                    key={z.value}
                    className={`px-2 py-2 text-center text-[11px] font-semibold border-b ${
                      active
                        ? "bg-amber-600 text-white border-amber-700"
                        : "bg-amber-50 text-amber-800 border-stone-200"
                    }`}
                  >
                    {z.label.replace("Zona de ", "").replace("Zona ", "")}
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center text-xs font-semibold border-b border-stone-200 bg-amber-700 text-white">
                Período
              </th>
              <th className={HEADER_DARK}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {RUIDO_PARAMS.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                <td className={ROW_NAME}>{p.name}</td>
                <td className={ROW_MUTED}>{p.unit}</td>
                {RUIDO_ZONES.map((z) => {
                  const active = activeRuidoZone === z.value;
                  return (
                    <td
                      key={z.value}
                      className={`px-2 py-2 text-center text-xs tabular-nums border-t border-stone-100 ${
                        active
                          ? "bg-amber-100 font-semibold text-amber-900"
                          : "text-amber-800 bg-amber-50/40"
                      }`}
                    >
                      {p.thresholds[z.value] || "–"}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center text-amber-800 bg-amber-50/40 border-t border-stone-100">
                  {p.period}
                </td>
                <td className={`${ROW_CELL} text-center`}>
                  <ActiveBadge on={p.on} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Suelos: 3 classification columns ──────────────────────────────────────
  if (factor === "suelos") {
    return (
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-stone-900">
              <th className={`${HEADER_DARK} text-left`}>Parámetro</th>
              <th className={HEADER_DARK}>Unidad</th>
              {SUELOS_CATEGORIES.map((c) => {
                const active = activeSuelosCat === c.value;
                return (
                  <th
                    key={c.value}
                    className={`px-2 py-2 text-center text-[11px] font-semibold border-b ${
                      active
                        ? "bg-orange-700 text-white border-orange-900"
                        : "bg-orange-50 text-orange-800 border-stone-200"
                    }`}
                  >
                    {c.label}
                  </th>
                );
              })}
              <th className={HEADER_DARK}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {SUELOS_PARAMS.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                <td className={ROW_NAME}>{p.name}</td>
                <td className={ROW_MUTED}>{p.unit}</td>
                {SUELOS_CATEGORIES.map((c) => {
                  const active = activeSuelosCat === c.value;
                  return (
                    <td
                      key={c.value}
                      className={`px-2 py-2 text-center text-xs tabular-nums border-t border-stone-100 ${
                        active
                          ? "bg-orange-100 font-semibold text-orange-900"
                          : "text-orange-800 bg-orange-50/40"
                      }`}
                    >
                      {p.thresholds[c.value] || "–"}
                    </td>
                  );
                })}
                <td className={`${ROW_CELL} text-center`}>
                  <ActiveBadge on={p.on} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <p className="text-sm text-stone-500 py-4">
      No hay parámetros configurados para este factor.
    </p>
  );
}
