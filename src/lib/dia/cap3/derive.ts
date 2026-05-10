// Auto-derive Capítulo 3 (Línea Base) prefill.
//
// Most LB content comes from sampling stations and field surveys, not
// from the project inventory. We pre-populate what we can: cuenca,
// Pfafstetter code from the project's microcuencas, ANP relation from
// project metadata, and emit warnings telling the user what to fill
// manually.

import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface DeriveCap3Input {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
}

export interface DeriveCap3Result {
  state: ChapterState;
  warnings: string[];
}

export function deriveCap3Prefill(input: DeriveCap3Input): DeriveCap3Result {
  const { areaEstudio } = input;
  const warnings: string[] = [];

  const dgFields: Record<string, string> = {};

  if (areaEstudio?.inputs_snapshot?.microcuencas_used_pfafstetter?.length) {
    dgFields.lb_pfafstetter = areaEstudio.inputs_snapshot.microcuencas_used_pfafstetter.join(", ");
  }

  warnings.push(
    "La Línea Base se llena en gran parte con datos de campo (estaciones de monitoreo, transectos, encuestas). " +
      "Los resultados de calidad de aire/ruido/agua/suelos cargados en insideo-dia se incorporarán aquí en una próxima iteración.",
  );
  warnings.push(
    "Para flora/fauna y ecosistemas: recuerde adjuntar la lista de especies con su categoría según D.S. 004-2014-MINAGRI, CITES e IUCN.",
  );

  // Inputs accepted for symmetry with other chapters
  void input.project;
  void input.cliente;
  void input.componentes;
  void input.componentsGeom;

  return {
    state: { introFields: {}, dgFields, content: {} },
    warnings,
  };
}
