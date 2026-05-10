// Auto-derive Capítulo 7 (Empresa Consultora) prefill.

import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface DeriveCap7Input {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
}

export interface DeriveCap7Result {
  state: ChapterState;
  warnings: string[];
}

export function deriveCap7Prefill(input: DeriveCap7Input): DeriveCap7Result {
  const warnings: string[] = [];

  // The consulting firm's identity is project-independent (it's the firm
  // running the EIA, not the client). We seed only project-agnostic
  // fields and rely on the user to fill firm-specific data.
  const dgFields: Record<string, string> = {};

  warnings.push(
    'Los datos de la consultora (razón social, RUC, resolución de inscripción en SENACE, equipo) son específicos de la empresa que elabora la DIA y se completan a mano. Una próxima versión podría leer estos datos de un perfil global de la empresa.',
  );

  void input;

  return {
    state: { introFields: {}, dgFields, content: {} },
    warnings,
  };
}
