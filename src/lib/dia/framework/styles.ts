// docx paragraph and run helpers shared across all DIA chapters.
//
// INSIDEO Word document standard — extracted from 4 approved DIA examples:
//   Body font: Bookman Old Style, 10pt, justified, 1.3× line spacing, 5pt after
//   Headings: Arial bold, 12pt (H1) / 11pt (H2–H4), black (no color)
//   H1/H2 indent: 1 cm left+hanging; H3/H4 indent: 1.5 cm left+hanging
//   Page: A4, top/bottom/right 2.5 cm, left 3 cm
//   Bullets: "–" dash (no numbering)
//   Source footer: "Fuente: Elaborado por: INSIDEO."

import {
  AlignmentType,
  type IRunOptions,
  type ParagraphChild,
  Paragraph,
  TextRun,
} from "docx";

export const FONT         = "Bookman Old Style";
export const FONT_HEADING = "Arial";

export const SIZE_BODY           = 20; // 10pt (half-points)
export const SIZE_H1             = 24; // 12pt
export const SIZE_H2             = 22; // 11pt
export const SIZE_H3             = 22; // 11pt
export const SIZE_H4             = 22; // 11pt
export const SIZE_HEADER_FOOTER  = 18; //  9pt

// Headings are black (no color override)
export const COLOR_MUTED = "999999";

// Page margins in twips (1 cm ≈ 567 twips)
export const MARGIN_TOP_BOTTOM = 1417; // 2.5 cm
export const MARGIN_LEFT       = 1701; // 3.0 cm
export const MARGIN_RIGHT      = 1417; // 2.5 cm

const SPACING_AFTER_BODY    = 100; // ~5pt
const SPACING_AFTER_BULLET  =  60; // 3pt
const LINE_SPACING          = 312; // 1.3× (docx: 240 = single)

export const HEADING_SPACING = {
  1: { before: 240, after:   0 }, // 12pt before, no after (tight to first body para)
  2: { before: 240, after:   0 },
  3: { before: 200, after:   0 },
  4: { before: 200, after:   0 },
} as const;

// Heading indents extracted from real documents (twips, 1 cm ≈ 567)
export const HEADING_INDENT = {
  1: { left: 567, hanging: 567 },  // 1 cm
  2: { left: 567, hanging: 567 },  // 1 cm
  3: { left: 851, hanging: 851 },  // 1.5 cm
  4: { left: 851, hanging: 851 },  // 1.5 cm
} as const;

// ─── Run helpers ──────────────────────────────────────────────────────────────

export function normalRun(text: string, opts: Partial<IRunOptions> = {}): TextRun {
  return new TextRun({ text, font: FONT, size: SIZE_BODY, ...opts });
}

export function boldRun(text: string): TextRun {
  return new TextRun({ text, font: FONT, size: SIZE_BODY, bold: true });
}

// ─── Paragraph helpers ────────────────────────────────────────────────────────

export function bodyP(content: string | ParagraphChild[]): Paragraph {
  const children = typeof content === "string" ? [normalRun(content)] : content;
  return new Paragraph({
    spacing: { after: SPACING_AFTER_BODY, line: LINE_SPACING },
    alignment: AlignmentType.JUSTIFIED,
    children,
  });
}

export function bulletP(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "cap2-bullets", level: 0 },
    spacing: { after: SPACING_AFTER_BULLET, line: LINE_SPACING },
    children: [normalRun(text)],
  });
}

/** "Fuente: Elaborado por: INSIDEO." — appended after every table. */
export function sourceP(): Paragraph {
  return new Paragraph({
    spacing: { after: SPACING_AFTER_BODY },
    children: [
      new TextRun({ text: "Fuente: Elaborado por: INSIDEO.", font: FONT, size: SIZE_BODY, italics: true }),
    ],
  });
}

export function sectionHeading(level: 1 | 2 | 3 | 4, text: string): Paragraph {
  const sizes: Record<1 | 2 | 3 | 4, number> = {
    1: SIZE_H1,
    2: SIZE_H2,
    3: SIZE_H3,
    4: SIZE_H4,
  };
  const styleId = level === 4 ? "Heading4" : `Heading${level}`;
  return new Paragraph({
    style: styleId,
    spacing: HEADING_SPACING[level],
    indent: HEADING_INDENT[level],
    children: [
      new TextRun({
        text,
        font: FONT_HEADING,
        size: sizes[level],
        bold: true,
      }),
    ],
  });
}

// Placeholder: returns the value if non-empty, otherwise `[fallback]`.
export function v(value: string | number | null | undefined, fallback: string): string {
  if (value === null || value === undefined) return `[${fallback}]`;
  const s = String(value).trim();
  return s.length > 0 ? s : `[${fallback}]`;
}

// docx numbering config — dash bullet (–) matching INSIDEO Word style.
export const BULLET_NUMBERING = {
  config: [
    {
      reference: "cap2-bullets",
      levels: [
        {
          level: 0,
          format: "bullet" as const,
          text: "–", // en-dash
          alignment: AlignmentType.LEFT,
          style: {
            run: { font: FONT, size: SIZE_BODY },
            paragraph: { indent: { left: 567, hanging: 284 } }, // ~1 cm indent, ~0.5 cm hang
          },
        },
      ],
    },
  ],
};
