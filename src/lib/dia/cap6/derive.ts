// Auto-derive Capítulo 6 (PMA) prefill.

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
  const warnings: string[] = [];

  const dgFields: Record<string, string> = {
    pma_objetivo:
      "Establecer las medidas de prevención, mitigación, control y compensación de los impactos ambientales identificados en el Capítulo 5, así como los planes y protocolos asociados al manejo ambiental durante todas las etapas del proyecto.",
    pma_residuosNormativa:
      "Decreto Legislativo N° 1278 (Ley de Gestión Integral de Residuos Sólidos) y D.S. N° 014-2017-MINAM (Reglamento).",
    pma_contingenciasObjetivo:
      "Atender de manera oportuna y eficaz eventos no planificados que puedan afectar al personal, al medio ambiente o a las comunidades vecinas.",
  };

  warnings.push(
    'Las medidas específicas y el cronograma/presupuesto detallado se completan a mano. Una próxima versión añadirá un editor de tabla por componente × etapa × medida.',
  );

  void input;

  return {
    state: { introFields: {}, dgFields, content: {} },
    warnings,
  };
}
