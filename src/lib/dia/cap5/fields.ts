// Capítulo 5 — Identificación, Caracterización y Valoración de los
// Impactos.
//
// Per RM 108-2018-MEM/DM Anexo I §5: identifies positive and negative
// impacts of project activities (construction, exploration, closure)
// over each environmental and social aspect, applying a methodology
// (typically Conesa-Fernández) to characterize and value them.
//
// V1 keeps the impact matrix as text fields. A future iteration will
// add a structured matrix UI keyed by activity × aspect with Conesa
// scores per cell.

import type { DgField, SectionNode as BaseSectionNode } from "@/lib/dia/framework/manifest";
import {
  collectSectionIds,
  findSection as findSectionGeneric,
} from "@/lib/dia/framework/manifest";

export type DgGroupKey =
  | "imp_metodologia"
  | "imp_actividades"
  | "imp_aspectos"
  | "imp_fisico"
  | "imp_biologico"
  | "imp_social"
  | "imp_valoracion"
  | "imp_conclusiones";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  imp_metodologia: [
    { key: "imp_metodoNombre", label: "Metodología de evaluación", placeholder: "Ej: Conesa-Fernández (1997) modificada" },
    { key: "imp_metodoDescripcion", label: "Descripción de la metodología", placeholder: "Identificación → caracterización (atributos: naturaleza, intensidad, extensión, persistencia, reversibilidad, sinergia, acumulación, efecto, periodicidad, recuperabilidad) → valoración (importancia)", multiline: true },
    { key: "imp_etapasConsideradas", label: "Etapas del proyecto consideradas", placeholder: "Construcción, exploración, cierre progresivo, cierre final, post-cierre" },
  ],
  imp_actividades: [
    { key: "imp_actividadesLista", label: "Actividades del proyecto evaluadas (una por línea)", placeholder: "Ej:\nHabilitación de plataformas\nPerforación diamantina\nUso de aditivos y manejo de fluidos\nTransporte de materiales\nRehabilitación de plataformas", multiline: true },
  ],
  imp_aspectos: [
    { key: "imp_aspectosFisicos", label: "Aspectos del medio físico evaluados", placeholder: "Calidad de aire, ruido, calidad de agua superficial, calidad de agua subterránea, calidad de suelos, geomorfología", multiline: true },
    { key: "imp_aspectosBiologicos", label: "Aspectos del medio biológico evaluados", placeholder: "Cobertura vegetal, hábitat de fauna, especies protegidas, ecosistemas frágiles", multiline: true },
    { key: "imp_aspectosSocioeconomicos", label: "Aspectos del medio socioeconómico evaluados", placeholder: "Empleo local, percepción social, salud y seguridad, tránsito vehicular, patrimonio cultural", multiline: true },
  ],
  imp_fisico: [
    { key: "imp_aireDescripcion", label: "Impactos en calidad del aire", placeholder: "Tipo, fuente, intensidad, valoración, medidas asociadas", multiline: true },
    { key: "imp_ruidoDescripcion", label: "Impactos en ruido", placeholder: "", multiline: true },
    { key: "imp_aguaDescripcion", label: "Impactos en calidad y disponibilidad del agua", placeholder: "", multiline: true },
    { key: "imp_suelosDescripcion", label: "Impactos en calidad y geomorfología de suelos", placeholder: "", multiline: true },
  ],
  imp_biologico: [
    { key: "imp_floraDescripcion", label: "Impactos sobre la flora y cobertura vegetal", placeholder: "", multiline: true },
    { key: "imp_faunaDescripcion", label: "Impactos sobre la fauna", placeholder: "", multiline: true },
    { key: "imp_ecosistemasDescripcion", label: "Impactos sobre ecosistemas", placeholder: "", multiline: true },
  ],
  imp_social: [
    { key: "imp_socioEmpleo", label: "Impactos en empleo y economía local", placeholder: "Generación de empleo directo/indirecto, impacto en cadenas locales", multiline: true },
    { key: "imp_socioPercepcion", label: "Impactos en percepción social", placeholder: "Conflictos potenciales, expectativas, comunicación", multiline: true },
    { key: "imp_socioSalud", label: "Impactos en salud y seguridad", placeholder: "Tránsito vehicular, polvo, ruido, riesgos ocupacionales", multiline: true },
    { key: "imp_socioCultural", label: "Impactos en patrimonio cultural", placeholder: "Riesgo arqueológico, áreas con valor cultural", multiline: true },
  ],
  imp_valoracion: [
    { key: "imp_matrizResumen", label: "Matriz resumen de valoración (Conesa)", placeholder: "Descripción narrativa: cuántos impactos negativos compatibles, moderados, severos, críticos; cuántos positivos. La matriz tabular completa va en anexo.", multiline: true },
    { key: "imp_anexoMatriz", label: "Anexo con la matriz tabular completa", placeholder: "Ej: Anexo 5.1" },
  ],
  imp_conclusiones: [
    { key: "imp_conclusiones", label: "Conclusiones de la evaluación de impactos", placeholder: "Identificación de los impactos más relevantes, resumen del riesgo ambiental global, justificación de la viabilidad ambiental.", multiline: true },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "5.0",
    title: "5.0 Identificación, Caracterización y Valoración de Impactos",
    level: 0,
    children: [
      { id: "5.1", title: "5.1 Metodología", level: 1, children: [], structuredType: "imp_metodologia" },
      { id: "5.2", title: "5.2 Actividades del proyecto evaluadas", level: 1, children: [], structuredType: "imp_actividades" },
      { id: "5.3", title: "5.3 Aspectos ambientales y sociales evaluados", level: 1, children: [], structuredType: "imp_aspectos" },
      { id: "5.4", title: "5.4 Impactos sobre el medio físico", level: 1, children: [], structuredType: "imp_fisico" },
      { id: "5.5", title: "5.5 Impactos sobre el medio biológico", level: 1, children: [], structuredType: "imp_biologico" },
      { id: "5.6", title: "5.6 Impactos sobre el medio socioeconómico-cultural", level: 1, children: [], structuredType: "imp_social" },
      { id: "5.7", title: "5.7 Valoración de impactos (matriz Conesa)", level: 1, children: [], structuredType: "imp_valoracion" },
      { id: "5.8", title: "5.8 Conclusiones", level: 1, children: [], structuredType: "imp_conclusiones" },
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
