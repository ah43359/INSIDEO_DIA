import { AlignmentType, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
// Table is a sibling type to Paragraph in docx; return union so callers spread correctly.
import { bodyParagraph, heading1 } from "../helpers";
import { FONT_MAIN, FONT_SIZE_SMALL, TABLE_BORDER_THIN, TABLE_HEADER_SHADING } from "../styles";

function cell(text: string, header = false): TableCell {
  return new TableCell({
    shading: header ? TABLE_HEADER_SHADING : undefined,
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
        children: [new TextRun({ text, font: FONT_MAIN, size: FONT_SIZE_SMALL, bold: header })],
      }),
    ],
  });
}

const COMPONENTS = [
  "Calidad de aire / Ruido",
  "Calidad de agua superficial",
  "Suelos",
  "Inventario pasivos / fuentes de agua",
  "Flora y vegetación",
  "Fauna silvestre",
  "Hidrobiología",
  "Aspecto social",
];

const DAY_COUNT = 10;

export function buildCronograma(): (Paragraph | Table)[] {
  const dayHeaders = Array.from({ length: DAY_COUNT }, (_, i) =>
    cell(`Día ${i + 1}`, true),
  );

  const headerRow = new TableRow({
    tableHeader: true,
    children: [cell("Componente / Actividad", true), ...dayHeaders],
  });

  const dataRows = COMPONENTS.map(
    (comp) =>
      new TableRow({
        children: [
          cell(comp),
          ...Array.from({ length: DAY_COUNT }, () => cell("")),
        ],
      }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  return [
    heading1("3.0 CRONOGRAMA"),
    bodyParagraph(
      `A continuación se presenta el cronograma referencial de actividades de campo. Las fechas ` +
      `específicas serán confirmadas con anticipación al inicio de la campaña de campo y pueden ` +
      `ajustarse en función del avance de los trabajos y/o condiciones adversas.`,
    ),
    table,
  ];
}
