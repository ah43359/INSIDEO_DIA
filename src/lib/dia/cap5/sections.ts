// Capítulo 5 — Impactos: docx body builder.

import type { Paragraph } from "docx";
import { bodyP, bulletP, sectionHeading } from "@/lib/dia/framework/styles";
import type { ChapterState } from "@/lib/dia/framework/state";

export function buildImpactos(state: ChapterState): Paragraph[] {
  const dF = state.dgFields;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "5.0 Identificación, Caracterización y Valoración de Impactos"));

  out.push(sectionHeading(2, "5.1 Metodología"));
  out.push(bodyP(`Metodología: ${dF.imp_metodoNombre || "[Completar]"}.`));
  out.push(bodyP(dF.imp_metodoDescripcion?.trim() || "[Completar descripción de la metodología]"));
  out.push(bodyP(`Etapas consideradas: ${dF.imp_etapasConsideradas || "[Completar]"}.`));

  out.push(sectionHeading(2, "5.2 Actividades del proyecto evaluadas"));
  if (dF.imp_actividadesLista?.trim()) {
    for (const line of dF.imp_actividadesLista.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar actividades evaluadas]"));
  }

  out.push(sectionHeading(2, "5.3 Aspectos ambientales y sociales evaluados"));
  out.push(bodyP(`Medio físico: ${dF.imp_aspectosFisicos || "[Completar]"}.`));
  out.push(bodyP(`Medio biológico: ${dF.imp_aspectosBiologicos || "[Completar]"}.`));
  out.push(bodyP(`Medio socioeconómico: ${dF.imp_aspectosSocioeconomicos || "[Completar]"}.`));

  out.push(sectionHeading(2, "5.4 Impactos sobre el medio físico"));
  out.push(bodyP(dF.imp_aireDescripcion?.trim() || "[Completar impactos en calidad del aire]"));
  out.push(bodyP(dF.imp_ruidoDescripcion?.trim() || "[Completar impactos en ruido]"));
  out.push(bodyP(dF.imp_aguaDescripcion?.trim() || "[Completar impactos en agua]"));
  out.push(bodyP(dF.imp_suelosDescripcion?.trim() || "[Completar impactos en suelos]"));

  out.push(sectionHeading(2, "5.5 Impactos sobre el medio biológico"));
  out.push(bodyP(dF.imp_floraDescripcion?.trim() || "[Completar impactos sobre flora]"));
  out.push(bodyP(dF.imp_faunaDescripcion?.trim() || "[Completar impactos sobre fauna]"));
  out.push(bodyP(dF.imp_ecosistemasDescripcion?.trim() || "[Completar impactos sobre ecosistemas]"));

  out.push(sectionHeading(2, "5.6 Impactos sobre el medio socioeconómico-cultural"));
  out.push(bodyP(dF.imp_socioEmpleo?.trim() || "[Completar impactos en empleo y economía]"));
  out.push(bodyP(dF.imp_socioPercepcion?.trim() || "[Completar impactos en percepción social]"));
  out.push(bodyP(dF.imp_socioSalud?.trim() || "[Completar impactos en salud y seguridad]"));
  out.push(bodyP(dF.imp_socioCultural?.trim() || "[Completar impactos en patrimonio cultural]"));

  out.push(sectionHeading(2, "5.7 Valoración de impactos (matriz Conesa)"));
  out.push(bodyP(dF.imp_matrizResumen?.trim() || "[Completar resumen de matriz Conesa]"));
  if (dF.imp_anexoMatriz?.trim()) out.push(bodyP(`Matriz tabular en ${dF.imp_anexoMatriz}.`));

  out.push(sectionHeading(2, "5.8 Conclusiones"));
  out.push(bodyP(dF.imp_conclusiones?.trim() || "[Completar conclusiones]"));

  return out;
}
