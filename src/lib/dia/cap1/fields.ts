// Capítulo 1 — Resumen Ejecutivo (RE).
//
// Per RM 108-2018-MEM/DM, Anexo I, item 1: the RE summarizes the project
// in clear, simple, concise Spanish. It must cover location/effective
// area, influence areas, mining rights, exploration activities and
// schedule, baseline conditions, participation mechanisms, impacts, the
// environmental management plan, mitigation/closure measures, total
// investment, and ANP overlay status.

import type { DgField, SectionNode as BaseSectionNode } from "@/lib/dia/framework/manifest";
import {
  collectSectionIds,
  findSection as findSectionGeneric,
} from "@/lib/dia/framework/manifest";

export type DgGroupKey =
  | "re_contexto"
  | "re_ubicacion"
  | "re_componentes"
  | "re_areaInfluencia"
  | "re_concesiones"
  | "re_actividades"
  | "re_lineaBase"
  | "re_participacion"
  | "re_impactos"
  | "re_pma"
  | "re_inversion"
  | "re_anp";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  re_contexto: [
    { key: "re_visionGeneral", label: "Visión general del Proyecto", placeholder: "Resumen de 1-2 párrafos sobre la naturaleza del proyecto, sus objetivos y alcance.", multiline: true },
    { key: "re_objetivoEstudio", label: "Objetivo del estudio (DIA)", placeholder: "Ej: Sustentar la aprobación de la DIA Categoría I del Proyecto…", multiline: true },
    { key: "re_lenguajeAdicional", label: "Idioma o dialecto del AID (RM 108)", placeholder: "Ej: castellano (no hay otra lengua predominante en el AID)" },
  ],
  re_ubicacion: [
    { key: "re_distrito", label: "Distrito", placeholder: "Ej: Héroes Albarracín" },
    { key: "re_provincia", label: "Provincia", placeholder: "Ej: Tarata" },
    { key: "re_region", label: "Región", placeholder: "Ej: Tacna" },
    { key: "re_coordEste", label: "Coordenada Este (UTM, WGS84)", placeholder: "Ej: 371000" },
    { key: "re_coordNorte", label: "Coordenada Norte (UTM, WGS84)", placeholder: "Ej: 8067000" },
    { key: "re_utmZona", label: "Zona UTM", placeholder: "Ej: 19S" },
    { key: "re_areaEfectivaHa", label: "Área efectiva (ha)", placeholder: "Ej: 507" },
  ],
  re_componentes: [
    { key: "re_numPlataformas", label: "Plataformas de perforación (hasta)", placeholder: "Ej: 34" },
    { key: "re_numSondajes", label: "Total de sondajes", placeholder: "Ej: 62" },
    { key: "re_kmAccesos", label: "Kilómetros de accesos", placeholder: "Ej: 16.225" },
    { key: "re_componentesAuxiliares", label: "Componentes auxiliares (lista breve)", placeholder: "Ej: 1 patio de control, 1 helipuerto, 3 piscinas, 20 trincheras", multiline: true },
  ],
  re_areaInfluencia: [
    { key: "re_aiadHa", label: "Área de influencia ambiental directa (ha)", placeholder: "Ej: 553" },
    { key: "re_aiaiHa", label: "Área de influencia ambiental indirecta (ha)", placeholder: "Ej: 600" },
    { key: "re_aisdDescripcion", label: "Área de influencia social directa (descripción)", placeholder: "Ej: Comunidad Campesina de Chipispaya", multiline: true },
    { key: "re_aisiDescripcion", label: "Área de influencia social indirecta (descripción)", placeholder: "Ej: Distrito de Héroes Albarracín", multiline: true },
  ],
  re_concesiones: [
    { key: "re_numConcesiones", label: "Número de concesiones mineras", placeholder: "Ej: 2" },
    { key: "re_concesionesLista", label: "Concesiones (nombre y código, una por línea)", placeholder: "Ej:\nOSCAR 1-600 (010029392)\nALICIA 1-900 (010072593)", multiline: true },
  ],
  re_actividades: [
    { key: "re_descripcionActividades", label: "Descripción de actividades de exploración", placeholder: "Ej: perforación diamantina, habilitación de plataformas y accesos…", multiline: true },
    { key: "re_cronogramaMeses", label: "Duración total (meses)", placeholder: "Ej: 34" },
  ],
  re_lineaBase: [
    { key: "re_resumenFisico", label: "Resumen del medio físico", placeholder: "Climatología, geología, hidrología, calidad del aire, ruido, suelos. (Cap. 3 lo desarrolla en detalle.)", multiline: true },
    { key: "re_resumenBiologico", label: "Resumen del medio biológico", placeholder: "Flora, fauna, ecosistemas; especies amenazadas. (Cap. 3.)", multiline: true },
    { key: "re_resumenSocial", label: "Resumen del medio socioeconómico-cultural", placeholder: "Comunidades involucradas, servicios, arqueología. (Cap. 3.)", multiline: true },
  ],
  re_participacion: [
    { key: "re_mecanismosParticipacion", label: "Mecanismos de participación ciudadana realizados", placeholder: "Ej: talleres informativos, encuestas, buzones. (Cap. 4 los desarrolla.)", multiline: true },
  ],
  re_impactos: [
    { key: "re_impactosResumen", label: "Resumen de impactos identificados", placeholder: "Ej: emisiones de polvo, ruido temporal, alteración de suelos en huella, etc. (Cap. 5.)", multiline: true },
  ],
  re_pma: [
    { key: "re_pmaMedidas", label: "Medidas del Plan de Manejo Ambiental", placeholder: "Resumen de las medidas de prevención, mitigación, control y compensación. (Cap. 6.)", multiline: true },
    { key: "re_cierre", label: "Medidas de cierre", placeholder: "Cierre progresivo y final: rehabilitación de plataformas, accesos, etc.", multiline: true },
    { key: "re_postCierre", label: "Medidas de post-cierre", placeholder: "Monitoreo de estabilidad físico-química, etc.", multiline: true },
  ],
  re_inversion: [
    { key: "re_inversionTotalUSD", label: "Inversión total del Proyecto (US$)", placeholder: "Ej: 600 000" },
  ],
  re_anp: [
    { key: "re_anpSuperposicion", label: "¿Hay superposición con ANP / ZA / ACR?", placeholder: "Ej: No / Sí (especificar)" },
    { key: "re_anpNombre", label: "ANP más cercana", placeholder: "Ej: Reserva Nacional de Punta Coles" },
    { key: "re_anpDistanciaKm", label: "Distancia a la ANP más cercana (km)", placeholder: "Ej: 121.43" },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "1.0",
    title: "1.0 Resumen Ejecutivo",
    level: 0,
    children: [
      { id: "1.1", title: "1.1 Contexto y objetivo", level: 1, children: [], structuredType: "re_contexto" },
      { id: "1.2", title: "1.2 Ubicación y área efectiva", level: 1, children: [], structuredType: "re_ubicacion" },
      { id: "1.3", title: "1.3 Componentes del Proyecto", level: 1, children: [], structuredType: "re_componentes" },
      { id: "1.4", title: "1.4 Áreas de influencia", level: 1, children: [], structuredType: "re_areaInfluencia" },
      { id: "1.5", title: "1.5 Derechos mineros", level: 1, children: [], structuredType: "re_concesiones" },
      { id: "1.6", title: "1.6 Actividades y cronograma", level: 1, children: [], structuredType: "re_actividades" },
      { id: "1.7", title: "1.7 Resumen de la Línea Base", level: 1, children: [], structuredType: "re_lineaBase" },
      { id: "1.8", title: "1.8 Participación ciudadana", level: 1, children: [], structuredType: "re_participacion" },
      { id: "1.9", title: "1.9 Impactos identificados", level: 1, children: [], structuredType: "re_impactos" },
      { id: "1.10", title: "1.10 Plan de Manejo Ambiental, cierre y post-cierre", level: 1, children: [], structuredType: "re_pma" },
      { id: "1.11", title: "1.11 Inversión total", level: 1, children: [], structuredType: "re_inversion" },
      { id: "1.12", title: "1.12 Áreas Naturales Protegidas", level: 1, children: [], structuredType: "re_anp" },
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
