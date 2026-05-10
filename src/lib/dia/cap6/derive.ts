// Auto-derive Capítulo 6 (PMA) prefill.
//
// V2 seeds a small number of high-confidence defaults (responsible,
// objetivos generales, normativa de residuos, ECA references). The rest
// of the chapter — medidas, monitoreos, contingencias, PRC, cierre — is
// expected to be filled either manually by the user or via the RAG
// "Generar con IA" button (Phase 3) using approved-DIA examples.

import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface DeriveCap6Input {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
}

export interface DeriveCap6Result {
  state: ChapterState;
  warnings: string[];
}

export function deriveCap6Prefill(input: DeriveCap6Input): DeriveCap6Result {
  const { cliente } = input;
  const warnings: string[] = [];

  const dgFields: Record<string, string> = {
    pma_responsable: cliente?.razon_social
      ? `Gerencia de Medio Ambiente de ${cliente.razon_social}`
      : "Gerencia de Medio Ambiente del titular",
    pma_alcanceTexto:
      "El presente Plan de Manejo Ambiental (PMA) cubre todas las etapas del Proyecto (construcción/habilitación, operación/mantenimiento y cierre/post-cierre), aplicándose sobre los componentes principales y auxiliares descritos en el Capítulo 2 dentro del área efectiva del Proyecto.",
    pma_objGenerales:
      "El Plan de Manejo Ambiental (PMA) constituye una herramienta dinámica para lograr que las actividades del Proyecto se desarrollen en armonía con el ambiente y las comunidades del área de influencia, estableciendo medidas de prevención, mitigación, control y compensación frente a los impactos identificados, así como los lineamientos para la vigilancia ambiental, manejo de residuos, contingencias, relaciones comunitarias y cierre.",
    pma_objEspecificos: [
      "Cumplir con los lineamientos de gestión (prevención, mitigación, control y compensación) para los impactos identificados en el Capítulo 5.",
      "Realizar las tareas de monitoreo del Plan de Vigilancia Ambiental para hacer seguimiento sistemático a los parámetros ambientales relevantes.",
      "Ejecutar las acciones contingentes ante riesgos y potenciales accidentes durante el desarrollo del Proyecto.",
      "Implementar el Plan de Relaciones Comunitarias en armonía con la población del área de influencia social.",
      "Ejecutar las medidas de cierre y post-cierre que permitan rehabilitar las áreas intervenidas.",
    ].join("\n"),
    pma_pvaAire_normativa: "D.S. N° 003-2017-MINAM (Estándares de Calidad Ambiental para Aire)",
    pma_pvaRuido_normativa: "D.S. N° 085-2003-PCM (Estándares Nacionales de Calidad Ambiental para Ruido)",
    pma_pvaAguaSup_normativa: "D.S. N° 004-2017-MINAM (Estándares de Calidad Ambiental para Agua)",
  };

  warnings.push(
    'Cap. 6 está reestructurado al formato de DIAs aprobadas (Cerrillos / Sabueso / Ccoropuro). Las medidas, monitoreos y planes detallados se llenan a mano o vía "Generar con IA" usando los ejemplos aprobados.',
  );

  void input;

  return {
    state: { introFields: {}, dgFields, content: {} },
    warnings,
  };
}
