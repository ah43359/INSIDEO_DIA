// docx paragraph and run helpers for Capítulo 2.
//
// Visual style matches the standalone template (Arial, navy headings,
// justified body). Numbers below are docx half-points (size: 22 = 11pt) and
// twips for spacing.

import {
  AlignmentType,
  type IRunOptions,
  type ParagraphChild,
  Paragraph,
  TextRun,
} from "docx";

export const FONT = "Arial";
export const SIZE_BODY = 22; // 11pt
export const SIZE_H1 = 28; // 14pt
export const SIZE_H2 = 24; // 12pt
export const SIZE_H3 = 22; // 11pt
export const SIZE_HEADER_FOOTER = 18; // 9pt

export const COLOR_H1 = "1F3864";
export const COLOR_H2 = "2E75B6";
export const COLOR_MUTED = "999999";

const SPACING_AFTER = 120;
const HEADING_SPACING = {
  1: { before: 360, after: 120 },
  2: { before: 240, after: 120 },
  3: { before: 180, after: 60 },
} as const;

export function normalRun(text: string, opts: Partial<IRunOptions> = {}): TextRun {
  return new TextRun({ text, font: FONT, size: SIZE_BODY, ...opts });
}

export function boldRun(text: string): TextRun {
  return new TextRun({ text, font: FONT, size: SIZE_BODY, bold: true });
}

export function bodyP(content: string | ParagraphChild[]): Paragraph {
  if (typeof content === "string") {
    return new Paragraph({
      spacing: { after: SPACING_AFTER },
      alignment: AlignmentType.JUSTIFIED,
      children: [normalRun(content)],
    });
  }
  return new Paragraph({
    spacing: { after: SPACING_AFTER },
    alignment: AlignmentType.JUSTIFIED,
    children: content,
  });
}

export function bulletP(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "cap2-bullets", level: 0 },
    spacing: { after: 60 },
    children: [normalRun(text)],
  });
}

export function sectionHeading(level: 1 | 2 | 3, text: string): Paragraph {
  const styleId = `Heading${level}`;
  return new Paragraph({
    style: styleId,
    spacing: HEADING_SPACING[level],
    children: [
      new TextRun({
        text,
        font: FONT,
        size: level === 1 ? SIZE_H1 : level === 2 ? SIZE_H2 : SIZE_H3,
        bold: true,
        color: level === 1 ? COLOR_H1 : level === 2 ? COLOR_H2 : undefined,
      }),
    ],
  });
}

// Placeholder substitution: returns the value if non-empty, otherwise a
// bracketed fallback like `[N°]` so reviewers can spot what's still missing.
export function v(value: string | number | null | undefined, fallback: string): string {
  if (value === null || value === undefined) return `[${fallback}]`;
  const s = String(value).trim();
  return s.length > 0 ? s : `[${fallback}]`;
}

// docx numbering config for the single bullet style we use.
export const BULLET_NUMBERING = {
  config: [
    {
      reference: "cap2-bullets",
      levels: [
        {
          level: 0,
          format: "bullet" as const,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 720, hanging: 360 } },
          },
        },
      ],
    },
  ],
};
