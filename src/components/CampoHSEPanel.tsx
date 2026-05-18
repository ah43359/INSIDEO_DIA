"use client";

// ── Types (exported so CampoPanel can import them) ────────────────────────────

export interface PersonnelHSEEntry {
  id: string;
  nombre: string;
  empresa: string;
  rol: string;
  sctr: boolean;
  examen_medico: boolean;
  epp: boolean;
  induccion: boolean;
  pets: boolean;
  contacto_emergencia: string;
  notas: string;
}

export interface VehicleHSEEntry {
  id: string;
  placa: string;
  tipo: string;
  empresa: string;
  conductor: string;
  soat: boolean;
  revision_tecnica: boolean;
  seguro: boolean;
  extintor: boolean;
  botiquin: boolean;
  gps: boolean;
  licencia: boolean;
  notas: string;
}

export interface EnvChecklist {
  kit_derrames: boolean;
  plan_residuos: boolean;
  sin_plasticos: boolean;
  registro_combustibles: boolean;
  permiso_ingreso: boolean;
  plan_contingencia: boolean;
}

export const DEFAULT_ENV_CHECKLIST: EnvChecklist = {
  kit_derrames: false,
  plan_residuos: false,
  sin_plasticos: false,
  registro_combustibles: false,
  permiso_ingreso: false,
  plan_contingencia: false,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  personal: PersonnelHSEEntry[];
  vehiculos: VehicleHSEEntry[];
  env: EnvChecklist;
  onUpdatePersonal: (id: string, field: keyof PersonnelHSEEntry, value: string | boolean) => void;
  onRemovePersonal: (id: string) => void;
  onAddPersonal: () => void;
  onUpdateVehiculo: (id: string, field: keyof VehicleHSEEntry, value: string | boolean) => void;
  onRemoveVehiculo: (id: string) => void;
  onAddVehiculo: () => void;
  onUpdateEnv: (field: keyof EnvChecklist, value: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CampoHSEPanel({
  personal,
  vehiculos,
  env,
  onUpdatePersonal,
  onRemovePersonal,
  onAddPersonal,
  onUpdateVehiculo,
  onRemoveVehiculo,
  onAddVehiculo,
  onUpdateEnv,
}: Props) {
  const totalPersonal = personal.length;
  const compliantPersonal = personal.filter(
    (p) => p.sctr && p.examen_medico && p.epp && p.induccion && p.pets,
  ).length;

  const totalVehiculos = vehiculos.length;
  const compliantVehiculos = vehiculos.filter(
    (v) => v.soat && v.revision_tecnica && v.seguro && v.extintor && v.botiquin && v.gps && v.licencia,
  ).length;

  const envItems = Object.values(env);
  const envCompliant = envItems.filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <ComplianceKpi label="Personal" done={compliantPersonal} total={totalPersonal} />
        <ComplianceKpi label="Vehículos" done={compliantVehiculos} total={totalVehiculos} />
        <ComplianceKpi label="Ambiente" done={envCompliant} total={envItems.length} />
      </div>

      {/* Section 1 — Personal */}
      <HSECard
        title="Requerimientos por persona"
        subtitle="SCTR · Examen médico · EPP · Inducción SSO · PETS/ATS"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                <th className="px-3 py-2.5">Nombre</th>
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5">Rol</th>
                <th className="px-3 py-2.5 text-center" title="SCTR">SCTR</th>
                <th className="px-3 py-2.5 text-center" title="Examen médico ocupacional">Med.</th>
                <th className="px-3 py-2.5 text-center" title="EPP asignado">EPP</th>
                <th className="px-3 py-2.5 text-center" title="Inducción SSO">Ind.</th>
                <th className="px-3 py-2.5 text-center" title="PETS / ATS firmados">PETS</th>
                <th className="px-3 py-2.5">Contacto emergencia</th>
                <th className="px-3 py-2.5">Notas</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {personal.map((row) => {
                const allOk = row.sctr && row.examen_medico && row.epp && row.induccion && row.pets;
                return (
                  <tr key={row.id} className={`${allOk ? "bg-emerald-50/30" : ""} hover:bg-stone-50/50`}>
                    <td className="px-3 py-2">
                      <input
                        value={row.nombre}
                        onChange={(e) => onUpdatePersonal(row.id, "nombre", e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full min-w-[120px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.empresa}
                        onChange={(e) => onUpdatePersonal(row.id, "empresa", e.target.value)}
                        placeholder="Empresa"
                        className="w-full min-w-[90px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.rol}
                        onChange={(e) => onUpdatePersonal(row.id, "rol", e.target.value)}
                        placeholder="Rol"
                        className="w-full min-w-[80px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    {(["sctr", "examen_medico", "epp", "induccion", "pets"] as const).map((field) => (
                      <td key={field} className="px-3 py-2 text-center">
                        <CheckBox
                          checked={row[field] as boolean}
                          onChange={(v) => onUpdatePersonal(row.id, field, v)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <input
                        value={row.contacto_emergencia}
                        onChange={(e) => onUpdatePersonal(row.id, "contacto_emergencia", e.target.value)}
                        placeholder="Nombre · teléfono"
                        className="w-full min-w-[130px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.notas}
                        onChange={(e) => onUpdatePersonal(row.id, "notas", e.target.value)}
                        placeholder="Notas…"
                        className="w-full min-w-[90px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <RemoveBtn onClick={() => onRemovePersonal(row.id)} />
                    </td>
                  </tr>
                );
              })}
              {personal.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-xs text-stone-400">
                    Sin personal registrado. Añade a cada persona que participará en la campaña.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 px-3">
          <AddBtn onClick={onAddPersonal} label="Añadir persona" />
        </div>
        <p className="mt-2 px-3 text-[10px] text-stone-400">
          SCTR: Seguro Complementario de Trabajo de Riesgo · Med.: Examen médico ocupacional vigente ·
          Ind.: Inducción en Seguridad y Salud Ocupacional · PETS: Procedimiento Escrito de Trabajo Seguro firmado
        </p>
      </HSECard>

      {/* Section 2 — Vehículos */}
      <HSECard
        title="Requerimientos por vehículo"
        subtitle="SOAT · Revisión técnica · Seguro · Equipos de emergencia · GPS"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                <th className="px-3 py-2.5">Placa</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5">Conductor</th>
                <th className="px-3 py-2.5 text-center" title="SOAT vigente">SOAT</th>
                <th className="px-3 py-2.5 text-center" title="Revisión técnica vigente">Rev.Téc.</th>
                <th className="px-3 py-2.5 text-center" title="Seguro vehicular">Seguro</th>
                <th className="px-3 py-2.5 text-center" title="Extintor operativo">Extint.</th>
                <th className="px-3 py-2.5 text-center" title="Botiquín de primeros auxilios">Botiq.</th>
                <th className="px-3 py-2.5 text-center" title="GPS / comunicación satelital">GPS</th>
                <th className="px-3 py-2.5 text-center" title="Licencia de conducir vigente">Licencia</th>
                <th className="px-3 py-2.5">Notas</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {vehiculos.map((row) => {
                const allOk = row.soat && row.revision_tecnica && row.seguro && row.extintor && row.botiquin && row.gps && row.licencia;
                return (
                  <tr key={row.id} className={`${allOk ? "bg-emerald-50/30" : ""} hover:bg-stone-50/50`}>
                    <td className="px-3 py-2">
                      <input
                        value={row.placa}
                        onChange={(e) => onUpdateVehiculo(row.id, "placa", e.target.value)}
                        placeholder="ABC-123"
                        className="w-24 rounded border-0 bg-transparent font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.tipo}
                        onChange={(e) => onUpdateVehiculo(row.id, "tipo", e.target.value)}
                        placeholder="Camioneta 4x4"
                        className="w-full min-w-[100px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.empresa}
                        onChange={(e) => onUpdateVehiculo(row.id, "empresa", e.target.value)}
                        placeholder="Empresa"
                        className="w-full min-w-[90px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.conductor}
                        onChange={(e) => onUpdateVehiculo(row.id, "conductor", e.target.value)}
                        placeholder="Conductor"
                        className="w-full min-w-[100px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    {(["soat", "revision_tecnica", "seguro", "extintor", "botiquin", "gps", "licencia"] as const).map((field) => (
                      <td key={field} className="px-3 py-2 text-center">
                        <CheckBox
                          checked={row[field] as boolean}
                          onChange={(v) => onUpdateVehiculo(row.id, field, v)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <input
                        value={row.notas}
                        onChange={(e) => onUpdateVehiculo(row.id, "notas", e.target.value)}
                        placeholder="Notas…"
                        className="w-full min-w-[90px] rounded border-0 bg-transparent text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <RemoveBtn onClick={() => onRemoveVehiculo(row.id)} />
                    </td>
                  </tr>
                );
              })}
              {vehiculos.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-6 text-center text-xs text-stone-400">
                    Sin vehículos registrados. Añade cada unidad que participará en la campaña.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 px-3">
          <AddBtn onClick={onAddVehiculo} label="Añadir vehículo" />
        </div>
      </HSECard>

      {/* Section 3 — Environmental checklist */}
      <HSECard
        title="Checklist ambiental de campaña"
        subtitle="Requisitos de gestión ambiental para la salida de campo"
      >
        <ul className="divide-y divide-stone-50">
          {ENV_ITEMS.map(({ field, label, description }) => (
            <li key={field} className="flex items-start gap-4 px-5 py-3.5">
              <CheckBox
                checked={env[field]}
                onChange={(v) => onUpdateEnv(field, v)}
                size="lg"
              />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${env[field] ? "text-stone-500 line-through" : "text-stone-800"}`}>
                  {label}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </HSECard>
    </div>
  );
}

// ── Static env checklist definition ──────────────────────────────────────────

const ENV_ITEMS: { field: keyof EnvChecklist; label: string; description: string }[] = [
  {
    field: "kit_derrames",
    label: "Kit de derrames disponible en cada vehículo",
    description: "Absorbentes, bandeja, bolsas de residuos peligrosos y guantes en cada unidad.",
  },
  {
    field: "plan_residuos",
    label: "Plan de manejo de residuos sólidos",
    description: "Segregación en campo: orgánicos, inorgánicos y peligrosos. Devolución al origen.",
  },
  {
    field: "sin_plasticos",
    label: "Prohibición de plásticos de un solo uso",
    description: "Botellas, bolsas y utensilios desechables reemplazados por alternativas reutilizables.",
  },
  {
    field: "registro_combustibles",
    label: "Registro de combustibles y lubricantes",
    description: "Control de cantidades transportadas y disposición final de envases.",
  },
  {
    field: "permiso_ingreso",
    label: "Permiso de ingreso al área de estudio",
    description: "Autorización del titular de la concesión y/o comunidad campesina correspondiente.",
  },
  {
    field: "plan_contingencia",
    label: "Plan de contingencia ante emergencias ambientales",
    description: "Protocolo de respuesta ante derrames, incendios o accidentes en el área de estudio.",
  },
];

// ── Shared primitives ─────────────────────────────────────────────────────────

function CheckBox({
  checked,
  onChange,
  size = "sm",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "lg";
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`inline-flex items-center justify-center rounded transition ${
        size === "lg" ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"
      } ${
        checked
          ? "bg-emerald-600 text-white"
          : "border border-stone-300 bg-white text-transparent hover:border-emerald-400"
      }`}
    >
      <svg viewBox="0 0 12 12" fill="none" className={size === "lg" ? "h-3 w-3" : "h-2.5 w-2.5"}>
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function HSECard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
        <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>
      </div>
      <div className="pt-0">{children}</div>
    </section>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 transition hover:text-emerald-600"
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
      </svg>
      {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded p-1 text-stone-300 transition hover:bg-red-50 hover:text-red-500"
      aria-label="Eliminar fila"
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

function ComplianceKpi({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct === 100 ? "emerald" : pct >= 50 ? "amber" : "red";
  const ring = { emerald: "ring-emerald-200", amber: "ring-amber-200", red: "ring-red-200" }[color];
  const text = { emerald: "text-emerald-700", amber: "text-amber-700", red: "text-red-700" }[color];
  const bg = { emerald: "bg-emerald-50", amber: "bg-amber-50", red: "bg-red-50" }[color];

  return (
    <div className={`rounded-xl p-4 ring-1 ${ring} ${bg}`}>
      <p className={`text-2xl font-bold tabular-nums ${text}`}>
        {done}/{total}
      </p>
      <p className={`mt-0.5 text-[11px] font-medium ${text}`}>{label} compliant</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
        <div
          className={`h-full rounded-full transition-all ${
            color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-400" : "bg-red-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
