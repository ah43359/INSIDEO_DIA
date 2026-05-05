import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  Run,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import proj4 from "proj4";
import {
  FONT_MAIN,
  FONT_SIZE_BODY,
  FONT_SIZE_SMALL,
  LINE_SPACING,
  runBold,
  runBody,
  runSmall,
  SPACE_AFTER_PARA,
  TABLE_BORDER_THIN,
  TABLE_HEADER_SHADING,
} from "./styles";

export interface PdtStation {
  station_code: string;
  kind: string;
  lon: number;
  lat: number;
  referencia?: string | null;
}

// ── UTM reprojection ────────────────────────────────────────────────────────

function utmZone(lon: number): { zone: number; south: boolean } {
  const zone = Math.floor((lon + 180) / 6) + 1;
  return { zone, south: true };
}

export function toUtm(lon: number, lat: number): { easting: number; northing: number; zone: number } {
  const { zone } = utmZone(lon);
  const projStr = `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`;
  const [easting, northing] = proj4("EPSG:4326", projStr, [lon, lat]) as [number, number];
  return { easting, northing, zone };
}

// ── Paragraph helpers ───────────────────────────────────────────────────────

export function bodyParagraph(text: string, options: { bold?: boolean; center?: boolean; spaceBefore?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: SPACE_AFTER_PARA, line: LINE_SPACING.line, lineRule: LINE_SPACING.lineRule, before: options.spaceBefore },
    alignment: options.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        font: FONT_MAIN,
        size: FONT_SIZE_BODY,
        bold: options.bold,
      }),
    ],
  });
}

export function bulletParagraph(text: string, level = 0): Paragraph {
  return new Paragraph({
    spacing: { after: 60, line: LINE_SPACING.line, lineRule: LINE_SPACING.lineRule },
    indent: { left: 720 + level * 360, hanging: 360 },
    children: [
      new TextRun({ text: "• ", font: FONT_MAIN, size: FONT_SIZE_BODY }),
      new TextRun({ text, font: FONT_MAIN, size: FONT_SIZE_BODY }),
    ],
  });
}

export function subBullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60, line: LINE_SPACING.line, lineRule: LINE_SPACING.lineRule },
    indent: { left: 1440, hanging: 360 },
    children: [
      new TextRun({ text: "◦ ", font: FONT_MAIN, size: FONT_SIZE_BODY }),
      new TextRun({ text, font: FONT_MAIN, size: FONT_SIZE_BODY }),
    ],
  });
}

export function heading1(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text, font: FONT_MAIN, size: 28, bold: true })],
  });
}

export function heading2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: FONT_MAIN, size: 26, bold: true })],
  });
}

export function heading3(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, font: FONT_MAIN, size: FONT_SIZE_BODY, bold: true })],
  });
}

export function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 0 }, children: [new Run({})] });
}

// ── Station coordinate table ────────────────────────────────────────────────

function tableCell(text: string, header = false, colSpan?: number): TableCell {
  return new TableCell({
    columnSpan: colSpan,
    shading: header ? TABLE_HEADER_SHADING : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: TABLE_BORDER_THIN,
      bottom: TABLE_BORDER_THIN,
      left: TABLE_BORDER_THIN,
      right: TABLE_BORDER_THIN,
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text,
            font: FONT_MAIN,
            size: FONT_SIZE_SMALL,
            bold: header,
          }),
        ],
      }),
    ],
  });
}

export function stationTable(
  cuadroLabel: string,
  title: string,
  stations: PdtStation[],
  utmZoneLabel: string,
): (Paragraph | Table)[] { // eslint-disable-line @typescript-eslint/no-redundant-type-constituents
  const header = new Paragraph({
    spacing: { before: 120, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: cuadroLabel, font: FONT_MAIN, size: FONT_SIZE_BODY, bold: true }),
    ],
  });
  const subHeader = new Paragraph({
    spacing: { after: 120 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: title, font: FONT_MAIN, size: FONT_SIZE_BODY, bold: true }),
    ],
  });

  if (stations.length === 0) {
    const emptyTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            tableCell("Estación de evaluación", true),
            tableCell(`Coordenadas UTM (WGS 84, ${utmZoneLabel})`, true, 2),
            tableCell("Ubicación referencial", true),
          ],
        }),
        new TableRow({
          children: [
            tableCell("E"),
            tableCell("N"),
            tableCell(""),
            tableCell(""),
          ],
        }),
        new TableRow({
          children: [
            tableCell("—"),
            tableCell("—"),
            tableCell("—"),
            tableCell("—"),
          ],
        }),
      ],
    });
    const elaborado = new Paragraph({
      spacing: { after: SPACE_AFTER_PARA },
      children: [new TextRun({ text: "Elaborado por: INSIDEO.", font: FONT_MAIN, size: FONT_SIZE_SMALL, italics: true })],
    });
    return [header, subHeader, emptyTable, elaborado];
  }

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        tableCell("Estación de evaluación", true),
        tableCell(`Coordenadas UTM (WGS 84, ${utmZoneLabel})`, true, 2),
        tableCell("Ubicación referencial", true),
      ],
    }),
    new TableRow({
      tableHeader: true,
      children: [
        tableCell("", true),
        tableCell("Este (m)", true),
        tableCell("Norte (m)", true),
        tableCell("", true),
      ],
    }),
    ...stations.map((s) => {
      const { easting, northing } = toUtm(s.lon, s.lat);
      return new TableRow({
        children: [
          tableCell(s.station_code),
          tableCell(Math.round(easting).toLocaleString("es-PE")),
          tableCell(Math.round(northing).toLocaleString("es-PE")),
          tableCell(s.referencia ?? "—"),
        ],
      });
    }),
  ];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });

  const elaborado = new Paragraph({
    spacing: { after: SPACE_AFTER_PARA },
    children: [new TextRun({ text: "Elaborado por: INSIDEO.", font: FONT_MAIN, size: FONT_SIZE_SMALL, italics: true })],
  });

  return [header, subHeader, table, elaborado];
}

// ── Figure helper ───────────────────────────────────────────────────────────

export function figureBlock(
  figLabel: string,
  figTitle: string,
  imageData: Buffer | null,
): Paragraph[] {
  const blocks: Paragraph[] = [];

  if (imageData) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [
          new ImageRun({
            data: imageData,
            transformation: { width: 480, height: 320 },
            type: "png",
          }),
        ],
      }),
    );
  } else {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
        },
        children: [
          new TextRun({ text: "[Figura pendiente]", font: FONT_MAIN, size: FONT_SIZE_BODY, color: "888888" }),
        ],
      }),
    );
  }

  blocks.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: SPACE_AFTER_PARA },
      children: [
        new TextRun({ text: `${figLabel}\n`, font: FONT_MAIN, size: FONT_SIZE_SMALL, bold: true }),
        new TextRun({ text: figTitle, font: FONT_MAIN, size: FONT_SIZE_SMALL }),
      ],
    }),
  );

  return blocks;
}

// ── Unused import cleanup (keep the imports visible for docx types) ──────────
void runBold; void runBody; void runSmall;
