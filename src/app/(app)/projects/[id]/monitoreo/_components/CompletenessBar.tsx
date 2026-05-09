interface CompletenessBarProps {
  filled: number;
  total: number;
  /** Optional accent color (hex). Falls back to teal. */
  accent?: string;
  showCounts?: boolean;
}

export default function CompletenessBar({
  filled,
  total,
  accent = "#0d9488",
  showCounts = true,
}: CompletenessBarProps) {
  const ratio = total === 0 ? 0 : filled / total;
  const pct = Math.round(ratio * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-stone-600">Completitud</span>
        {showCounts && (
          <span className="tabular-nums text-stone-500">
            {filled} / {total} celdas · <span className="font-semibold text-stone-700">{pct}%</span>
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}
