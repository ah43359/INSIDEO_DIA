import type { AnpOverlapRow } from "@/lib/types";
import { formatHa } from "@/lib/format";

interface Props {
  overlaps: AnpOverlapRow[];
}

/**
 * Prominent regulatory banner — shown when the project's geometry
 * intersects any Área Natural Protegida (ANP) or Zona de Amortiguamiento.
 *
 * Implications the banner surfaces:
 *   - Direct overlap with an ANP → the project requires Opinión Técnica
 *     Vinculante from SERNANP and may face design constraints or be
 *     unfeasible depending on the ANP category.
 *   - Overlap only with a Zona de Amortiguamiento → SERNANP opinion still
 *     required, but with broader allowed activities subject to the ANP's
 *     management plan.
 *
 * Returns null when there's no overlap (no banner shown).
 */
export default function AnpOverlapBanner({ overlaps }: Props): React.ReactElement | null {
  if (overlaps.length === 0) return null;

  const anps = overlaps.filter((o) => o.kind === "anp");
  const zas  = overlaps.filter((o) => o.kind === "za");

  const severe = anps.length > 0;

  const palette = severe
    ? {
        border: "border-red-300",
        bg:     "bg-red-50",
        accent: "text-red-900",
        body:   "text-red-900/90",
        chip:   "bg-red-100 text-red-900 ring-red-300",
        icon:   "text-red-600",
      }
    : {
        border: "border-amber-300",
        bg:     "bg-amber-50",
        accent: "text-amber-900",
        body:   "text-amber-900/90",
        chip:   "bg-amber-100 text-amber-900 ring-amber-300",
        icon:   "text-amber-600",
      };

  const headline = severe
    ? `Proyecto dentro de ${anps.length === 1 ? "un ANP" : `${anps.length} ANP`}`
    : `Proyecto dentro de ${zas.length === 1 ? "una Zona de Amortiguamiento" : "Zonas de Amortiguamiento"}`;

  const subline = severe
    ? "Requiere Opinión Técnica Vinculante de SERNANP. Verifique categoría, plan maestro y restricciones aplicables antes de cualquier intervención."
    : "El proyecto se ubica en la zona buffer del ANP. SERNANP igual debe emitir opinión técnica; consulte el plan maestro del área protegida.";

  return (
    <section
      role="alert"
      className={`mb-6 overflow-hidden rounded-lg border ${palette.border} ${palette.bg} px-5 py-4 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${palette.icon}`}
          title="Alerta regulatoria"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M10 1.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zm-.75 5.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7a1 1 0 100 2 1 1 0 000-2z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={`text-sm font-semibold ${palette.accent}`}>{headline}</h2>
          <p className={`mt-1 text-xs leading-relaxed ${palette.body}`}>{subline}</p>

          {anps.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {anps.map((a) => (
                <li
                  key={`anp-${a.id}`}
                  className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-xs ring-1 ${palette.chip}`}
                >
                  <span className="font-semibold">{a.nombre}</span>
                  {a.categoria && (
                    <span className="text-[11px] opacity-80">· {a.categoria}</span>
                  )}
                  <span className="ml-auto tabular-nums opacity-80">
                    {formatHa(a.overlap_ha)} ha en intersección
                    {a.area_ha != null && (
                      <span className="ml-1 opacity-70">
                        / {formatHa(a.area_ha)} ha del ANP
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {zas.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {zas.map((z) => (
                <li
                  key={`za-${z.id}`}
                  className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-xs ring-1 ${palette.chip}`}
                >
                  <span className="font-semibold">{z.nombre}</span>
                  <span className="text-[11px] opacity-80">· Zona de Amortiguamiento</span>
                  <span className="ml-auto tabular-nums opacity-80">
                    {formatHa(z.overlap_ha)} ha en intersección
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className={`mt-3 text-[11px] ${palette.body}`}>
            Fuente: SERNANP — ANP Nacional Definitivas y Zonas de Amortiguamiento.
          </p>
        </div>
      </div>
    </section>
  );
}
