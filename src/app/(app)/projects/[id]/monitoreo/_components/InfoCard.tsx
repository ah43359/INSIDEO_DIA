import type { ReactNode } from "react";

interface InfoCardProps {
  title: string;
  /** Optional accent color for the title underline / icon. */
  accent?: string;
  icon?: ReactNode;
  /** Optional element rendered top-right of the card header (e.g. count badge). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function InfoCard({
  title,
  accent,
  icon,
  aside,
  children,
  className = "",
}: InfoCardProps) {
  return (
    <section
      className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          {icon && (
            <span style={accent ? { color: accent } : undefined}>{icon}</span>
          )}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

interface DefListProps {
  items: [string, ReactNode][];
  /** Width of the dt column. */
  labelWidth?: string;
}

export function DefList({ items, labelWidth = "140px" }: DefListProps) {
  return (
    <dl
      className="grid gap-y-2 text-sm"
      style={{ gridTemplateColumns: `${labelWidth} 1fr` }}
    >
      {items.map(([k, v], i) => (
        <div key={`${k}-${i}`} className="contents">
          <dt className="text-stone-400">{k}</dt>
          <dd className="font-medium text-stone-900">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default InfoCard;
