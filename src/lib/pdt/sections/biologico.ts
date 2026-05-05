import { Paragraph, Table } from "docx";
import { type PdtStation, bodyParagraph, bulletParagraph, emptyLine, figureBlock, heading2, heading3, stationTable } from "../helpers";

export interface BiologicoData {
  projectName: string;
  utmZoneLabel: string;
  mapImage: Buffer | null;
}

export function buildBiologico(data: BiologicoData): (Paragraph | Table)[] {
  const { projectName, utmZoneLabel, mapImage } = data;

  // Empty stations — per design decision (flora/fauna/hidro not in schema yet)
  const emptyStations: PdtStation[] = [];

  return [
    heading2("2.2 Aspecto biológico"),
    heading3("2.2.1 Personal"),
    bodyParagraph(
      `Para la caracterización del aspecto biológico como parte de la línea base de la Declaración ` +
      `de Impacto Ambiental (DIA) del Proyecto de Exploración Minera ${projectName}, se designarán ` +
      `especialistas en los diferentes grupos taxonómicos a evaluar (flora, fauna silvestre e ` +
      `hidrobiología), cuyas funciones en el área de estudio dependerán del componente a evaluar.`,
    ),
    bulletParagraph(
      `Especialista en flora: Profesional biólogo con experiencia en botánica y reconocimiento de ` +
      `especies de flora silvestre en ecosistemas altoandinos. Se encargará de la evaluación de ` +
      `la composición, diversidad y cobertura de los tipos de vegetación presentes en el área de estudio.`,
    ),
    bulletParagraph(
      `Especialista en fauna terrestre: Profesional biólogo con experiencia en el reconocimiento ` +
      `de especies de fauna silvestre (mamíferos, aves, reptiles, anfibios). Realizará la ` +
      `evaluación de la diversidad y abundancia de las especies en el área de estudio.`,
    ),
    bulletParagraph(
      `Especialista en hidrobiología: Profesional biólogo con experiencia en la evaluación de ` +
      `macroinvertebrados bentónicos y comunidades de peces en sistemas lóticos y lénticos.`,
    ),

    heading3("2.2.2 Metodología"),

    heading3("2.2.2.1 Flora y vegetación"),
    bodyParagraph(
      `La evaluación de la flora y vegetación se realizará mediante el establecimiento de unidades ` +
      `de muestreo (transectos y/o parcelas) en los diferentes tipos de vegetación identificados ` +
      `en el área de estudio. Se utilizará el método de transectos de Gentry (1982) para el ` +
      `registro de la vegetación leñosa, y el método de Braun-Blanquet (1979) para la estimación ` +
      `de la cobertura vegetal por estratos. Se registrará el hábito de crecimiento de las ` +
      `especies identificadas y se colectarán muestras botánicas de las especies no identificadas ` +
      `in situ para su posterior determinación en herbario.`,
    ),
    bodyParagraph(
      `En el Cuadro 4 y en la Figura 4 se presenta la ubicación de las estaciones de evaluación ` +
      `de flora y vegetación.`,
    ),
    ...stationTable(
      "Cuadro 4",
      "Ubicación de las estaciones de evaluación de flora y fauna silvestre",
      emptyStations,
      utmZoneLabel,
    ),
    ...figureBlock("Figura 4", `Estaciones de evaluación – Flora y fauna silvestre – Proyecto ${projectName}`, mapImage),

    heading3("2.2.2.2 Fauna terrestre"),
    bodyParagraph(
      `La evaluación de la fauna terrestre (mamíferos, aves, reptiles y anfibios) se realizará ` +
      `mediante el uso de métodos estandarizados de muestreo para cada grupo taxonómico, ` +
      `siguiendo los lineamientos del Manual de Métodos para el Desarrollo de Inventarios de ` +
      `Biodiversidad del MINAM (2015). Las estaciones de evaluación de fauna corresponden a las ` +
      `mismas estaciones de flora (Cuadro 4 y Figura 4).`,
    ),

    heading3("2.2.2.3 Hidrobiología"),
    bodyParagraph(
      `La evaluación de las comunidades hidrobiológicas se realizará en los cuerpos de agua ` +
      `superficial identificados en el área de estudio, incluyendo ríos, quebradas, cochas y/o ` +
      `humedales. Se evaluarán las comunidades de macroinvertebrados bentónicos, perifiton y, ` +
      `de existir, ictiofauna, siguiendo los protocolos del Protocolo Nacional de Monitoreo de ` +
      `la Calidad de los Recursos Hídricos Superficiales (ANA, 2016).`,
    ),
    bodyParagraph(
      `En el Cuadro 5 y en la Figura 5 se presenta la ubicación de las estaciones de evaluación ` +
      `hidrobiológica.`,
    ),
    ...stationTable(
      "Cuadro 5",
      "Ubicación de las estaciones de evaluación hidrobiológica",
      emptyStations,
      utmZoneLabel,
    ),
    ...figureBlock("Figura 5", `Estaciones de evaluación – Hidrobiología – Proyecto ${projectName}`, mapImage),

    emptyLine(),
  ];
}
