"use client";

import { useEffect, useReducer, useState } from "react";
import CampoHSEPanel, {
  DEFAULT_ENV_CHECKLIST,
  type EnvChecklist,
  type PersonnelHSEEntry,
  type VehicleHSEEntry,
} from "./CampoHSEPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

type EstadoContrato = "pendiente" | "contactado" | "cotizado" | "contratado";

interface LabEntry {
  id: string;
  parametro: string;
  lab: string;
  contacto: string;
  email: string;
  estado: EstadoContrato;
  notas: string;
}

interface PersonalEntry {
  id: string;
  especialidad: string;
  empresa: string;
  especialista: string;
  email: string;
  estado: EstadoContrato;
  notas: string;
}

interface CampoPlan {
  laboratorios: LabEntry[];
  biologicos: PersonalEntry[];
  inspectores: PersonalEntry[];
  sociales: PersonalEntry[];
  logistica_email: string;
  notas_generales: string;
  hse_personal: PersonnelHSEEntry[];
  hse_vehiculos: VehicleHSEEntry[];
  hse_env: EnvChecklist;
  vehiculos_requeridos: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_LABS: LabEntry[] = [
  "Calidad de Aire",
  "Agua Superficial",
  "Agua Subterránea",
  "Suelos",
  "Sedimentos",
  "Ruido Ambiental",
  "Vibraciones",
].map((parametro, i) => ({
  id: `lab-${i}`,
  parametro,
  lab: "",
  contacto: "",
  email: "",
  estado: "pendiente",
  notas: "",
}));

const DEFAULT_BIOLOGICOS: PersonalEntry[] = [
  "Vegetación (Flora)",
  "Mamíferos",
  "Aves",
  "Anfibios",
  "Reptiles",
  "Insectos",
  "Peces",
  "Macroinvertebrados bentónicos",
].map((especialidad, i) => ({
  id: `bio-${i}`,
  especialidad,
  empresa: "",
  especialista: "",
  email: "",
  estado: "pendiente",
  notas: "",
}));

const DEFAULT_INSPECTORES: PersonalEntry[] = [
  "Cuerpos de agua (cartografía)",
  "Infraestructura (cartografía)",
  "Pasivos ambientales",
  "Geología",
  "Suelos (perfil y descripción)",
].map((especialidad, i) => ({
  id: `insp-${i}`,
  especialidad,
  empresa: "",
  especialista: "",
  email: "",
  estado: "pendiente",
  notas: "",
}));

const DEFAULT_SOCIALES: PersonalEntry[] = [
  "Entrevistas a informantes clave",
  "Encuestas a unidades domésticas",
].map((especialidad, i) => ({
  id: `soc-${i}`,
  especialidad,
  empresa: "",
  especialista: "",
  email: "",
  estado: "pendiente",
  notas: "",
}));

const DEFAULT_PLAN: CampoPlan = {
  laboratorios: DEFAULT_LABS,
  biologicos: DEFAULT_BIOLOGICOS,
  inspectores: DEFAULT_INSPECTORES,
  sociales: DEFAULT_SOCIALES,
  logistica_email: "",
  notas_generales: "",
  hse_personal: [],
  hse_vehiculos: [],
  hse_env: DEFAULT_ENV_CHECKLIST,
  vehiculos_requeridos: 0,
};

// ── Known labs for datalist ───────────────────────────────────────────────────

const KNOWN_LABS = ["ALS", "AGQ", "SGS", "Inspectorate", "Envirolab", "CORPLAB", "CERPER"];

// ── Estado badge ──────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<EstadoContrato, string> = {
  pendiente: "bg-stone-100 text-stone-600",
  contactado: "bg-blue-50 text-blue-700",
  cotizado: "bg-amber-50 text-amber-700",
  contratado: "bg-emerald-50 text-emerald-700",
};

// ── uid helper ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CampoPanelProps {
  projectId: string;
  projectName: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

type ActivePanel = "logistica" | "hse";
type SaveState = "idle" | "saving" | "saved" | "error";
type DocxState = "idle" | "generating" | "error";
type EmailState = "idle" | "preparing" | "ready" | "error";

export default function CampoPanel({ projectId, projectName }: CampoPanelProps) {
  const [plan, setPlan] = useReducer(
    (prev: CampoPlan, patch: Partial<CampoPlan>) => ({ ...prev, ...patch }),
    DEFAULT_PLAN,
  );
  const [loaded, setLoaded] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("logistica");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [docxState, setDocxState] = useState<DocxState>("idle");
  const [emailState, setEmailState] = useState<EmailState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load saved plan on mount
  useEffect(() => {
    fetch(`/api/projects/${projectId}/campo`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setPlan({
            laboratorios: data.laboratorios?.length ? data.laboratorios : DEFAULT_PLAN.laboratorios,
            biologicos: data.biologicos?.length ? data.biologicos : DEFAULT_PLAN.biologicos,
            inspectores: data.inspectores?.length ? data.inspectores : DEFAULT_PLAN.inspectores,
            sociales: data.sociales?.length ? data.sociales : DEFAULT_PLAN.sociales,
            logistica_email: data.logistica_email ?? "",
            notas_generales: data.notas_generales ?? "",
            hse_personal: data.hse_personal ?? [],
            hse_vehiculos: data.hse_vehiculos ?? [],
            hse_env: data.hse_env ?? DEFAULT_ENV_CHECKLIST,
            vehiculos_requeridos: data.vehiculos_requeridos ?? 0,
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [projectId]);

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/campo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error desconocido");
      setSaveState("error");
    }
  }

  async function handleDownloadDocx() {
    setDocxState("generating");
    try {
      const res = await fetch(`/api/projects/${projectId}/campo/docx`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PlanCampo_${projectName.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setDocxState("idle");
    } catch {
      setDocxState("error");
      setTimeout(() => setDocxState("idle"), 3000);
    }
  }

  async function handleSendEmail() {
    const email = plan.logistica_email.trim();
    if (!email) {
      alert("Ingresa el correo del equipo de logística antes de enviar.");
      return;
    }

    // Step 1: download the .docx so the user has the file ready to attach
    setEmailState("preparing");
    try {
      const res = await fetch(`/api/projects/${projectId}/campo/docx`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `PlanCampo_${projectName.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setEmailState("error");
      setTimeout(() => setEmailState("idle"), 3000);
      return;
    }

    // Step 2: open the mail client
    const contratadosCount = [
      ...plan.laboratorios,
      ...plan.biologicos,
      ...plan.inspectores,
      ...plan.sociales,
    ].filter((r) => r.estado === "contratado").length;
    const totalCount =
      plan.laboratorios.length + plan.biologicos.length + plan.inspectores.length + plan.sociales.length;

    const subject = encodeURIComponent(`Plan de Campo – ${projectName}`);
    const body = encodeURIComponent(
      `Equipo de logística,\n\nAdjunto el Plan de Campo para el proyecto: ${projectName}.\n\n` +
        `Estado actual: ${contratadosCount} de ${totalCount} especialistas/laboratorios contratados.\n\n` +
        `Por favor adjuntar el archivo PlanCampo_${projectName.replace(/\s+/g, "_")}.docx que se acaba de descargar.\n\n` +
        `Saludos.`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");

    // Step 3: show attachment reminder banner
    setEmailState("ready");
    setTimeout(() => setEmailState("idle"), 8000);
  }

  // ── Lab row updater
  function updateLab(id: string, field: keyof LabEntry, value: string) {
    setPlan({
      laboratorios: plan.laboratorios.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  }

  function removeLab(id: string) {
    setPlan({ laboratorios: plan.laboratorios.filter((r) => r.id !== id) });
  }

  function addLab() {
    setPlan({
      laboratorios: [
        ...plan.laboratorios,
        { id: uid(), parametro: "", lab: "", contacto: "", email: "", estado: "pendiente", notas: "" },
      ],
    });
  }

  // ── Personal row updater (shared for biologicos / inspectores / sociales)
  function updatePersonal(
    section: "biologicos" | "inspectores" | "sociales",
    id: string,
    field: keyof PersonalEntry,
    value: string,
  ) {
    setPlan({
      [section]: plan[section].map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  }

  function removePersonal(section: "biologicos" | "inspectores" | "sociales", id: string) {
    setPlan({ [section]: plan[section].filter((r) => r.id !== id) });
  }

  function addPersonal(section: "biologicos" | "inspectores" | "sociales") {
    setPlan({
      [section]: [
        ...plan[section],
        { id: uid(), especialidad: "", empresa: "", especialista: "", email: "", estado: "pendiente", notas: "" },
      ],
    });
  }

  // ── HSE handlers ───────────────────────────────────────────────────────────

  function updateHSEPersonal(id: string, field: keyof PersonnelHSEEntry, value: string | boolean) {
    setPlan({ hse_personal: plan.hse_personal.map((r) => (r.id === id ? { ...r, [field]: value } : r)) });
  }

  function removeHSEPersonal(id: string) {
    setPlan({ hse_personal: plan.hse_personal.filter((r) => r.id !== id) });
  }

  function addHSEPersonal() {
    setPlan({
      hse_personal: [
        ...plan.hse_personal,
        { id: uid(), nombre: "", empresa: "", rol: "", sctr: false, examen_medico: false, epp: false, induccion: false, pets: false, contacto_emergencia: "", notas: "" },
      ],
    });
  }

  function updateHSEVehiculo(id: string, field: keyof VehicleHSEEntry, value: string | boolean) {
    setPlan({ hse_vehiculos: plan.hse_vehiculos.map((r) => (r.id === id ? { ...r, [field]: value } : r)) });
  }

  function removeHSEVehiculo(id: string) {
    setPlan({ hse_vehiculos: plan.hse_vehiculos.filter((r) => r.id !== id) });
  }

  function addHSEVehiculo() {
    setPlan({
      hse_vehiculos: [
        ...plan.hse_vehiculos,
        { id: uid(), placa: "", tipo: "", empresa: "", conductor: "", soat: false, revision_tecnica: false, seguro: false, extintor: false, botiquin: false, gps: false, licencia: false, notas: "" },
      ],
    });
  }

  function updateHSEEnv(field: keyof EnvChecklist, value: boolean) {
    setPlan({ hse_env: { ...plan.hse_env, [field]: value } });
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="ml-3 text-sm text-stone-400">Cargando plan…</span>
      </div>
    );
  }

  const totalPersonnel =
    plan.laboratorios.length + plan.biologicos.length + plan.inspectores.length + plan.sociales.length;
  const vehiculosSugeridos = totalPersonnel > 0 ? Math.ceil(totalPersonnel / 4) : 1;
  const vehiculosDisplay = plan.vehiculos_requeridos || vehiculosSugeridos;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-800">Plan de Campo</h2>
            <p className="mt-0.5 text-xs text-stone-400">
              Logística, laboratorios, personal especializado y cumplimiento SSO/ambiental para la campaña de línea base.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="flex items-center gap-2 rounded-md bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {saveState === "saving" ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : saveState === "saved" ? (
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M8.5 1.75a.75.75 0 0 0-1.5 0v5.19L5.03 4.97a.749.749 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.749.749 0 1 0-1.06-1.06L8.5 6.94V1.75ZM3 9.5a.75.75 0 0 0-1.5 0v2.75C1.5 13.216 2.284 14 3.25 14h9.5c.966 0 1.75-.784 1.75-1.75V9.5a.75.75 0 0 0-1.5 0v2.75a.25.25 0 0 1-.25.25h-9.5a.25.25 0 0 1-.25-.25V9.5Z" /></svg>
            )}
            {saveState === "saved" ? "Guardado" : saveState === "saving" ? "Guardando…" : "Guardar"}
          </button>

          <button
            onClick={handleDownloadDocx}
            disabled={docxState === "generating"}
            className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
          >
            {docxState === "generating" ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M8 1a.75.75 0 0 1 .75.75v6.69l1.97-1.97a.75.75 0 1 1 1.06 1.06L8 11.31 4.22 7.53a.75.75 0 1 1 1.06-1.06L7.25 8.44V1.75A.75.75 0 0 1 8 1ZM1.5 13.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Z" /></svg>
            )}
            {docxState === "generating" ? "Generando…" : "Descargar .docx"}
          </button>
          </div>
        </div>

        {/* Vehicle requirement */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-stone-100 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Vehículos requeridos
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={vehiculosDisplay}
                onChange={(e) =>
                  setPlan({ vehiculos_requeridos: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-16 rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-stone-800 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <span className="text-xs text-stone-500">camionetas</span>
              {plan.vehiculos_requeridos > 0 && plan.vehiculos_requeridos !== vehiculosSugeridos && (
                <button
                  onClick={() => setPlan({ vehiculos_requeridos: 0 })}
                  className="text-[10px] text-stone-400 underline hover:text-stone-600"
                >
                  restablecer
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-stone-400">
            {totalPersonnel} persona{totalPersonnel !== 1 ? "s" : ""} en campo
            <span className="mx-1.5 text-stone-300">·</span>
            {vehiculosSugeridos} sugerido{vehiculosSugeridos !== 1 ? "s" : ""} (4 asientos / camioneta)
          </p>
        </div>
      </div>

      {saveState === "error" && saveError && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">Error al guardar: {saveError}</p>
      )}

      {/* Tab strip */}
      <div className="flex gap-0 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
        {(["logistica", "hse"] as const).map((panel) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activePanel === panel
                ? "bg-stone-800 text-white shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {panel === "logistica" ? "Logística" : "Seguridad, Salud y Ambiente"}
          </button>
        ))}
      </div>

      {activePanel === "hse" ? (
        <CampoHSEPanel
          personal={plan.hse_personal}
          vehiculos={plan.hse_vehiculos}
          env={plan.hse_env}
          onUpdatePersonal={updateHSEPersonal}
          onRemovePersonal={removeHSEPersonal}
          onAddPersonal={addHSEPersonal}
          onUpdateVehiculo={updateHSEVehiculo}
          onRemoveVehiculo={removeHSEVehiculo}
          onAddVehiculo={addHSEVehiculo}
          onUpdateEnv={updateHSEEnv}
        />
      ) : (
        <>
      {/* Section 1 — Laboratorios */}
      <SectionCard title="1. Laboratorios INACAL — Calidad Ambiental" count={plan.laboratorios.length} badge="Laboratorios">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                <th className="px-3 py-2.5">Parámetro</th>
                <th className="px-3 py-2.5">Laboratorio</th>
                <th className="px-3 py-2.5">Contacto</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Notas</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {plan.laboratorios.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/50">
                  <td className="px-3 py-2">
                    <input
                      value={row.parametro}
                      onChange={(e) => updateLab(row.id, "parametro", e.target.value)}
                      className="w-full min-w-[120px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="Parámetro"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <>
                      <input
                        value={row.lab}
                        onChange={(e) => updateLab(row.id, "lab", e.target.value)}
                        list="known-labs"
                        className="w-full min-w-[90px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        placeholder="ALS, SGS…"
                      />
                      <datalist id="known-labs">
                        {KNOWN_LABS.map((l) => <option key={l} value={l} />)}
                      </datalist>
                    </>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.contacto}
                      onChange={(e) => updateLab(row.id, "contacto", e.target.value)}
                      className="w-full min-w-[100px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="Nombre"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="email"
                      value={row.email}
                      onChange={(e) => updateLab(row.id, "email", e.target.value)}
                      className="w-full min-w-[130px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="correo@lab.com"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.estado}
                      onChange={(e) => updateLab(row.id, "estado", e.target.value as EstadoContrato)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium focus:outline-none ${ESTADO_STYLES[row.estado]}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="contactado">Contactado</option>
                      <option value="cotizado">Cotizado</option>
                      <option value="contratado">Contratado</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.notas}
                      onChange={(e) => updateLab(row.id, "notas", e.target.value)}
                      className="w-full min-w-[100px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="Notas…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeLab(row.id)}
                      className="rounded p-1 text-stone-300 transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Eliminar fila"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" /><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddRowButton onClick={addLab} label="Añadir parámetro" />
      </SectionCard>

      {/* Section 2 — Personal biológico */}
      <SectionCard title="2. Personal Biológico Externo" count={plan.biologicos.length} badge="Biológico">
        <PersonalTable
          rows={plan.biologicos}
          section="biologicos"
          onUpdate={updatePersonal}
          onRemove={removePersonal}
          onAdd={() => addPersonal("biologicos")}
          addLabel="Añadir especialidad"
        />
      </SectionCard>

      {/* Section 3 — Inspectores */}
      <SectionCard title="3. Inspectores Ambientales" count={plan.inspectores.length} badge="Inspección">
        <PersonalTable
          rows={plan.inspectores}
          section="inspectores"
          onUpdate={updatePersonal}
          onRemove={removePersonal}
          onAdd={() => addPersonal("inspectores")}
          addLabel="Añadir inspector"
        />
      </SectionCard>

      {/* Section 4 — Especialistas sociales */}
      <SectionCard title="4. Especialistas Sociales" count={plan.sociales.length} badge="Social">
        <PersonalTable
          rows={plan.sociales}
          section="sociales"
          onUpdate={updatePersonal}
          onRemove={removePersonal}
          onAdd={() => addPersonal("sociales")}
          addLabel="Añadir especialista"
        />
      </SectionCard>

      {/* Email + Notes */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Enviar por correo</h3>
          <p className="mb-3 text-xs text-stone-400">
            Descarga el .docx y abre tu cliente de correo en un solo clic. Adjunta el archivo descargado antes de enviar.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={plan.logistica_email}
              onChange={(e) => setPlan({ logistica_email: e.target.value })}
              placeholder="logistica@empresa.com"
              className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <button
              onClick={handleSendEmail}
              disabled={emailState === "preparing"}
              className="flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
            >
              {emailState === "preparing" ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                  <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                </svg>
              )}
              {emailState === "preparing" ? "Preparando…" : "Enviar"}
            </button>
          </div>

          {emailState === "ready" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-amber-800">
                El archivo <span className="font-mono font-semibold">PlanCampo_{projectName.replace(/\s+/g, "_")}.docx</span> se descargó en tu equipo.
                Adjúntalo al correo antes de enviarlo.
              </p>
            </div>
          )}

          {emailState === "error" && (
            <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              Error al generar el documento. Intenta de nuevo.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Notas generales</h3>
          <textarea
            value={plan.notas_generales}
            onChange={(e) => setPlan({ notas_generales: e.target.value })}
            rows={4}
            placeholder="Observaciones sobre la campaña de campo, fechas tentativas, requerimientos especiales…"
            className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Progress summary */}
      <ProgressSummary plan={plan} />
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  count,
  badge,
  children,
}: {
  title: string;
  count: number;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
          {count} {badge === "Laboratorios" ? count === 1 ? "lab" : "labs" : count === 1 ? "ítem" : "ítems"}
        </span>
      </div>
      <div className="p-5 pt-0">{children}</div>
    </section>
  );
}

function PersonalTable({
  rows,
  section,
  onUpdate,
  onRemove,
  onAdd,
  addLabel,
}: {
  rows: PersonalEntry[];
  section: "biologicos" | "inspectores" | "sociales";
  onUpdate: (section: "biologicos" | "inspectores" | "sociales", id: string, field: keyof PersonalEntry, value: string) => void;
  onRemove: (section: "biologicos" | "inspectores" | "sociales", id: string) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              <th className="px-3 py-2.5">Especialidad</th>
              <th className="px-3 py-2.5">Empresa</th>
              <th className="px-3 py-2.5">Especialista</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Notas</th>
              <th className="w-8 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-stone-50/50">
                <td className="px-3 py-2">
                  <input
                    value={row.especialidad}
                    onChange={(e) => onUpdate(section, row.id, "especialidad", e.target.value)}
                    className="w-full min-w-[130px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="Especialidad"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.empresa}
                    onChange={(e) => onUpdate(section, row.id, "empresa", e.target.value)}
                    className="w-full min-w-[100px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="Empresa"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.especialista}
                    onChange={(e) => onUpdate(section, row.id, "especialista", e.target.value)}
                    className="w-full min-w-[100px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="Nombre"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => onUpdate(section, row.id, "email", e.target.value)}
                    className="w-full min-w-[130px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="correo@empresa.com"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.estado}
                    onChange={(e) => onUpdate(section, row.id, "estado", e.target.value as EstadoContrato)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium focus:outline-none ${ESTADO_STYLES[row.estado]}`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="contactado">Contactado</option>
                    <option value="cotizado">Cotizado</option>
                    <option value="contratado">Contratado</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.notas}
                    onChange={(e) => onUpdate(section, row.id, "notas", e.target.value)}
                    className="w-full min-w-[100px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="Notas…"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onRemove(section, row.id)}
                    className="rounded p-1 text-stone-300 transition hover:bg-red-50 hover:text-red-500"
                    aria-label="Eliminar fila"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" /><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddRowButton onClick={onAdd} label={addLabel} />
    </>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="mt-3 px-3">
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 transition hover:text-emerald-600"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
        </svg>
        {label}
      </button>
    </div>
  );
}

function ProgressSummary({ plan }: { plan: CampoPlan }) {
  const allRows = [
    ...plan.laboratorios,
    ...plan.biologicos,
    ...plan.inspectores,
    ...plan.sociales,
  ];
  const total = allRows.length;
  const byEstado = {
    pendiente: allRows.filter((r) => r.estado === "pendiente").length,
    contactado: allRows.filter((r) => r.estado === "contactado").length,
    cotizado: allRows.filter((r) => r.estado === "cotizado").length,
    contratado: allRows.filter((r) => r.estado === "contratado").length,
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-stone-700">Resumen de contratación</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["pendiente", "contactado", "cotizado", "contratado"] as const).map((estado) => {
          const count = byEstado[estado];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const labels: Record<EstadoContrato, string> = {
            pendiente: "Pendiente",
            contactado: "Contactado",
            cotizado: "Cotizado",
            contratado: "Contratado",
          };
          return (
            <div key={estado} className={`rounded-lg p-4 ${ESTADO_STYLES[estado]}`}>
              <p className="text-2xl font-bold tabular-nums">{count}</p>
              <p className="mt-0.5 text-[11px] font-medium">{labels[estado]}</p>
              <p className="mt-1 text-[10px] opacity-70">{pct}% del total</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
