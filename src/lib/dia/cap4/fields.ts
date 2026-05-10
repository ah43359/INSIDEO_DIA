// Capítulo 4 — Plan de Participación Ciudadana (PPC).
//
// Per RM 108-2018-MEM/DM Anexo I §4: aligned with D.S. 028-2008-EM
// (Reglamento de Participación Ciudadana en el Subsector Minero) and
// R.M. 304-2008-MEM/DM (Normas que regulan el Proceso de Participación
// Ciudadana). The PPC describes the activities and mechanisms used
// before, during, and after the EIA elaboration, plus the prior-
// agreement signed with the corresponding authority.

import type { DgField, SectionNode as BaseSectionNode } from "@/lib/dia/framework/manifest";
import {
  collectSectionIds,
  findSection as findSectionGeneric,
} from "@/lib/dia/framework/manifest";

export type DgGroupKey =
  | "ppc_marco"
  | "ppc_ais"
  | "ppc_mecanismos"
  | "ppc_taller"
  | "ppc_resultados"
  | "ppc_anexos";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  ppc_marco: [
    { key: "ppc_marcoLegal", label: "Marco legal del PPC", placeholder: "D.S. 028-2008-EM, R.M. 304-2008-MEM/DM, etc." },
    { key: "ppc_objetivoGeneral", label: "Objetivo general del PPC", placeholder: "Ej: garantizar el acceso oportuno a información ambiental y la canalización de aportes y observaciones de la población", multiline: true },
    { key: "ppc_objetivosEspecificos", label: "Objetivos específicos (uno por línea)", placeholder: "Ej:\nInformar a la población del AID\nRecoger aportes y observaciones\nGenerar mecanismos de relacionamiento", multiline: true },
  ],
  ppc_ais: [
    { key: "ppc_aisdLista", label: "Localidades del Área de Influencia Social Directa (AISD)", placeholder: "Una por línea: nombre, ubigeo, distancia al proyecto", multiline: true },
    { key: "ppc_aisiLista", label: "Localidades del Área de Influencia Social Indirecta (AISI)", placeholder: "Una por línea", multiline: true },
    { key: "ppc_grupoInteresLista", label: "Grupos de interés identificados", placeholder: "Autoridades, gremios, ONGs, líderes locales, etc.", multiline: true },
  ],
  ppc_mecanismos: [
    { key: "ppc_mecanismosLista", label: "Mecanismos de participación a aplicar (uno por línea)", placeholder: "Ej:\nTalleres informativos previos\nBuzones de sugerencias\nVisitas guiadas\nOficina de información permanente\nDifusión radial / paneles", multiline: true },
    { key: "ppc_acuerdoPrevio", label: "Acuerdo previo con la autoridad regional/local", placeholder: "Ej: Acta firmada con la DREM Tacna (fecha)", multiline: true },
    { key: "ppc_anexoActaAcuerdo", label: "Anexo con el acta de acuerdo", placeholder: "Ej: Anexo 4.1" },
  ],
  ppc_taller: [
    { key: "ppc_tallerInformativoFecha", label: "Fecha del taller informativo previo", placeholder: "Ej: 12 de marzo de 2025" },
    { key: "ppc_tallerLugar", label: "Lugar del taller", placeholder: "Ej: Local comunal de Chipispaya" },
    { key: "ppc_tallerConvocatoria", label: "Mecanismo de convocatoria", placeholder: "Ej: oficios, cartelones, radio local — 15 días previos al taller", multiline: true },
    { key: "ppc_tallerAsistentes", label: "Asistentes (registro)", placeholder: "Total y desagregado por género/grupo de interés" },
    { key: "ppc_tallerAgenda", label: "Agenda del taller (resumen)", placeholder: "Presentación de antecedentes, descripción del proyecto, impactos previstos, medidas de manejo, ronda de preguntas", multiline: true },
  ],
  ppc_resultados: [
    { key: "ppc_aportesRecibidos", label: "Aportes y observaciones recibidos (resumen)", placeholder: "Resumen sistematizado por temas (impactos al agua, empleo local, etc.)", multiline: true },
    { key: "ppc_compromisosEspecificos", label: "Compromisos específicos asumidos", placeholder: "Una por línea con el responsable y plazo", multiline: true },
  ],
  ppc_anexos: [
    { key: "ppc_anexoPadron", label: "Anexo con padrón de asistencia", placeholder: "Ej: Anexo 4.2" },
    { key: "ppc_anexoActaTaller", label: "Anexo con acta del taller", placeholder: "Ej: Anexo 4.3" },
    { key: "ppc_anexoMaterial", label: "Anexo con material de difusión", placeholder: "Ej: Anexo 4.4" },
    { key: "ppc_anexoFotografico", label: "Anexo fotográfico", placeholder: "Ej: Anexo 4.5" },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "4.0",
    title: "4.0 Plan de Participación Ciudadana",
    level: 0,
    children: [
      { id: "4.1", title: "4.1 Marco legal y objetivos", level: 1, children: [], structuredType: "ppc_marco" },
      { id: "4.2", title: "4.2 Áreas de influencia social y grupos de interés", level: 1, children: [], structuredType: "ppc_ais" },
      { id: "4.3", title: "4.3 Mecanismos de participación", level: 1, children: [], structuredType: "ppc_mecanismos" },
      { id: "4.4", title: "4.4 Taller informativo previo", level: 1, children: [], structuredType: "ppc_taller" },
      { id: "4.5", title: "4.5 Resultados, aportes y compromisos", level: 1, children: [], structuredType: "ppc_resultados" },
      { id: "4.6", title: "4.6 Anexos del PPC", level: 1, children: [], structuredType: "ppc_anexos" },
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
