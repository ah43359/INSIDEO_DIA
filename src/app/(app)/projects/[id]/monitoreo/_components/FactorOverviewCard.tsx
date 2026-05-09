import Link from "next/link";
import {
  FACTOR_STYLES,
  type FactorDef,
  type FactorKind,
} from "@/lib/monitoreo/eca-registry";
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
}: FactorOverviewCardProps) {
  const style = FACTOR_STYLES[factor.id as FactorKind] ?? FACTOR_STYLES.aire;
  const empty = stationsCount === 0;
  const href = campaign
    ? `/projects/${projectId}/monitoreo/${factor.id}?campaign=${encodeURIComponent(campaign)}`
    : `/projects/${projectId}/monitoreo/${factor.id}`;

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
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 whitespace-nowrap">
          {factor.sectionTitle.split(" ")[0]}
        </span>
      </div>

      {empty ? (
        <div className="mt-4 rounded-md border border-dashed border-stone-300 px-3 py-4 text-center text-xs text-stone-500">
          Sin estaciones registradas para este factor.
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
