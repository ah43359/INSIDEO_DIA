// Capítulo 7 — Empresa Consultora: docx body builder.

import type { Paragraph } from "docx";
import { bodyP, bulletP, sectionHeading } from "@/lib/dia/framework/styles";
import type { ChapterState } from "@/lib/dia/framework/state";

export function buildEmpresaConsultora(state: ChapterState): Paragraph[] {
  const dF = state.dgFields;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "7.0 Empresa Consultora"));

  out.push(sectionHeading(2, "7.1 Identificación de la consultora"));
  out.push(
    bodyP(
      `Razón social: ${dF.ec_razonSocial || "[Completar]"}. ` +
        `RUC: ${dF.ec_ruc || "[Completar]"}. ` +
        `Domicilio: ${dF.ec_domicilio || "[Completar]"}.`,
    ),
  );
  out.push(
    bodyP(
      `Representante legal: ${dF.ec_representanteLegal || "[Completar]"}, DNI ${dF.ec_dniRL || "[Completar]"}. ` +
        `Tel: ${dF.ec_telefono || "[Completar]"}. ` +
        `Correo: ${dF.ec_correo || "[Completar]"}.`,
    ),
  );

  out.push(sectionHeading(2, "7.2 Inscripción en SENACE"));
  out.push(bodyP(`Resolución de inscripción: ${dF.ec_resolucionInscripcion || "[Completar]"}.`));
  out.push(
    bodyP(
      `Fecha de inscripción: ${dF.ec_fechaInscripcion || "[Completar]"}. ` +
        `Vigencia: ${dF.ec_vigencia || "[Completar]"}.`,
    ),
  );
  if (dF.ec_categoriasAmbiente?.trim())
    out.push(bodyP(`Categorías autorizadas: ${dF.ec_categoriasAmbiente.trim()}.`));

  out.push(sectionHeading(2, "7.3 Equipo multidisciplinario"));
  if (dF.ec_equipoMultidisciplinario?.trim()) {
    for (const line of dF.ec_equipoMultidisciplinario.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar equipo multidisciplinario]"));
  }
  if (dF.ec_organigrama?.trim()) out.push(bodyP(`Organigrama: ${dF.ec_organigrama.trim()}.`));

  out.push(sectionHeading(2, "7.4 Anexos"));
  for (const [label, value] of [
    ["Resolución de inscripción", dF.ec_anexoResolucion],
    ["CVs y registros profesionales", dF.ec_anexoCV],
    ["Declaración jurada de participación", dF.ec_anexoDDJJ],
  ] as const) {
    if (value?.trim()) out.push(bulletP(`${label}: ${value.trim()}`));
  }

  return out;
}
