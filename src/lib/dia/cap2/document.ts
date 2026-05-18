// Top-level Capítulo 2 .docx assembler.
//
// Goes through the shared INSIDEO framework wrapper so the page setup,
// headers/footers, heading styles, and bullet numbering stay in lockstep
// with every other chapter (1, 3, 4, 5, 6, 7).

import { AlignmentType, Paragraph, TextRun } from "docx";
import {
  buildAntecedentes,
  buildCronograma,
  buildDelimitacion,
  buildDescripcion,
  buildInfluencia,
  buildIntro,
  buildLocalizacion,
  buildObjetivos,
} from "./sections";
import { FONT_HEADING, SIZE_H1 } from "./styles";
import type { Cap2State } from "./state";
import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";

export async function buildCap2Document(state: Cap2State, projectName: string): Promise<Buffer> {
  const body: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Capítulo 2: Descripción del Proyecto",
          font: FONT_HEADING,
          size: SIZE_H1,
          bold: true,
        }),
      ],
    }),
    ...buildIntro(state),
    ...buildAntecedentes(state),
    ...buildObjetivos(state),
    ...buildLocalizacion(state),
    ...buildDelimitacion(state),
    ...buildInfluencia(state),
    ...buildCronograma(state),
    ...buildDescripcion(state),
  ];

  return buildChapterDocumentBuffer({
    body,
    projectName,
    headerLabel: "DIA",
    footerLabel: "Capítulo 2 – Página",
  });
}
