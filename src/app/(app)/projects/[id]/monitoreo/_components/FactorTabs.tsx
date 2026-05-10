import Link from "next/link";
import {
  FACTOR_DEFS,
  FACTOR_STYLES,
  type FactorKind,
} from "@/lib/monitoreo/eca-registry";

interface FactorTabsProps {
  projectId: string;
  /** Pass a FactorKind for a per-factor page; pass "resumen" for the hub. */
  active: FactorKind | "resumen";
  campaign?: string;
  /** Optional small badge per factor (e.g. exceedance count). Keyed by factor id. */
  badges?: Partial<Record<FactorKind, number>>;
}

export default function FactorTabs({
  projectId,
  active,
  campaign,
  badges,
}: FactorTabsProps) {
  const search = campaign ? `?campaign=${encodeURIComponent(campaign)}` : "";

  return (
    <div className="border-b border-stone-200 sticky top-0 z-20 bg-stone-50/95 backdrop-blur supports-[backdrop-filter]:bg-stone-50/80">
      <nav className="-mb-px flex flex-wrap items-end gap-1 overflow-x-auto" aria-label="Factores">
        <TabLink
          href={`/projects/${projectId}/monitoreo${search}`}
          label="Resumen"
          active={active === "resumen"}
          accent="#0f766e"
        />
        {FACTOR_DEFS.map((f) => {
          const style = FACTOR_STYLES[f.id];
          const isActive = active === f.id;
          const badge = badges?.[f.id] ?? 0;
          return (
            <TabLink
              key={f.id}
              href={`/projects/${projectId}/monitoreo/${f.id}${search}`}
              label={f.label}
              icon={style.icon}
              active={isActive}
              accent={style.accent}
              badge={badge > 0 ? badge : undefined}
            />
          );
        })}
      </nav>
    </div>
  );
}

interface TabLinkProps {
  href: string;
  label: string;
  icon?: string;
  active: boolean;
  accent: string;
  badge?: number;
}

function TabLink({ href, label, icon, active, accent, badge }: TabLinkProps) {
  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "text-stone-900"
          : "border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300"
      }`}
      style={active ? { borderColor: accent } : undefined}
    >
      {icon && (
        <span className="text-base leading-none" style={active ? { color: accent } : undefined}>
          {icon}
        </span>
      )}
      <span>{label}</span>
      {badge !== undefined && (
        <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700 tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}
