import { Document, Footer, PageNumber, Packer, Paragraph, TextRun } from "docx";
import { type PdtStation, toUtm } from "./helpers";
import { type CoverData, buildCover } from "./sections/cover";
import { buildIntro } from "./sections/intro";
import { buildFisico } from "./sections/fisico";
import { buildBiologico } from "./sections/biologico";
import { buildSocial } from "./sections/social";
import { buildCronograma } from "./sections/cronograma";
import { FONT_MAIN, FONT_SIZE_SMALL } from "./styles";

export interface PdtData {
  projectName: string;
  clientRazonSocial: string;
  clientDomicilio: string | null;
  projectNumber: string | null;
  stations: PdtStation[];
  /** PNG as base64 data URL from the map canvas, or null. */
  mapImageDataUrl: string | null;
}

function dataUrlToBuffer(dataUrl: string | null): Buffer | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

function deriveUtmZoneLabel(stations: PdtStation[]): string {
  if (stations.length === 0) return "Zona 18S";
  const lon = stations[0].lon;
  const { zone } = toUtm(lon, stations[0].lat);
  return `Zona ${zone}S`;
}

function getMonth(): string {
  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  return months[new Date().getMonth()];
}

export async function buildPdtDocument(data: PdtData): Promise<Buffer> {
  const { projectName, clientRazonSocial, clientDomicilio, projectNumber, stations, mapImageDataUrl } = data;

  const mapImage = dataUrlToBuffer(mapImageDataUrl);
  const utmZoneLabel = deriveUtmZoneLabel(stations);

  const byKind = (kind: string): PdtStation[] =>
    stations.filter((s) => s.kind === kind);

  const stationsAire = byKind("aire");
  const stationsRuido = byKind("ruido");
  const stationsAgua = byKind("agua_superficial");
  const stationsSuelos = byKind("suelos");

  const coverData: CoverData = {
    projectName,
    clientRazonSocial,
    clientDomicilio,
    projectNumber,
    month: getMonth(),
    year: new Date().getFullYear().toString(),
  };

  const children = [
    ...buildCover(coverData),
    ...buildIntro(projectName),
    ...buildFisico({
      projectName,
      clientName: clientRazonSocial,
      stationsAire,
      stationsRuido,
      stationsAgua,
      stationsSuelos,
      utmZoneLabel,
      mapImage,
    }),
    ...buildBiologico({ projectName, utmZoneLabel, mapImage }),
    ...buildSocial(projectName),
    ...buildCronograma(),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: "center" as const,
                children: [
                  new TextRun({ text: `${projectName} – Plan de Trabajo · `, font: FONT_MAIN, size: FONT_SIZE_SMALL }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT_MAIN, size: FONT_SIZE_SMALL }),
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
