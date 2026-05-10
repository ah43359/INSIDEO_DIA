import type { ReactNode } from "react";

interface PillProps {
  icon?: ReactNode;
  /** Hex color for the leading dot (status pills). Mutually exclusive with `icon` for visual clarity. */
  dotColor?: string;
  /** Optional tone — tints the border + bg when set. */
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
  children: ReactNode;
  className?: string;
}

const TONE_STYLES: Record<NonNullable<PillProps["tone"]>, string> = {
  neutral: "border-stone-200 bg-white text-stone-700",
  ok:      "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn:    "border-amber-200 bg-amber-50 text-amber-800",
  danger:  "border-red-200 bg-red-50 text-red-800",
  info:    "border-blue-200 bg-blue-50 text-blue-800",
};

export default function Pill({
  icon,
  dotColor,
  tone = "neutral",
  children,
  className = "",
}: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${TONE_STYLES[tone]} ${className}`}
    >
      {dotColor && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {icon && <span className="text-stone-400 leading-none">{icon}</span>}
      {children}
    </span>
  );
}
