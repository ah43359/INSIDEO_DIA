// Capítulo 7 — Empresa Consultora.
//
// Per RM 108-2018-MEM/DM Anexo I §7: identifies the consulting firm
// inscribed in the SENACE registry of consultants for environmental
// studies in mining (Resolución de Inscripción), the multidisciplinary
// team and their professional registries (CIP, CMP, etc.), plus a
// declaración jurada with project participation.

import type { DgField, SectionNode as BaseSectionNode } from "@/lib/dia/framework/manifest";
import {
  collectSectionIds,
  findSection as findSectionGeneric,
} from "@/lib/dia/framework/manifest";

export type DgGroupKey =
  | "ec_identificacion"
  | "ec_inscripcion"
  | "ec_equipo"
  | "ec_anexos";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  ec_identificacion: [
    { key: "ec_razonSocial", label: "Razón social de la consultora", placeholder: "Ej: INSIDEO Consultora Ambiental S.A.C." },
    { key: "ec_ruc", label: "RUC", placeholder: "Ej: 20100100100" },
    { key: "ec_domicilio", label: "Domicilio fiscal", placeholder: "Calle, número, distrito, provincia, región" },
    { key: "ec_representanteLegal", label: "Representante legal", placeholder: "Nombre completo y cargo" },
    { key: "ec_dniRL", label: "DNI del representante legal", placeholder: "Ej: 12345678" },
    { key: "ec_telefono", label: "Teléfono de contacto", placeholder: "Ej: 01-234 5678" },
    { key: "ec_correo", label: "Correo electrónico", placeholder: "Ej: contacto@insideo.com" },
  ],
  ec_inscripcion: [
    { key: "ec_resolucionInscripcion", label: "Resolución de inscripción en SENACE", placeholder: "Ej: R.J. N° 084-2017-SENACE/J" },
    { key: "ec_fechaInscripcion", label: "Fecha de inscripción", placeholder: "Ej: 22 de diciembre de 2017" },
    { key: "ec_vigencia", label: "Vigencia de la inscripción", placeholder: "Ej: hasta 22 de diciembre de 2025" },
    { key: "ec_categoriasAmbiente", label: "Categorías y subsectores autorizados", placeholder: "Ej: Subsector Minería — Categoría I, II, III", multiline: true },
  ],
  ec_equipo: [
    { key: "ec_equipoMultidisciplinario", label: "Equipo multidisciplinario (uno por línea, formato: Nombre — Profesión — N° colegiatura — Especialidad)", placeholder: "Ej:\nJuan Pérez — Ing. Ambiental — CIP N° 123456 — Coordinador del estudio\nMaría López — Bióloga — CBP N° 7890 — Especialista en flora\nCarlos Ruiz — Geólogo — CGP N° 4321 — Especialista en geología/hidrogeología", multiline: true },
    { key: "ec_organigrama", label: "Organigrama del equipo (resumen)", placeholder: "Coordinador del estudio + especialistas por disciplina + apoyo de campo + GIS", multiline: true },
  ],
  ec_anexos: [
    { key: "ec_anexoResolucion", label: "Anexo con la Resolución de inscripción y vigencia", placeholder: "Ej: Anexo 7.1" },
    { key: "ec_anexoCV", label: "Anexo con CVs y registros profesionales del equipo", placeholder: "Ej: Anexo 7.2" },
    { key: "ec_anexoDDJJ", label: "Anexo con declaración jurada de participación", placeholder: "Ej: Anexo 7.3" },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "7.0",
    title: "7.0 Empresa Consultora",
    level: 0,
    children: [
      { id: "7.1", title: "7.1 Identificación de la consultora", level: 1, children: [], structuredType: "ec_identificacion" },
      { id: "7.2", title: "7.2 Inscripción en SENACE", level: 1, children: [], structuredType: "ec_inscripcion" },
      { id: "7.3", title: "7.3 Equipo multidisciplinario", level: 1, children: [], structuredType: "ec_equipo" },
      { id: "7.4", title: "7.4 Anexos", level: 1, children: [], structuredType: "ec_anexos" },
    ],
  },
];

export const ALL_SECTION_IDS: readonly string[] = collectSectionIds<DgGroupKey>(SECTIONS);

export function findSection(
  id: string,
  nodes: readonly SectionNode[] = SECTIONS,
): SectionNode | null {
  return findSectionGeneric<DgGroupKey>(id, nodes);
}
