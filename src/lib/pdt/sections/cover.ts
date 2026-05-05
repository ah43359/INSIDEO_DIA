import { AlignmentType, PageBreak, Paragraph, Run, TextRun } from "docx";
import { FONT_MAIN, FONT_SIZE_BODY, FONT_SIZE_COVER_TITLE, FONT_SIZE_SMALL, LINE_SPACING, SPACE_AFTER_PARA } from "../styles";

function centeredRun(text: string, size: number, bold = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80, line: LINE_SPACING.line, lineRule: LINE_SPACING.lineRule },
    children: [new TextRun({ text, font: FONT_MAIN, size, bold })],
  });
}

export interface CoverData {
  projectName: string;
  clientRazonSocial: string;
  clientDomicilio: string | null;
  projectNumber: string | null;
  month: string;
  year: string;
}

export function buildCover(data: CoverData): Paragraph[] {
  const {
    projectName,
    clientRazonSocial,
    clientDomicilio,
    projectNumber,
    month,
    year,
  } = data;

  return [
    centeredRun("PLAN DE TRABAJO", FONT_SIZE_COVER_TITLE, true),
    centeredRun("", FONT_SIZE_BODY),
    centeredRun(
      "ACTIVIDADES DE CARACTERIZACIÓN DE LÍNEA BASE SOCIO AMBIENTAL",
      28,
      true,
    ),
    centeredRun("", FONT_SIZE_BODY),
    centeredRun(
      "DECLARACIÓN DE IMPACTO AMBIENTAL (DIA)",
      FONT_SIZE_BODY,
      true,
    ),
    centeredRun(`DEL PROYECTO DE EXPLORACIÓN MINERA ${projectName.toUpperCase()}`, FONT_SIZE_BODY, true),
    centeredRun("", FONT_SIZE_BODY),
    centeredRun(`${month}, ${year}`, FONT_SIZE_BODY),
    centeredRun("", FONT_SIZE_BODY),
    ...(projectNumber
      ? [centeredRun(`Número de Proyecto: ${projectNumber}`, FONT_SIZE_BODY)]
      : []),
    centeredRun("", FONT_SIZE_BODY),
    centeredRun("Preparado para:", FONT_SIZE_BODY),
    centeredRun(clientRazonSocial, FONT_SIZE_BODY, true),
    ...(clientDomicilio
      ? clientDomicilio.split(",").map((line) => centeredRun(line.trim(), FONT_SIZE_BODY))
      : []),
    centeredRun("", FONT_SIZE_BODY),
    centeredRun("Preparado por:", FONT_SIZE_BODY),
    centeredRun("Avenida Primavera 643, Oficina SS-103", FONT_SIZE_SMALL),
    centeredRun("Urbanización Chacarilla del Estanque", FONT_SIZE_SMALL),
    centeredRun("San Borja, Lima 41", FONT_SIZE_SMALL),
    centeredRun("Tel: (051-1) 240-3443 · www.insideo.org", FONT_SIZE_SMALL),
    new Paragraph({
      spacing: { after: SPACE_AFTER_PARA },
      children: [new Run({ break: 1 }), new PageBreak()],
    }),
  ];
}
