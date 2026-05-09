"use client";

import { useState } from "react";
import type { FactorKind } from "@/lib/monitoreo/eca-registry";
import {
  AIRE_PARAMS,
  AGUA_MULTI_PARAMS,
  AGUA_SINGLE_PARAMS,
  RUIDO_PARAMS,
  SUELOS_PARAMS,
  AGUA_SUB_PARAMS,
  SEDIMENTOS_PARAMS,
  RUIDO_ZONES,
  SUELOS_CATEGORIES,
  AGUA_CATEGORIES,
} from "@/lib/monitoreo/eca-registry";

interface RegNorm {
  id: string;
  text: string;
  on: boolean;
}

const REGS_BY_FACTOR: Record<FactorKind, RegNorm[]> = {
  aire: [
    { id: "r1", text: "Ley N° 28611 – Ley General del Ambiente", on: true },
    { id: "r2", text: "D.S. N° 003-2017-MINAM – ECA para Aire", on: true },
    { id: "r3", text: "D.S. N° 020-2008-EM – Reglamento Ambiental para Actividades de Exploración Minera", on: true },
    { id: "r4", text: "D.S. N° 040-2014-EM – Reglamento de Protección y Gestión Ambiental", on: true },
    { id: "r5", text: "R.M. N° 181-2016-MINAM – Protocolo Nacional de Monitoreo de Calidad Ambiental del Aire", on: true },
  ],
  agua_superficial: [
    { id: "r1", text: "Ley N° 28611 – Ley General del Ambiente", on: true },
    { id: "r2", text: "D.S. N° 004-2017-MINAM – ECA para Agua", on: true },
    { id: "r3", text: "Ley N° 29338 – Ley de Recursos Hídricos", on: true },
    { id: "r4", text: "D.S. N° 020-2008-EM – Reglamento Ambiental para Actividades de Exploración Minera", on: true },
    { id: "r5", text: "D.S. N° 040-2014-EM – Reglamento de Protección y Gestión Ambiental", on: true },
    { id: "r6", text: "R.J. N° 010-2016-ANA – Protocolo Nacional para el Monitoreo de los Recursos Hídricos Superficiales", on: true },
  ],
  agua_subterranea: [
    { id: "r1", text: "Ley N° 28611 – Ley General del Ambiente", on: true },
    { id: "r2", text: "D.S. N° 004-2017-MINAM – ECA para Agua", on: true },
    { id: "r3", text: "Ley N° 29338 – Ley de Recursos Hídricos", on: true },
    { id: "r4", text: "D.S. N° 020-2008-EM – Reglamento Ambiental para Actividades de Exploración Minera", on: true },
    { id: "r5", text: "R.J. N° 010-2016-ANA – Protocolo Nacional para el Monitoreo de los Recursos Hídricos Superficiales", on: true },
  ],
  ruido: [
    { id: "r1", text: "Ley N° 28611 – Ley General del Ambiente", on: true },
    { id: "r2", text: "D.S. N° 085-2003-PCM – Reglamento de Estándares Nacionales de Calidad Ambiental para Ruido", on: true },
    { id: "r3", text: "D.S. N° 020-2008-EM – Reglamento Ambiental para Actividades de Exploración Minera", on: true },
    { id: "r4", text: "D.S. N° 040-2014-EM – Reglamento de Protección y Gestión Ambiental", on: true },
    { id: "r5", text: "R.M. N° 227-2013-MINAM – Protocolo Nacional de Monitoreo de Ruido Ambiental", on: true },
  ],
  suelos: [
    { id: "r1", text: "Ley N° 28611 – Ley General del Ambiente", on: true },
    { id: "r2", text: "D.S. N° 011-2017-MINAM – ECA para Suelo", on: true },
    { id: "r3", text: "D.S. N° 020-2008-EM – Reglamento Ambiental para Actividades de Exploración Minera", on: true },
    { id: "r4", text: "D.S. N° 040-2014-EM – Reglamento de Protección y Gestión Ambiental", on: true },
    { id: "r5", text: "R.M. N° 085-2014-MINAM – Guía para el Muestreo de Suelos (SINEFA)", on: true },
  ],
  sedimentos: [
    { id: "r1", text: "Ley N° 28611 – Ley General del Ambiente", on: true },
    { id: "r2", text: "D.S. N° 011-2017-MINAM – ECA para Suelo (ref.)", on: true },
    { id: "r3", text: "D.S. N° 020-2008-EM – Reglamento Ambiental para Actividades de Exploración Minera", on: true },
  ],
  vibraciones: [
    { id: "r1", text: "Ley N° 28611 – Ley General del Ambiente", on: true },
    { id: "r2", text: "NTP 27006 / ISO 4866 – Vibraciones Mecánicas", on: true },
  ],
};

interface EcaReferenceCardsProps {
  factor: FactorKind;
}

export default function EcaReferenceCards({ factor }: EcaReferenceCardsProps) {
  const [regs, setRegs] = useState<RegNorm[]>(REGS_BY_FACTOR[factor] ?? []);
  const refs = getEcaRefData(factor);
  const activeRegs = regs.filter((r) => r.on).length;

  function toggleReg(id: string) {
    setRegs(regs.map((r) => (r.id === id ? { ...r, on: !r.on } : r)));
  }

  return (
    <div className="space-y-4">
      {/* ECA threshold cards */}
      {refs && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left card: ECA values table */}
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-stone-50 border-b border-stone-200">
              <span className="text-lg">📈</span>
              <div>
                <div className="font-semibold text-sm text-stone-800">
                  {refs.title}
                </div>
                {refs.subtitle && (
                  <div className="text-xs text-stone-500">{refs.subtitle}</div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-900">
                    <th className="px-3 py-2 text-left text-white font-semibold">
                      Parámetro
                    </th>
                    {refs.headers.map((h) => (
                      <th
                        key={h.key}
                        className="px-2 py-2 text-center font-semibold"
                        style={{ color: h.color }}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {refs.rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}
                    >
                      <td className="px-3 py-2 text-stone-700 font-medium border-t border-stone-100">
                        {row.name}
                      </td>
                      {row.values.map((v, j) => {
                        const bg = v.bg || (i % 2 === 0 ? "bg-amber-50" : "bg-amber-50/50");
                        const tc = v.tc || "text-amber-900";
                        return (
                          <td
                            key={j}
                            className={`px-2 py-2 text-center font-semibold border-t border-stone-100 ${bg} ${tc}`}
                          >
                            {v.val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {refs.footer && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
                {refs.footer}
              </div>
            )}
          </div>

          {/* Right card: applicable norms */}
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-stone-50 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <div className="font-semibold text-sm text-stone-800">
                    Normas Aplicables
                  </div>
                  <div className="text-xs text-stone-500">
                    Marco legal de referencia
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
                {activeRegs} activas
              </span>
            </div>
            <div className="divide-y divide-stone-100">
              {regs.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={r.on}
                    onChange={() => toggleReg(r.id)}
                    className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs leading-relaxed ${
                      r.on ? "text-stone-700" : "text-stone-400 line-through"
                    }`}
                  >
                    {r.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ECA reference data builders ──────────────────────────────────────────────

interface EcaRefRow {
  id: string;
  name: string;
  values: { val: string; bg?: string; tc?: string }[];
}

interface EcaRefData {
  title: string;
  subtitle?: string;
  headers: { key: string; label: string; color: string }[];
  rows: EcaRefRow[];
  footer?: string;
}

function getEcaRefData(factor: FactorKind): EcaRefData | null {
  switch (factor) {
    case "aire": {
      const active = AIRE_PARAMS.filter((p) => p.on);
      return {
        title: "Valores ECA Aire (μg/m³)",
        subtitle: "D.S. N° 003-2017-MINAM – Valores únicos nacionales",
        headers: [
          { key: "eca", label: "ECA", color: "#6EE7B7" },
          { key: "per", label: "Periodo", color: "#FCD34D" },
        ],
        rows: active.map((p) => ({
          id: p.id,
          name: p.name,
          values: [
            { val: p.eca != null ? String(p.eca) : "–", bg: "bg-green-50", tc: "text-green-700" },
            { val: p.period, bg: "bg-amber-50", tc: "text-amber-800" },
          ],
        })),
        footer: "Sin distinción de categorías — ECA único aplicable a nivel nacional.",
      };
    }

    case "agua_superficial": {
      return {
        title: "Valores ECA Agua – Categoría 3",
        subtitle: "D.S. N° 004-2017-MINAM – Riego (D1) y Bebida de animales (D2)",
        headers: [
          { key: "d1", label: "D1: Riego", color: "#FCD34D" },
          { key: "d2", label: "D2: Bebida", color: "#6EE7B7" },
        ],
        rows: AGUA_MULTI_PARAMS.filter((p) => p.on).map((p) => ({
          id: p.id,
          name: p.name,
          values: [
            {
              val: p.thresholds.cat3r || "–",
              bg: "bg-amber-50",
              tc: "text-amber-800",
            },
            {
              val: p.thresholds.cat3b || "–",
              bg: "bg-green-50",
              tc: "text-green-700",
            },
          ],
        })),
        footer:
          "Cat 1 (A1, A2) y Cat 4 (Lagos, Ríos) disponibles al seleccionar categoría en la matriz.",
      };
    }

    case "ruido": {
      return {
        title: "Valores ECA Ruido",
        subtitle: "D.S. N° 085-2003-PCM – dB(A)",
        headers: RUIDO_ZONES.map((z) => ({
          key: z.value,
          label: z.label.replace("Zona de ", "").replace("Zona ", ""),
          color: "#6EE7B7",
        })),
        rows: RUIDO_PARAMS.filter((p) => p.on).map((p) => ({
          id: p.id,
          name: p.name,
          values: RUIDO_ZONES.map((z) => ({
            val: p.thresholds[z.value] || "–",
            bg: "bg-green-50",
            tc: "text-green-700",
          })),
        })),
        footer: "Seleccione la zona según la zonificación del área de estudio.",
      };
    }

    case "suelos": {
      return {
        title: "Valores ECA Suelo (mg/kg)",
        subtitle: "D.S. N° 011-2017-MINAM",
        headers: [
          { key: "agr", label: "Agrícola", color: "#FCD34D" },
          { key: "ind", label: "Industrial", color: "#6EE7B7" },
        ],
        rows: SUELOS_PARAMS.filter((p) => p.on).map((p) => ({
          id: p.id,
          name: p.name,
          values: [
            {
              val: p.thresholds.agr || "–",
              bg: "bg-amber-50",
              tc: "text-amber-800",
            },
            {
              val: p.thresholds.ind || "–",
              bg: "bg-green-50",
              tc: "text-green-700",
            },
          ],
        })),
        footer: "Para minería se recomienda Industrial/Extractivo como referencia.",
      };
    }

    case "agua_subterranea": {
      return {
        title: "Valores ECA Agua Subterránea",
        subtitle: "D.S. N° 004-2017-MINAM – Referencia",
        headers: [
          { key: "eca", label: "ECA", color: "#6EE7B7" },
        ],
        rows: AGUA_SUB_PARAMS.filter((p) => p.on).map((p) => ({
          id: p.id,
          name: p.name,
          values: [
            { val: p.eca || "–", bg: "bg-green-50", tc: "text-green-700" },
          ],
        })),
      };
    }

    case "sedimentos": {
      const active = SEDIMENTOS_PARAMS.filter((p) => p.on);
      return {
        title: "Valores de Referencia – Sedimentos (mg/kg)",
        subtitle: "D.S. N° 011-2017-MINAM (ref.)",
        headers: [
          { key: "ref", label: "Referencia", color: "#6EE7B7" },
        ],
        rows: active.map((p) => ({
          id: p.id,
          name: p.name,
          values: [
            {
              val: p.eca != null ? String(p.eca) : "–",
              bg: "bg-green-50",
              tc: "text-green-700",
            },
          ],
        })),
      };
    }

    default:
      return null;
  }
}
