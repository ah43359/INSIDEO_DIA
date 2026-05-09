/**
 * DOCX Generator — produces a Word document for Resultados de Monitoreo.
 * Adapted from the standalone baseline-quality-dashboards.
 *
 * Produces a fully formatted document with:
 * - INSIDEO cover header
 * - Section title (e.g. "SECCIÓN 3.3.6 CALIDAD DE AIRE")
 * - Project info table
 * - Monitoring stations table
 * - Parameters table with ECA thresholds
 * - Results matrix with exceedance coloring
 * - Canvas bar charts embedded as images
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { renderBarChart, type ChartDataset } from "./chart-renderer";
import type { FactorDef } from "./eca-registry";
import { formatValue } from "./exceedance";

export interface MatrixStation {
  code: string;
  campaign: string;
  date: string;
  este?: number;
  norte?: number;
  datum?: string;
  zona?: string;
  alt?: number;
  desc?: string;
}

export interface MonitoreoProjectInfo {
  nombre: string;
  cliente: string;
  instrumento: string;
  numeroServicios: string;
  fecha: string;
  rD: string;
  lab: string;
  acreditacion: string;
  desc: string;
}

export interface MonitoreoParam {
  id: string;
  name: string;
  unit: string;
  eca: string;
  period?: string;
  on: boolean;
}

export type MonitoreoResults = Record<string, Record<string, string | number>>;

export interface MonitoreoFactorData {
  factor: FactorDef;
  projectInfo: MonitoreoProjectInfo;
  stations: MatrixStation[];
  params: MonitoreoParam[];
  results: MonitoreoResults;
  selectedCategory?: string;
  selectedZone?: string;
}

// ─── Color constants (match standalone dashboards) ─────────────────────────────
const NAVY    = "0F2E4A";
const BLUE    = "1A6BAD";
const LIGHT_BLUE = "2484CC";
const TEAL    = "0D7A6B";
const RED     = "C0392B";
const RED_LIGHT  = "FEF2F2";
const GREEN    = "166534";
const GREEN_LIGHT = "DCFCE7";
const GRAY    = "6B7280";
const LIGHT_TEAL = "D4F0EC";

// ─── Cell builders ────────────────────────────────────────────────────────────

function hCell(text: string, w = 1000): TableCell {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { fill: BLUE, type: "solid" },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
      }),
    ],
  });
}

function dCell(
  text: string,
  opts: { bold?: boolean; bg?: string; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
): TableCell {
  return new TableCell({
    shading: { fill: opts.bg || "FFFFFF", type: "solid" },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            color: opts.color || "000000",
            size: 18,
          }),
        ],
      }),
    ],
  });
}

function para(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {},
): Paragraph {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { after: opts.after ?? 60 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 20,
        color: opts.color || "000000",
      }),
    ],
  });
}

function subHead(text: string): Paragraph {
  return para(text, { bold: true, size: 22, color: NAVY, after: 80 });
}

function sectionHead(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text, bold: true, size: 28, color: NAVY, font: "Bookman Old Style" }),
    ],
  });
}

function blank(): Paragraph {
  return new Paragraph({ children: [], spacing: { after: 60 } });
}

// ─── Table builders ───────────────────────────────────────────────────────────

function buildProjectInfoTable(info: MonitoreoProjectInfo): Table {
  const fields: [string, string][] = [
    ["Proyecto",              info.nombre || "–"],
    ["Cliente",               info.cliente || "–"],
    ["Instrumento de gestión", info.instrumento || "–"],
    ["N° Servicios",          info.numeroServicios || "–"],
    ["Fecha",                 info.fecha || "–"],
    ["R.D.",                  info.rD || "–"],
    ["Laboratorio",           info.lab || "–"],
    ["Acreditación",          info.acreditacion || "–"],
  ];
  const rows = fields.map(([label, value]) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          shading: { fill: LIGHT_BLUE, type: "solid" },
          children: [para(label, { bold: true, size: 18, color: "FFFFFF" })],
        }),
        new TableCell({
          width: { size: 6200, type: WidthType.DXA },
          children: [para(value, { size: 18 })],
        }),
      ],
    }),
  );
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function buildStationsTable(stations: MatrixStation[]): Table {
  const header = new TableRow({
    children: [
      hCell("Código", 800),
      hCell("Campaña", 900),
      hCell("Fecha", 900),
      hCell("Este (UTM)", 900),
      hCell("Norte (UTM)", 900),
      hCell("Datum", 800),
      hCell("Zona", 600),
      hCell("Alt (m)", 600),
    ],
  });
  const data = stations.map((s) =>
    new TableRow({
      children: [
        dCell(s.code, { bold: true }),
        dCell(s.campaign),
        dCell(s.date),
        dCell(s.este != null ? String(s.este) : "–", { align: AlignmentType.RIGHT }),
        dCell(s.norte != null ? String(s.norte) : "–", { align: AlignmentType.RIGHT }),
        dCell(s.datum || "WGS84"),
        dCell(s.zona || "–"),
        dCell(s.alt != null ? String(s.alt) : "–", { align: AlignmentType.RIGHT }),
      ],
    }),
  );
  return new Table({ rows: [header, ...data], width: { size: 100, type: WidthType.PERCENTAGE } });
}

function buildEcaTable(params: MonitoreoParam[], extraCol = ""): Table {
  const header = new TableRow({
    children: [
      hCell("Parámetro", 3000),
      hCell("Unidad", 1000),
      hCell("Período", 1400),
      ...(extraCol ? [hCell(extraCol, 1500)] : []),
      hCell("Incl.", 700),
    ],
  });
  const data = params
    .filter((p) => p.on)
    .map((p) => {
      const cells = [
        dCell(p.name),
        dCell(p.unit, { align: AlignmentType.CENTER }),
        dCell(p.period || "–", { align: AlignmentType.CENTER }),
      ];
      if (extraCol) cells.push(dCell(p.eca, { align: AlignmentType.CENTER }));
      cells.push(dCell("✓", { align: AlignmentType.CENTER, color: GREEN }));
      return new TableRow({ children: cells });
    });
  return new Table({ rows: [header, ...data], width: { size: 100, type: WidthType.PERCENTAGE } });
}

function buildResultsTable(
  stations: MatrixStation[],
  params: MonitoreoParam[],
  results: MonitoreoResults,
): Table {
  const activeParams = params.filter((p) => p.on);
  const headerCells = [
    hCell("Parámetro", 2400),
    hCell("Unidad", 700),
    hCell("ECA", 700),
    ...stations.map((s) => hCell(`${s.code}\n${s.campaign}\n${s.date}`, 900)),
  ];
  const header = new TableRow({ children: headerCells });

  const dataRows = activeParams.map((p) => {
    const cells = [
      dCell(p.name),
      dCell(p.unit, { align: AlignmentType.CENTER }),
      dCell(p.eca, { align: AlignmentType.CENTER, color: BLUE }),
    ];
    for (const s of stations) {
      const raw = results[s.code]?.[p.id];
      const hasVal = raw != null && String(raw).trim() !== "";
      const v = parseFloat(String(raw ?? ""));
      const exceeds = hasVal && p.eca && !isNaN(v) && v > parseFloat(p.eca);
      const bg = !hasVal ? "FFFFFF" : exceeds ? RED_LIGHT : GREEN_LIGHT;
      const color = !hasVal ? GRAY : exceeds ? RED : GREEN;
      cells.push(
        new TableCell({
          shading: { fill: bg, type: "solid" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: hasVal ? formatValue(raw) : "–", color, bold: hasVal, size: 18 }),
              ],
            }),
          ],
        }),
      );
    }
    return new TableRow({ children: cells });
  });

  return new Table({ rows: [header, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } });
}

// ─── Chart builder ────────────────────────────────────────────────────────────

async function buildChartPara(
  stations: MatrixStation[],
  results: MonitoreoResults,
  paramId: string,
  paramName: string,
  unit: string,
  eca: number | null,
): Promise<Paragraph> {
  const datasets: ChartDataset[] = stations.map((s) => {
    const raw = results[s.code]?.[paramId];
    const v = parseFloat(String(raw ?? ""));
    return {
      label: s.code,
      value: isNaN(v) ? 0 : v,
      exceeds: eca != null && !isNaN(v) && v > eca,
    };
  });

  const base64 = renderBarChart(datasets, {
    title: paramName,
    unit,
    ecaThreshold: eca,
    width: 420,
    height: 200,
  });

  const b64data = base64.split(",")[1];
  if (!b64data) return blank();

  const buffer = Uint8Array.from(atob(b64data), (c) => c.charCodeAt(0));
  const img = new ImageRun({
    data: buffer,
    transformation: { width: 420, height: 200 },
    type: "png",
  });

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60 },
    children: [img],
  });
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateMonitoreoDocx(data: MonitoreoFactorData): Promise<Blob> {
  const { factor, projectInfo, stations, params, results } = data;
  const children: (Paragraph | Table)[] = [];

  // INSIDEO header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "INSIDEO", bold: true, size: 36, color: TEAL, font: "Bookman Old Style" }),
      ],
    }),
  );

  // Section heading
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `SECCIÓN ${factor.section}\n${factor.sectionTitle}`,
          bold: true,
          size: 26,
          font: "Bookman Old Style",
          color: NAVY,
        }),
      ],
    }),
  );

  // Project info
  children.push(subHead("1. Información del Proyecto"));
  children.push(buildProjectInfoTable(projectInfo));
  children.push(blank());

  // Stations
  if (stations.length > 0) {
    children.push(subHead("2. Estaciones de Monitoreo"));
    children.push(buildStationsTable(stations));
    children.push(blank());
  }

  // Parameters
  children.push(subHead("3. Parámetros de Monitoreo y Estándares de Calidad Ambiental"));
  children.push(para(`Norma: ${factor.decree}`));
  children.push(buildEcaTable(params, data.selectedCategory || data.selectedZone || ""));
  children.push(blank());

  // Results
  children.push(subHead("4. Resultados de Monitoreo"));
  children.push(buildResultsTable(stations, params, results));
  children.push(blank());

  // Charts for each active param
  for (const p of params.filter((x) => x.on)) {
    const ecaVal = p.eca ? parseFloat(p.eca.replace(",", ".")) : null;
    const chartPara = await buildChartPara(stations, results, p.id, p.name, p.unit, ecaVal);
    children.push(chartPara);
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function downloadDocx(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
