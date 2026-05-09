"use client";

import type { ExceedanceItem } from "@/lib/monitoreo/factor-checks";

interface ExceedanceSummaryProps {
  items: ExceedanceItem[];
}

export default function ExceedanceSummary({ items }: ExceedanceSummaryProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ✓ Ninguno de los parámetros monitoreados supera los valores ECA aplicables.
      </div>
    );
  }

  // Group by station for readability.
  const byStation = new Map<string, ExceedanceItem[]>();
  for (const it of items) {
    const list = byStation.get(it.stationCode) ?? [];
    list.push(it);
    byStation.set(it.stationCode, list);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-red-200 bg-white">
      <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2">
        <span className="text-sm font-semibold text-red-900">
          ⚠ Excedencias detectadas
        </span>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          {items.length}
        </span>
      </div>
      <ul className="divide-y divide-stone-100">
        {Array.from(byStation.entries()).map(([code, list]) => (
          <li key={code} className="px-4 py-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-semibold text-stone-800">{code}</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {list.length} excedencia{list.length === 1 ? "" : "s"}
              </span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {list.map((it) => (
                  <tr key={`${it.stationCode}-${it.paramId}`} className="border-t border-stone-50">
                    <td className="py-1 pr-3 text-stone-700">{it.paramName}</td>
                    <td className="py-1 pr-3 text-right tabular-nums font-semibold text-red-700">
                      {it.value}
                    </td>
                    <td className="py-1 pr-3 text-stone-400 text-center">→</td>
                    <td className="py-1 text-stone-500">
                      ECA: <span className="tabular-nums text-stone-700">{it.ecaDisplay}</span>{" "}
                      <span className="text-stone-400">{it.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </li>
        ))}
      </ul>
    </div>
  );
}
