"use client";

import { useEffect, useReducer, useState } from "react";
import CampoBudgetPanel, {
  DEFAULT_BUDGET,
  type CampoBudget,
  type GastoEntry,
} from "./CampoBudgetPanel";

interface PresupuestoPanelProps {
  projectId: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function PresupuestoPanel({ projectId }: PresupuestoPanelProps) {
  const [budget, setBudget] = useReducer(
    (prev: CampoBudget, patch: Partial<CampoBudget>) => ({ ...prev, ...patch }),
    DEFAULT_BUDGET,
  );
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/campo/budget`)
      .then((r) => r.json())
      .then((data) => {
        if (data) setBudget(data as CampoBudget);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [projectId]);

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/campo/budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error desconocido");
      setSaveState("error");
    }
  }

  function updateBudgetConfig(field: "presupuesto" | "moneda", value: number | string) {
    setBudget({ [field]: value } as Partial<CampoBudget>);
  }

  function addGasto() {
    const today = new Date().toISOString().slice(0, 10);
    const newGasto: GastoEntry = {
      id: uid(),
      fecha: today,
      descripcion: "",
      proveedor: "",
      tipo: "factura",
      numero_doc: "",
      monto: 0,
      estado: "pendiente",
      notas: "",
    };
    setBudget({ gastos: [...budget.gastos, newGasto] });
  }

  function updateGasto(id: string, field: keyof GastoEntry, value: string | number) {
    setBudget({ gastos: budget.gastos.map((g) => (g.id === id ? { ...g, [field]: value } : g)) });
  }

  function removeGasto(id: string) {
    setBudget({ gastos: budget.gastos.filter((g) => g.id !== id) });
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="ml-3 text-sm text-stone-400">Cargando presupuesto…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-stone-800">Presupuesto de campaña</h2>
          <p className="mt-0.5 text-xs text-stone-400">
            Facturas de especialistas y gastos reembolsables del proyecto de campo.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="flex items-center gap-2 rounded-md bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {saveState === "saving" ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : saveState === "saved" ? (
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M8.5 1.75a.75.75 0 0 0-1.5 0v5.19L5.03 4.97a.749.749 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.749.749 0 1 0-1.06-1.06L8.5 6.94V1.75ZM3 9.5a.75.75 0 0 0-1.5 0v2.75C1.5 13.216 2.284 14 3.25 14h9.5c.966 0 1.75-.784 1.75-1.75V9.5a.75.75 0 0 0-1.5 0v2.75a.25.25 0 0 1-.25.25h-9.5a.25.25 0 0 1-.25-.25V9.5Z" />
            </svg>
          )}
          {saveState === "saved" ? "Guardado" : saveState === "saving" ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {saveState === "error" && saveError && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
          Error al guardar: {saveError}
        </p>
      )}

      <CampoBudgetPanel
        budget={budget}
        onUpdateConfig={updateBudgetConfig}
        onAddGasto={addGasto}
        onUpdateGasto={updateGasto}
        onRemoveGasto={removeGasto}
      />
    </div>
  );
}
