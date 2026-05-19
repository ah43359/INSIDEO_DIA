import {
  Document,
  Footer,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  HeadingLevel,
  ShadingType,
  BorderStyle,
} from "docx";
import { formatLongDate } from "@/lib/format";

export type EstadoContrato = "pendiente" | "contactado" | "cotizado" | "contratado";

export interface LabEntry {
  id: string;
  parametro: string;
  lab: string;
  contacto: string;
  email: string;
  estado: EstadoContrato;
  notas: string;
}

export interface PersonalEntry {
  id: string;
  especialidad: string;
  empresa: string;
  especialista: string;
  email: string;
  estado: EstadoContrato;
  notas: string;
}

export interface CampoPlanData {
  projectName: string;
  laboratorios: LabEntry[];
  biologicos: PersonalEntry[];
  inspectores: PersonalEntry[];
  sociales: PersonalEntry[];
  notas_generales: string | null;
}

const FONT = "Arial";
const SZ_BODY = 20; // 10pt in half-points
const SZ_H1 = 28;   // 14pt
const SZ_H2 = 24;   // 12pt
const SZ_SMALL = 18; // 9pt

const HEADER_SHADING = { type: ShadingType.SOLID, color: "E8F5E9" };
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function run(text: string, bold = false, size = SZ_BODY): TextRun {
  return new TextRun({ text, font: FONT, size, bold });
}

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: FONT, size: level === HeadingLevel.HEADING_1 ? SZ_H1 : SZ_H2, bold: true })],
  });
}

function cell(text: string, header = false, width?: number): TableCell {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: header ? HEADER_SHADING : undefined,
    borders: BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [run(text, header, header ? SZ_SMALL : SZ_SMALL)],
      }),
    ],
  });
}

function estadoLabel(e: EstadoContrato): string {
  return { pendiente: "Pendiente", contactado: "Contactado", cotizado: "Cotizado", contratado: "Contratado" }[e] ?? e;
}

function labTable(rows: LabEntry[]): Table {
  const headers = ["Parámetro", "Laboratorio", "Contacto", "Email", "Estado", "Notas"];
  const widths = [20, 15, 15, 18, 12, 20];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, true, widths[i])),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: [
              cell(r.parametro, false, widths[0]),
              cell(r.lab, false, widths[1]),
              cell(r.contacto, false, widths[2]),
              cell(r.email, false, widths[3]),
              cell(estadoLabel(r.estado), false, widths[4]),
              cell(r.notas, false, widths[5]),
            ],
          }),
      ),
    ],
  });
}

function personalTable(rows: PersonalEntry[]): Table {
  const headers = ["Especialidad", "Empresa", "Especialista", "Email", "Estado", "Notas"];
  const widths = [20, 15, 15, 18, 12, 20];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, true, widths[i])),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: [
              cell(r.especialidad, false, widths[0]),
              cell(r.empresa, false, widths[1]),
              cell(r.especialista, false, widths[2]),
              cell(r.email, false, widths[3]),
              cell(estadoLabel(r.estado), false, widths[4]),
              cell(r.notas, false, widths[5]),
            ],
          }),
      ),
    ],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ children: [], spacing: { after: 160 } });
}

export async function buildCampoPlanDocument(data: CampoPlanData): Promise<Buffer> {
  const { projectName, laboratorios, biologicos, inspectores, sociales, notas_generales } = data;
  const today = formatLongDate(new Date());

  const children = [
    // Cover
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 240 },
      children: [new TextRun({ text: "Plan de Logística de Campo", font: FONT, size: 36, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [run(projectName, true, SZ_H2)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [run(today, false, SZ_BODY)],
    }),

    // Section 1 — Laboratorios
    heading("1. Laboratorios INACAL (Calidad Ambiental)", HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { after: 120 },
      children: [run("Laboratorios acreditados por INACAL para los parámetros de calidad ambiental.")],
    }),
    labTable(laboratorios),
    spacer(),

    // Section 2 — Personal Biológico
    heading("2. Personal Biológico Externo", HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { after: 120 },
      children: [run("Especialistas biólogos para el muestreo de línea base de cada componente.")],
    }),
    personalTable(biologicos),
    spacer(),

    // Section 3 — Inspectores Ambientales
    heading("3. Inspectores Ambientales", HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { after: 120 },
      children: [run("Personal para cartografía de cuerpos de agua, infraestructura, pasivos, geología y suelos.")],
    }),
    personalTable(inspectores),
    spacer(),

    // Section 4 — Especialistas Sociales
    heading("4. Especialistas Sociales", HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { after: 120 },
      children: [run("Especialistas para entrevistas y encuestas de la línea base socioeconómica.")],
    }),
    personalTable(sociales),
    spacer(),

    // Notes
    ...(notas_generales
      ? [
          heading("5. Notas Generales", HeadingLevel.HEADING_1),
          new Paragraph({ spacing: { after: 120 }, children: [run(notas_generales)] }),
        ]
      : []),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${projectName} – Plan de Campo · `, font: FONT, size: SZ_SMALL }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ_SMALL }),
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
