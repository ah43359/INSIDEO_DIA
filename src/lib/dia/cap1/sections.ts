// Capítulo 1 — Resumen Ejecutivo: docx body builder.
//
// Produces a single sequential narrative per RM 108-2018-MEM/DM Anexo I §1
// requirements. Each subsection's content comes from the user's edits in
// the corresponding `re_*` field group; if blank, the builder emits a
// "[Completar …]" placeholder so reviewers see what's missing.

import type { Paragraph } from "docx";
import { bodyP, boldRun, normalRun, sectionHeading, v } from "@/lib/dia/framework/styles";
import type { ChapterState } from "@/lib/dia/framework/state";

export function buildResumenEjecutivo(state: ChapterState): Paragraph[] {
  const dF = state.dgFields;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "1.0 Resumen Ejecutivo"));

  // 1.1 Contexto
  out.push(sectionHeading(2, "1.1 Contexto y objetivo"));
  out.push(bodyP(dF.re_visionGeneral?.trim() || "[Completar visión general del Proyecto]"));
  out.push(bodyP(dF.re_objetivoEstudio?.trim() || "[Completar objetivo del estudio]"));

  // 1.2 Ubicación
  out.push(sectionHeading(2, "1.2 Ubicación y área efectiva"));
  out.push(
    bodyP([
      normalRun("El Proyecto se ubica en el distrito de "),
      boldRun(v(dF.re_distrito, "DISTRITO")),
      normalRun(", provincia de "),
      boldRun(v(dF.re_provincia, "PROVINCIA")),
      normalRun(", región "),
      boldRun(v(dF.re_region, "REGIÓN")),
      normalRun(", con punto de referencia en las coordenadas UTM (WGS84, Zona "),
      boldRun(v(dF.re_utmZona, "ZONA")),
      normalRun(") Este "),
      boldRun(v(dF.re_coordEste, "ESTE")),
      normalRun(" m, Norte "),
      boldRun(v(dF.re_coordNorte, "NORTE")),
      normalRun(" m. El área efectiva del Proyecto es de "),
      boldRun(v(dF.re_areaEfectivaHa, "ÁREA")),
      normalRun(" ha."),
    ]),
  );

  // 1.3 Componentes
  out.push(sectionHeading(2, "1.3 Componentes del Proyecto"));
  out.push(
    bodyP([
      normalRun("El Proyecto contempla la habilitación y perforación de hasta "),
      boldRun(v(dF.re_numPlataformas, "N°")),
      normalRun(" plataformas de perforación, con un total de "),
      boldRun(v(dF.re_numSondajes, "N°")),
      normalRun(" sondajes; y "),
      boldRun(v(dF.re_kmAccesos, "N°")),
      normalRun(" km de accesos."),
    ]),
  );
  if (dF.re_componentesAuxiliares?.trim()) {
    out.push(
      bodyP([
        normalRun("Componentes auxiliares: "),
        normalRun(dF.re_componentesAuxiliares.trim()),
        normalRun("."),
      ]),
    );
  }

  // 1.4 Áreas de influencia
  out.push(sectionHeading(2, "1.4 Áreas de influencia"));
  out.push(
    bodyP([
      normalRun("El área de influencia ambiental directa (AIAD) comprende "),
      boldRun(v(dF.re_aiadHa, "ÁREA")),
      normalRun(" ha y la indirecta (AIAI), "),
      boldRun(v(dF.re_aiaiHa, "ÁREA")),
      normalRun(" ha."),
    ]),
  );
  out.push(
    bodyP([
      normalRun("Área de influencia social directa (AISD): "),
      boldRun(v(dF.re_aisdDescripcion, "AISD")),
      normalRun(". Indirecta (AISI): "),
      boldRun(v(dF.re_aisiDescripcion, "AISI")),
      normalRun("."),
    ]),
  );

  // 1.5 Concesiones
  out.push(sectionHeading(2, "1.5 Derechos mineros"));
  out.push(
    bodyP([
      normalRun("El Proyecto se desarrolla dentro de "),
      boldRun(v(dF.re_numConcesiones, "N°")),
      normalRun(" concesión(es) minera(s)."),
    ]),
  );
  if (dF.re_concesionesLista?.trim()) {
    out.push(bodyP(dF.re_concesionesLista.trim()));
  }

  // 1.6 Actividades
  out.push(sectionHeading(2, "1.6 Actividades y cronograma"));
  out.push(bodyP(dF.re_descripcionActividades?.trim() || "[Completar descripción de actividades]"));
  out.push(
    bodyP([
      normalRun("Duración total estimada del Proyecto: "),
      boldRun(v(dF.re_cronogramaMeses, "N°")),
      normalRun(" meses."),
    ]),
  );

  // 1.7 Línea Base
  out.push(sectionHeading(2, "1.7 Resumen de la Línea Base"));
  out.push(sectionHeading(3, "Medio físico"));
  out.push(bodyP(dF.re_resumenFisico?.trim() || "[Completar resumen del medio físico — ver Capítulo 3]"));
  out.push(sectionHeading(3, "Medio biológico"));
  out.push(bodyP(dF.re_resumenBiologico?.trim() || "[Completar resumen del medio biológico — ver Capítulo 3]"));
  out.push(sectionHeading(3, "Medio socioeconómico-cultural"));
  out.push(bodyP(dF.re_resumenSocial?.trim() || "[Completar resumen del medio socioeconómico — ver Capítulo 3]"));

  // 1.8 Participación
  out.push(sectionHeading(2, "1.8 Participación ciudadana"));
  out.push(bodyP(dF.re_mecanismosParticipacion?.trim() || "[Completar mecanismos de participación — ver Capítulo 4]"));

  // 1.9 Impactos
  out.push(sectionHeading(2, "1.9 Impactos identificados"));
  out.push(bodyP(dF.re_impactosResumen?.trim() || "[Completar resumen de impactos — ver Capítulo 5]"));

  // 1.10 PMA + cierre
  out.push(sectionHeading(2, "1.10 Plan de Manejo Ambiental, cierre y post-cierre"));
  out.push(bodyP(dF.re_pmaMedidas?.trim() || "[Completar medidas del PMA — ver Capítulo 6]"));
  out.push(sectionHeading(3, "Cierre"));
  out.push(bodyP(dF.re_cierre?.trim() || "[Completar medidas de cierre]"));
  out.push(sectionHeading(3, "Post-cierre"));
  out.push(bodyP(dF.re_postCierre?.trim() || "[Completar medidas de post-cierre]"));

  // 1.11 Inversión
  out.push(sectionHeading(2, "1.11 Inversión total"));
  out.push(
    bodyP([
      normalRun("La inversión total del Proyecto asciende a aproximadamente US$ "),
      boldRun(v(dF.re_inversionTotalUSD, "TOTAL")),
      normalRun("."),
    ]),
  );

  // 1.12 ANP
  out.push(sectionHeading(2, "1.12 Áreas Naturales Protegidas"));
  out.push(
    bodyP([
      normalRun("Superposición con ANP / ZA / ACR: "),
      boldRun(v(dF.re_anpSuperposicion, "Sí/No")),
      normalRun(". ANP más cercana: "),
      boldRun(v(dF.re_anpNombre, "ANP")),
      normalRun(", a "),
      boldRun(v(dF.re_anpDistanciaKm, "DISTANCIA")),
      normalRun(" km."),
    ]),
  );

  return out;
}
