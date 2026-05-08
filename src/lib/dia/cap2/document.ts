// Top-level Capítulo 2 .docx assembler.
//
// Mirrors the structure of `src/lib/pdt/document.ts` (Document with
// paragraphStyles, single section with header/footer, A4 page).

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
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
import { BULLET_NUMBERING, COLOR_H1, COLOR_H2, COLOR_MUTED, FONT, SIZE_HEADER_FOOTER } from "./styles";
import type { Cap2State } from "./state";

export async function buildCap2Document(state: Cap2State, projectName: string): Promise<Buffer> {
  const isDIA = state.introType === "DIA";

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Capítulo 2: Descripción del Proyecto",
          font: FONT,
          size: 32,
          bold: true,
          color: COLOR_H1,
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

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: FONT, color: COLOR_H1 },
          paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: FONT, color: COLOR_H2 },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 22, bold: true, font: FONT },
          paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: BULLET_NUMBERING,
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 4 },
                },
                children: [
                  new TextRun({
                    text: isDIA ? "DIA" : "MDIA",
                    font: FONT,
                    size: SIZE_HEADER_FOOTER,
                    color: COLOR_MUTED,
                    italics: true,
                  }),
                  new TextRun({
                    text: ` – ${projectName}`,
                    font: FONT,
                    size: SIZE_HEADER_FOOTER,
                    color: COLOR_MUTED,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Capítulo 2 – Página ",
                    font: FONT,
                    size: SIZE_HEADER_FOOTER,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: SIZE_HEADER_FOOTER,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
