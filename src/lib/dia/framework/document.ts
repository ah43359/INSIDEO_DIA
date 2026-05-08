// Shared docx document scaffold for DIA chapters.
//
// Each chapter contributes a `Paragraph[]` body via its own builder; this
// module wraps that body in a `Document` with consistent fonts, headings,
// numbering, headers, and footers so all chapters look the same.

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
  BULLET_NUMBERING,
  COLOR_H1,
  COLOR_H2,
  COLOR_MUTED,
  FONT,
  SIZE_HEADER_FOOTER,
} from "./styles";

export interface ChapterDocumentInput {
  /** Body paragraphs for the chapter — already wrapped in headings/bullets. */
  body: readonly Paragraph[];
  /** Used in the right-aligned page header. */
  projectName: string;
  /** "DIA" or "Cap. 1" etc., shown left of the project name in the header. */
  headerLabel: string;
  /** Footer prefix, e.g. "Capítulo 1 – Página". */
  footerLabel: string;
}

export async function buildChapterDocumentBuffer(input: ChapterDocumentInput): Promise<Buffer> {
  const { body, projectName, headerLabel, footerLabel } = input;

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
                    text: headerLabel,
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
                    text: `${footerLabel} `,
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
        children: body as Paragraph[],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
