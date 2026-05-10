// Auto-derive Capítulo 4 (Plan de Participación Ciudadana) prefill.

import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface DeriveCap4Input {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
  /** Optional list of nearby populated centers from RPC. */
  centrosPoblados?: ReadonlyArray<{ nombre: string; distrito: string | null; departamento: string | null }>;
}

export interface DeriveCap4Result {
  state: ChapterState;
  warnings: string[];
}

export function deriveCap4Prefill(input: DeriveCap4Input): DeriveCap4Result {
  const { centrosPoblados } = input;
  const warnings: string[] = [];

  const dgFields: Record<string, string> = {
    ppc_marcoLegal:
      "D.S. N° 028-2008-EM (Reglamento de Participación Ciudadana en el Subsector Minero); R.M. N° 304-2008-MEM/DM (Normas que regulan el Proceso de Participación Ciudadana).",
  };

  if (centrosPoblados && centrosPoblados.length > 0) {
    dgFields.ppc_aisdLista = centrosPoblados
      .slice(0, 20)
      .map((c) => [c.nombre, c.distrito, c.departamento].filter(Boolean).join(" — "))
      .join("\n");
  } else {
    warnings.push(
      'No se encontraron centros poblados cercanos en el área de estudio. Llenar manualmente las localidades del AISD/AISI.',
    );
  }

  warnings.push(
    'El acta del taller informativo previo debe escanearse y adjuntarse en el Anexo del PPC. La fecha y asistentes se llenan a mano por ahora.',
  );

  void input.project;
  void input.cliente;
  void input.componentes;
  void input.componentsGeom;
  void input.areaEstudio;

  return {
    state: { introFields: {}, dgFields, content: {} },
    warnings,
  };
}
