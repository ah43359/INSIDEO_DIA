// Auto-derive Capítulo 5 (Impactos) prefill.

import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface DeriveCap5Input {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
}

export interface DeriveCap5Result {
  state: ChapterState;
  warnings: string[];
}

export function deriveCap5Prefill(input: DeriveCap5Input): DeriveCap5Result {
  const warnings: string[] = [];

  const dgFields: Record<string, string> = {
    imp_metodoNombre: "Conesa-Fernández (1997) modificada para minería de exploración",
    imp_etapasConsideradas:
      "Construcción/habilitación, exploración (perforación), cierre progresivo, cierre final, post-cierre.",
    imp_aspectosFisicos:
      "Calidad de aire, niveles de ruido, calidad de agua superficial y subterránea, calidad de suelos, geomorfología.",
    imp_aspectosBiologicos:
      "Cobertura vegetal, hábitat de fauna, especies protegidas (DS 004-2014-MINAGRI), ecosistemas frágiles.",
    imp_aspectosSocioeconomicos:
      "Empleo local, percepción social, salud y seguridad, tránsito vehicular, patrimonio cultural.",
  };

  warnings.push(
    'La matriz Conesa cuantitativa (importancia I = ±[3IN+2EX+MO+PE+RV+SI+AC+EF+PR+MC]) se completa a mano por ahora. Una próxima versión añadirá un editor de matriz por actividad × aspecto.',
  );

  void input;

  return {
    state: { introFields: {}, dgFields, content: {} },
    warnings,
  };
}
