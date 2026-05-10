import Link from "next/link";
import type { ReactNode } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface MonitoreoHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  /** Optional emoji/glyph rendered inline before the title. */
  titleIcon?: ReactNode;
  subtitle?: ReactNode;
  /** Pills row rendered under the subtitle. */
  pills?: ReactNode;
  /** Buttons rendered top-right (e.g. Exportar, Compartir, kebab). */
  actions?: ReactNode;
}

export default function MonitoreoHeader({
  breadcrumbs,
  title,
  titleIcon,
  subtitle,
  pills,
  actions,
}: MonitoreoHeaderProps) {
  return (
    <header className="space-y-3">
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-stone-400">
        {breadcrumbs.map((b, i) => {
          const last = i === breadcrumbs.length - 1;
          return (
            <span key={`${b.label}-${i}`} className="flex items-center gap-1">
              {b.href && !last ? (
                <Link href={b.href} className="hover:text-emerald-700 transition-colors">
                  {b.label}
                </Link>
              ) : (
                <span className={last ? "text-stone-600 font-medium" : ""}>{b.label}</span>
              )}
              {!last && <span className="text-stone-300">/</span>}
            </span>
          );
        })}
      </nav>

      {/* Title row + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 leading-tight flex items-center gap-2">
            {titleIcon && <span className="text-3xl leading-none">{titleIcon}</span>}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-stone-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Pills row */}
      {pills && (
        <div className="flex flex-wrap items-center gap-2">{pills}</div>
      )}
    </header>
  );
}
