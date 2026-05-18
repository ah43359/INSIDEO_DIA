// Shared docx document scaffold for DIA chapters.
//
// Each chapter contributes a `Paragraph[]` body via its own builder; this
// module wraps that body in a `Document` with consistent fonts, headings,
// numbering, headers, and footers so all chapters look the same.
//
// Follows INSIDEO Word document standard (extracted from approved DIA examples):
//   Body: Bookman Old Style 10pt, justified, 1.3× spacing.
//   Headings: Arial bold, 12pt (H1) / 11pt (H2–H4), black, with indent.
//   A4 page, left 3 cm, top/bottom/right 2.5 cm.
//   Header: right-aligned italic label + project name.
//   Footer: centered "Capítulo N – Página X".

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
  COLOR_MUTED,
  FONT,
  FONT_HEADING,
  HEADING_INDENT,
  HEADING_SPACING,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MARGIN_TOP_BOTTOM,
  SIZE_H1,
  SIZE_H2,
  SIZE_H3,
  SIZE_H4,
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
          run: { size: SIZE_H1, bold: true, font: FONT_HEADING },
          paragraph: { spacing: HEADING_SPACING[1], indent: HEADING_INDENT[1], outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: SIZE_H2, bold: true, font: FONT_HEADING },
          paragraph: { spacing: HEADING_SPACING[2], indent: HEADING_INDENT[2], outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: SIZE_H3, bold: true, font: FONT_HEADING },
          paragraph: { spacing: HEADING_SPACING[3], indent: HEADING_INDENT[3], outlineLevel: 2 },
        },
        {
          id: "Heading4",
          name: "Heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: SIZE_H4, bold: true, font: FONT_HEADING },
          paragraph: { spacing: HEADING_SPACING[4], indent: HEADING_INDENT[4], outlineLevel: 3 },
        },
      ],
    },
    numbering: BULLET_NUMBERING,
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: {
              top: MARGIN_TOP_BOTTOM,
              bottom: MARGIN_TOP_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
            },
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
