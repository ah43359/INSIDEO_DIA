interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string; // hex or tailwind class for the value color
  icon?: string;
}

export default function KpiTile({ label, value, hint, accent, icon }: KpiTileProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
          {label}
        </span>
        {icon && <span className="text-base leading-none opacity-70">{icon}</span>}
      </div>
      <div
        className="mt-1 text-2xl font-bold leading-tight"
        style={accent && accent.startsWith("#") ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-stone-500">{hint}</div>}
    </div>
  );
}
