// Capítulo 4 — PPC: docx body builder.

import type { Paragraph } from "docx";
import { bodyP, bulletP, sectionHeading } from "@/lib/dia/framework/styles";
import type { ChapterState } from "@/lib/dia/framework/state";

export function buildParticipacion(state: ChapterState): Paragraph[] {
  const dF = state.dgFields;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "4.0 Plan de Participación Ciudadana"));

  out.push(sectionHeading(2, "4.1 Marco legal y objetivos"));
  out.push(bodyP(`Marco legal: ${dF.ppc_marcoLegal || "[Completar]"}.`));
  out.push(bodyP(dF.ppc_objetivoGeneral?.trim() || "[Completar objetivo general]"));
  if (dF.ppc_objetivosEspecificos?.trim()) {
    for (const line of dF.ppc_objetivosEspecificos.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  }

  out.push(sectionHeading(2, "4.2 Áreas de influencia social y grupos de interés"));
  out.push(bodyP("Localidades del AISD:"));
  if (dF.ppc_aisdLista?.trim()) {
    for (const line of dF.ppc_aisdLista.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar localidades del AISD]"));
  }
  out.push(bodyP("Localidades del AISI:"));
  if (dF.ppc_aisiLista?.trim()) {
    for (const line of dF.ppc_aisiLista.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar localidades del AISI]"));
  }
  out.push(bodyP(dF.ppc_grupoInteresLista?.trim() || "[Completar grupos de interés]"));

  out.push(sectionHeading(2, "4.3 Mecanismos de participación"));
  if (dF.ppc_mecanismosLista?.trim()) {
    for (const line of dF.ppc_mecanismosLista.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar listado de mecanismos]"));
  }
  out.push(bodyP(`Acuerdo previo con la autoridad: ${dF.ppc_acuerdoPrevio?.trim() || "[Completar]"}.`));
  if (dF.ppc_anexoActaAcuerdo?.trim())
    out.push(bodyP(`Acta de acuerdo en ${dF.ppc_anexoActaAcuerdo}.`));

  out.push(sectionHeading(2, "4.4 Taller informativo previo"));
  out.push(
    bodyP(
      `Fecha: ${dF.ppc_tallerInformativoFecha || "[Completar]"}. ` +
        `Lugar: ${dF.ppc_tallerLugar || "[Completar]"}. ` +
        `Asistentes: ${dF.ppc_tallerAsistentes || "[Completar]"}.`,
    ),
  );
  if (dF.ppc_tallerConvocatoria?.trim())
    out.push(bodyP(`Convocatoria: ${dF.ppc_tallerConvocatoria.trim()}.`));
  if (dF.ppc_tallerAgenda?.trim())
    out.push(bodyP(`Agenda: ${dF.ppc_tallerAgenda.trim()}.`));

  out.push(sectionHeading(2, "4.5 Resultados, aportes y compromisos"));
  out.push(bodyP(dF.ppc_aportesRecibidos?.trim() || "[Completar aportes y observaciones recibidos]"));
  if (dF.ppc_compromisosEspecificos?.trim()) {
    for (const line of dF.ppc_compromisosEspecificos.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  }

  out.push(sectionHeading(2, "4.6 Anexos del PPC"));
  for (const [label, value] of [
    ["Padrón de asistencia", dF.ppc_anexoPadron],
    ["Acta del taller", dF.ppc_anexoActaTaller],
    ["Material de difusión", dF.ppc_anexoMaterial],
    ["Anexo fotográfico", dF.ppc_anexoFotografico],
  ] as const) {
    if (value?.trim()) out.push(bulletP(`${label}: ${value.trim()}`));
  }

  return out;
}
