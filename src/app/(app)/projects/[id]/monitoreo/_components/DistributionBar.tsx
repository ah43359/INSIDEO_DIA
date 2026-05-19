import { formatInt } from "@/lib/format";

interface DistributionSegment {
  id: string;
  label: string;
  value: number;
  /** Hex color for this segment. */
  color: string;
}

interface DistributionBarProps {
  title?: string;
  /** Optional value-suffix shown after raw count (e.g. "estaciones"). */
  unit?: string;
  segments: DistributionSegment[];
  /** Hide segments under this percentage (still listed in legend). Defaults to 5%. */
  minLabelPct?: number;
  emptyLabel?: string;
}

export default function DistributionBar({
  title,
  unit,
  segments,
  minLabelPct = 5,
  emptyLabel = "Sin datos",
}: DistributionBarProps) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const present = segments.filter((s) => s.value > 0);
  const empty = total === 0;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      {(title || total > 0) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && (
            <h2 className="text-sm font-semibold text-stone-700">{title}</h2>
          )}
          {total > 0 && (
            <span className="text-xs text-stone-400 tabular-nums">
              {formatInt(total)}
              {unit ? ` ${unit}` : ""}
            </span>
          )}
        </div>
      )}

      {empty ? (
        <div className="rounded-md border border-dashed border-stone-300 px-3 py-6 text-center text-xs text-stone-500">
          {emptyLabel}
        </div>
      ) : (
        <>
          <div className="flex h-9 w-full overflow-hidden rounded-md bg-stone-100">
            {present.map((s) => {
              const pct = (s.value / total) * 100;
              const showLabel = pct >= minLabelPct;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ width: `${pct}%`, backgroundColor: s.color }}
                  title={`${s.label}: ${s.value} (${pct.toFixed(1)}%)`}
                >
                  {showLabel ? `${pct.toFixed(0)}%` : null}
                </div>
              );
            })}
          </div>
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600">
            {segments.map((s) => (
              <li key={s.id} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-stone-700">{s.label}</span>
                <span className="text-stone-400 tabular-nums">
                  {formatInt(s.value)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
