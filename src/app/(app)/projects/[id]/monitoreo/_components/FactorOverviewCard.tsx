import Link from "next/link";
import {
  FACTOR_STYLES,
  type FactorDef,
  type FactorKind,
} from "@/lib/monitoreo/eca-registry";
import type { FactorReadiness } from "@/lib/monitoreo/factor-checks";
import CompletenessBar from "./CompletenessBar";

interface FactorOverviewCardProps {
  projectId: string;
  factor: FactorDef;
  stationsCount: number;
  paramsCount: number;
  filled: number;
  total: number;
  exceedances: number;
  campaign?: string;
  /** Required-parameter completeness (driven by `factor.minParameters`). */
  requiredFilled?: number;
  requiredTotal?: number;
  readiness?: FactorReadiness;
}

export default function FactorOverviewCard({
  projectId,
  factor,
  stationsCount,
  paramsCount,
  filled,
  total,
  exceedances,
  campaign,
  requiredFilled,
  requiredTotal,
  readiness,
}: FactorOverviewCardProps) {
  const style = FACTOR_STYLES[factor.id as FactorKind] ?? FACTOR_STYLES.aire;
  const empty = stationsCount === 0;
  const href = campaign
    ? `/projects/${projectId}/monitoreo/${factor.id}?campaign=${encodeURIComponent(campaign)}`
    : `/projects/${projectId}/monitoreo/${factor.id}`;

  const badge = readinessBadge(readiness ?? "not_required");

  return (
    <Link
      href={href}
      className={`block rounded-lg border border-stone-200 border-t-[3px] ${style.border} bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <span className="leading-none" style={{ color: style.accent }}>
              {style.icon}
            </span>
            <span className="truncate">{factor.label}</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-stone-500">
            {factor.section} · {factor.decree}
          </div>
        </div>
        {badge}
      </div>

      {empty ? (
        <div
          className={`mt-4 rounded-md border border-dashed px-3 py-4 text-center text-xs ${
            factor.required === "always"
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-stone-300 text-stone-500"
          }`}
        >
          {factor.required === "always"
            ? "Falta diseñar estaciones para este factor."
            : factor.required === "conditional"
            ? "Sin estaciones (aplica solo si el proyecto lo requiere)."
            : "Sin estaciones registradas para este factor."}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Estaciones" value={stationsCount} />
            <Stat label="Parámetros" value={paramsCount} />
            <Stat
              label="Excedencias"
              value={exceedances}
              tone={exceedances > 0 ? "danger" : "ok"}
            />
          </div>
          <div className="mt-3">
            <CompletenessBar filled={filled} total={total} accent={style.accent} />
          </div>
          {factor.required !== "optional" && (requiredTotal ?? 0) > 0 && (
            <div className="mt-2 flex items-baseline justify-between text-xs">
              <span className="text-stone-500">Parámetros mínimos DIA</span>
              <span className="tabular-nums text-stone-700">
                {requiredFilled ?? 0} / {requiredTotal}
              </span>
            </div>
          )}
        </>
      )}

      <div
        className="mt-3 flex items-center justify-end gap-1 text-xs font-medium"
        style={{ color: style.accent }}
      >
        Abrir <span aria-hidden>→</span>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-red-700"
      : tone === "ok"
      ? "text-emerald-700"
      : "text-stone-800";
  return (
    <div className="rounded-md bg-stone-50 px-2 py-1.5">
      <div className={`text-lg font-bold leading-none tabular-nums ${color}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-stone-500">
        {label}
      </div>
    </div>
  );
}

function readinessBadge(readiness: FactorReadiness) {
  const map: Record<
    FactorReadiness,
    { label: string; cls: string } | null
  > = {
    not_required: null,
    conditional_unused: {
      label: "CONDICIONAL",
      cls: "bg-stone-100 text-stone-600 border border-stone-200",
    },
    missing_stations: {
      label: "REQUERIDO",
      cls: "bg-red-100 text-red-800 border border-red-200",
    },
    missing_measurements: {
      label: "FALTAN MEDICIONES",
      cls: "bg-amber-100 text-amber-800 border border-amber-200",
    },
    partial: {
      label: "PARCIAL",
      cls: "bg-amber-100 text-amber-800 border border-amber-200",
    },
    complete: {
      label: "COMPLETO",
      cls: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    },
  };
  const b = map[readiness];
  if (!b) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${b.cls}`}
    >
      {b.label}
    </span>
  );
}
