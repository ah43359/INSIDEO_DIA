// Capítulo 6 — PMA: docx body builder.

import type { Paragraph } from "docx";
import { bodyP, bulletP, sectionHeading } from "@/lib/dia/framework/styles";
import type { ChapterState } from "@/lib/dia/framework/state";

export function buildPma(state: ChapterState): Paragraph[] {
  const dF = state.dgFields;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "6.0 Plan de Manejo Ambiental"));

  out.push(sectionHeading(2, "6.1 Objetivo y alcance"));
  out.push(bodyP(dF.pma_objetivo?.trim() || "[Completar objetivo del PMA]"));
  out.push(bodyP(`Responsable: ${dF.pma_responsable || "[Completar]"}.`));

  out.push(sectionHeading(2, "6.2 Medidas de prevención, mitigación, control y compensación"));

  out.push(sectionHeading(3, "6.2.1 Calidad del aire"));
  if (dF.pma_aireMedidas?.trim()) {
    for (const line of dF.pma_aireMedidas.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar medidas para calidad del aire]"));
  }
  if (dF.pma_aireIndicadores?.trim())
    out.push(bodyP(`Indicadores: ${dF.pma_aireIndicadores.trim()}.`));

  out.push(sectionHeading(3, "6.2.2 Ruido"));
  if (dF.pma_ruidoMedidas?.trim()) {
    for (const line of dF.pma_ruidoMedidas.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar medidas para ruido]"));
  }
  if (dF.pma_ruidoIndicadores?.trim())
    out.push(bodyP(`Indicadores: ${dF.pma_ruidoIndicadores.trim()}.`));

  out.push(sectionHeading(3, "6.2.3 Agua superficial y subterránea"));
  out.push(bodyP(dF.pma_aguaMedidas?.trim() || "[Completar medidas para agua]"));
  out.push(bodyP(dF.pma_aguaEfluentes?.trim() || "[Completar manejo de efluentes]"));
  if (dF.pma_aguaIndicadores?.trim())
    out.push(bodyP(`Indicadores: ${dF.pma_aguaIndicadores.trim()}.`));

  out.push(sectionHeading(3, "6.2.4 Suelos y geomorfología"));
  out.push(bodyP(dF.pma_suelosMedidas?.trim() || "[Completar medidas para suelos]"));
  out.push(bodyP(dF.pma_revegetacion?.trim() || "[Completar plan de revegetación]"));

  out.push(sectionHeading(3, "6.2.5 Flora y fauna"));
  out.push(bodyP(dF.pma_floraMedidas?.trim() || "[Completar medidas para flora]"));
  out.push(bodyP(dF.pma_faunaMedidas?.trim() || "[Completar medidas para fauna]"));

  out.push(sectionHeading(2, "6.3 Plan de minimización y manejo de residuos sólidos"));
  out.push(bodyP(`Normativa: ${dF.pma_residuosNormativa || "[Completar]"}.`));
  out.push(bodyP(dF.pma_residuosMinimizacion?.trim() || "[Completar plan de minimización]"));
  out.push(bodyP(dF.pma_residuosSegregacion?.trim() || "[Completar segregación y almacenamiento]"));
  out.push(bodyP(dF.pma_residuosTransporte?.trim() || "[Completar transporte y disposición]"));
  out.push(bodyP(`EO-RS: ${dF.pma_residuosEORS || "[Completar]"}.`));

  out.push(sectionHeading(2, "6.4 Plan de contingencias"));
  out.push(bodyP(dF.pma_contingenciasObjetivo?.trim() || "[Completar objetivo]"));
  out.push(bodyP(dF.pma_contingenciasOrganizacion?.trim() || "[Completar organización]"));
  out.push(bodyP("Escenarios identificados:"));
  if (dF.pma_contingenciasEscenarios?.trim()) {
    for (const line of dF.pma_contingenciasEscenarios.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar escenarios]"));
  }
  out.push(bodyP(`Equipamiento: ${dF.pma_contingenciasEquipamiento?.trim() || "[Completar]"}.`));
  out.push(bodyP(`Capacitación y simulacros: ${dF.pma_contingenciasCapacitacion?.trim() || "[Completar]"}.`));

  out.push(sectionHeading(2, "6.5 Protocolo de relacionamiento"));
  out.push(bodyP(dF.pma_relacionamientoObjetivo?.trim() || "[Completar objetivo]"));
  out.push(bodyP(dF.pma_relacionamientoEstrategia?.trim() || "[Completar estrategia]"));
  out.push(bodyP(dF.pma_relacionamientoCodigo?.trim() || "[Completar código de conducta]"));

  out.push(sectionHeading(2, "6.6 Plan de cierre y post-cierre"));
  out.push(bodyP(dF.pma_cierreProgresivo?.trim() || "[Completar cierre progresivo]"));
  out.push(bodyP(dF.pma_cierreFinal?.trim() || "[Completar cierre final]"));
  out.push(bodyP(dF.pma_postCierre?.trim() || "[Completar post-cierre]"));
  if (dF.pma_garantiaFinanciera?.trim())
    out.push(bodyP(`Garantía financiera de cierre: US$ ${dF.pma_garantiaFinanciera}.`));

  out.push(sectionHeading(2, "6.7 Cronograma e inversión del PMA"));
  out.push(bodyP(dF.pma_cronogramaResumen?.trim() || "[Completar cronograma]"));
  if (dF.pma_presupuestoTotal?.trim())
    out.push(bodyP(`Presupuesto total del PMA: US$ ${dF.pma_presupuestoTotal}.`));
  if (dF.pma_anexoCronograma?.trim())
    out.push(bodyP(`Detalle en ${dF.pma_anexoCronograma}.`));

  out.push(sectionHeading(2, "6.8 Cuadro resumen de compromisos ambientales"));
  if (dF.pma_compromisosResumen?.trim()) {
    for (const line of dF.pma_compromisosResumen.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar compromisos ambientales]"));
  }
  if (dF.pma_anexoCompromisos?.trim())
    out.push(bodyP(`Cuadro completo en ${dF.pma_anexoCompromisos}.`));

  return out;
}
