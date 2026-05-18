"use client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TipoGasto = "factura" | "reembolso";
export type EstadoGasto = "pendiente" | "aprobado" | "pagado";
export type Moneda = "PEN" | "USD";

export interface GastoEntry {
  id: string;
  fecha: string;
  descripcion: string;
  proveedor: string;
  tipo: TipoGasto;
  numero_doc: string;
  monto: number;
  estado: EstadoGasto;
  notas: string;
}

export interface CampoBudget {
  presupuesto: number;
  moneda: Moneda;
  gastos: GastoEntry[];
}

export const DEFAULT_BUDGET: CampoBudget = {
  presupuesto: 0,
  moneda: "PEN",
  gastos: [],
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  budget: CampoBudget;
  onUpdateConfig: (field: "presupuesto" | "moneda", value: number | Moneda) => void;
  onAddGasto: () => void;
  onUpdateGasto: (id: string, field: keyof GastoEntry, value: string | number) => void;
  onRemoveGasto: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<EstadoGasto, string> = {
  pendiente: "bg-stone-100 text-stone-600",
  aprobado: "bg-blue-50 text-blue-700",
  pagado: "bg-emerald-50 text-emerald-700",
};

function fmt(n: number, moneda: Moneda) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CampoBudgetPanel({
  budget,
  onUpdateConfig,
  onAddGasto,
  onUpdateGasto,
  onRemoveGasto,
}: Props) {
  const { presupuesto, moneda, gastos } = budget;

  const totalFacturas = gastos
    .filter((g) => g.tipo === "factura")
    .reduce((s, g) => s + g.monto, 0);
  const totalReembolsos = gastos
    .filter((g) => g.tipo === "reembolso")
    .reduce((s, g) => s + g.monto, 0);
  const totalGastado = totalFacturas + totalReembolsos;
  const saldo = presupuesto - totalGastado;
  const pct = presupuesto > 0 ? Math.min((totalGastado / presupuesto) * 100, 100) : 0;

  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500";
  const saldoColor =
    saldo < 0
      ? "text-red-700"
      : pct >= 70
        ? "text-amber-700"
        : "text-emerald-700";

  return (
    <div className="space-y-5">
      {/* ── Budget config + KPIs ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {/* Config row */}
        <div className="flex flex-wrap items-end gap-4 border-b border-stone-100 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Presupuesto total
            </label>
            <div className="flex items-center gap-2">
              <select
                value={moneda}
                onChange={(e) => onUpdateConfig("moneda", e.target.value as Moneda)}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm font-medium text-stone-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="PEN">PEN S/</option>
                <option value="USD">USD $</option>
              </select>
              <input
                type="number"
                min="0"
                step="100"
                value={presupuesto || ""}
                onChange={(e) => onUpdateConfig("presupuesto", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-44 rounded-lg border border-stone-200 px-3 py-2 text-right text-sm font-semibold tabular-nums text-stone-800 placeholder:font-normal placeholder:text-stone-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 divide-x divide-stone-100 sm:grid-cols-4">
          <Kpi label="Presupuesto" value={fmt(presupuesto, moneda)} sub="Total aprobado" />
          <Kpi label="Facturas" value={fmt(totalFacturas, moneda)} sub={`${gastos.filter((g) => g.tipo === "factura").length} ítem(s)`} />
          <Kpi label="Reembolsos" value={fmt(totalReembolsos, moneda)} sub={`${gastos.filter((g) => g.tipo === "reembolso").length} ítem(s)`} />
          <Kpi
            label="Saldo disponible"
            value={fmt(saldo, moneda)}
            sub={`${pct.toFixed(1)}% ejecutado`}
            valueClassName={saldoColor}
          />
        </div>

        {/* Execution bar */}
        <div className="border-t border-stone-100 px-5 py-3">
          <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1.5">
            <span>Ejecución presupuestal</span>
            <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {saldo < 0 && (
            <p className="mt-2 text-xs font-medium text-red-600">
              Presupuesto excedido en {fmt(Math.abs(saldo), moneda)}
            </p>
          )}
        </div>
      </div>

      {/* ── Expense table ── */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-stone-700">Registro de gastos</h3>
          <p className="mt-0.5 text-xs text-stone-400">Facturas de especialistas y gastos reembolsables del equipo de campo.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Descripción</th>
                <th className="px-3 py-2.5">Proveedor / Persona</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">N° documento</th>
                <th className="px-3 py-2.5 text-right">Monto</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Notas</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {gastos.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/50">
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={row.fecha}
                      onChange={(e) => onUpdateGasto(row.id, "fecha", e.target.value)}
                      className="w-32 rounded border-0 bg-transparent text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.descripcion}
                      onChange={(e) => onUpdateGasto(row.id, "descripcion", e.target.value)}
                      placeholder="Descripción del gasto"
                      className="w-full min-w-[150px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.proveedor}
                      onChange={(e) => onUpdateGasto(row.id, "proveedor", e.target.value)}
                      placeholder="Empresa o persona"
                      className="w-full min-w-[110px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.tipo}
                      onChange={(e) => onUpdateGasto(row.id, "tipo", e.target.value as TipoGasto)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium focus:outline-none ${
                        row.tipo === "factura"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      <option value="factura">Factura</option>
                      <option value="reembolso">Reembolso</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.numero_doc}
                      onChange={(e) => onUpdateGasto(row.id, "numero_doc", e.target.value)}
                      placeholder="F001-00123"
                      className="w-28 rounded border-0 bg-transparent font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.monto || ""}
                      onChange={(e) => onUpdateGasto(row.id, "monto", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-28 rounded border-0 bg-transparent text-right tabular-nums text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.estado}
                      onChange={(e) => onUpdateGasto(row.id, "estado", e.target.value as EstadoGasto)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium focus:outline-none ${ESTADO_STYLES[row.estado]}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.notas}
                      onChange={(e) => onUpdateGasto(row.id, "notas", e.target.value)}
                      placeholder="Notas…"
                      className="w-full min-w-[80px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onRemoveGasto(row.id)}
                      className="rounded p-1 text-stone-300 transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Eliminar gasto"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {gastos.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-stone-400">
                    Sin gastos registrados. Añade facturas o reembolsos de la campaña de campo.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Totals footer */}
            {gastos.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50 font-semibold">
                  <td colSpan={5} className="px-3 py-3 text-right text-xs text-stone-500">
                    Total
                  </td>
                  <td className="px-3 py-3 text-right text-xs tabular-nums text-stone-800">
                    {fmt(totalGastado, moneda)}
                  </td>
                  <td colSpan={3} />
                </tr>
                {totalFacturas > 0 && totalReembolsos > 0 && (
                  <>
                    <tr className="bg-stone-50 text-[10px] text-stone-400">
                      <td colSpan={5} className="px-3 py-1 text-right">Facturas</td>
                      <td className="px-3 py-1 text-right tabular-nums">{fmt(totalFacturas, moneda)}</td>
                      <td colSpan={3} />
                    </tr>
                    <tr className="bg-stone-50 text-[10px] text-stone-400">
                      <td colSpan={5} className="px-3 pb-2 text-right">Reembolsos</td>
                      <td className="px-3 pb-2 text-right tabular-nums">{fmt(totalReembolsos, moneda)}</td>
                      <td colSpan={3} />
                    </tr>
                  </>
                )}
              </tfoot>
            )}
          </table>
        </div>

        <div className="border-t border-stone-100 px-5 py-3">
          <button
            onClick={onAddGasto}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 transition hover:text-emerald-600"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
            </svg>
            Añadir gasto
          </button>
        </div>
      </section>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  sub,
  valueClassName = "text-stone-800",
}: {
  label: string;
  value: string;
  sub: string;
  valueClassName?: string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClassName}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-stone-400">{sub}</p>
    </div>
  );
}
