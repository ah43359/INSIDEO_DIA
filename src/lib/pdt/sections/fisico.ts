import { Paragraph, Table } from "docx";
import { type PdtStation, bodyParagraph, bulletParagraph, emptyLine, figureBlock, heading1, heading2, heading3, stationTable, subBullet } from "../helpers";

export interface FisicoData {
  projectName: string;
  clientName: string;
  stationsAire: PdtStation[];
  stationsRuido: PdtStation[];
  stationsAgua: PdtStation[];
  stationsSuelos: PdtStation[];
  utmZoneLabel: string;
  mapImage: Buffer | null;
}

export function buildFisico(data: FisicoData): (Paragraph | Table)[] {
  const { projectName, clientName, stationsAire, stationsRuido, stationsAgua, stationsSuelos, utmZoneLabel, mapImage } = data;

  // Combine aire+ruido for Cuadro 1 (shared stations per Qoya precedent)
  const aireRuidoCombined: PdtStation[] = [];
  const seenCodes = new Set<string>();
  for (const s of [...stationsAire, ...stationsRuido]) {
    if (!seenCodes.has(s.station_code)) {
      seenCodes.add(s.station_code);
      aireRuidoCombined.push(s);
    }
  }

  const nAire = stationsAire.length;
  const nAireStr = `${nAire.toString().padStart(2, "0")} (${numWord(nAire)})`;
  const nAgua = stationsAgua.length;
  const nAguaStr = `${nAgua.toString().padStart(2, "0")} (${numWord(nAgua)})`;
  const nSuelos = stationsSuelos.length;
  const nSuelosStr = `${nSuelos.toString().padStart(2, "0")} (${numWord(nSuelos)})`;

  return [
    heading1("2.0 PLAN DE TRABAJO"),
    heading2("2.1 Aspecto físico"),
    heading3("2.1.1 Personal"),
    bodyParagraph(
      `Para la caracterización del aspecto físico como parte de la línea base ambiental de la ` +
      `Declaración de Impacto Ambiental (DIA) del Proyecto de Exploración Minera ${projectName}, se ` +
      `designarán especialistas (monitores ambientales), cuyas funciones en el área de estudio ` +
      `dependerán del componente a evaluar, al igual que la distribución de camionetas y apoyos ` +
      `locales, tal como se presenta en el Cronograma (ver Sección 3.0).`,
    ),
    bodyParagraph("El personal para la evaluación del aspecto físico es el siguiente:"),
    bulletParagraph(
      `Supervisor de campo: Este profesional designado por INSIDEO se encargará de velar por ` +
      `la salud y seguridad en el área de trabajo, cuyas funciones específicas como supervisor son ` +
      `las de monitorear el trabajo diario de las brigadas, brindar charlas diarias sobre seguridad ` +
      `en el trabajo de campo e identificar los posibles riesgos en el área de trabajo.`,
    ),
    bulletParagraph(
      `Monitores ambientales: Los monitores designados por INSIDEO se encargarán de la evaluación ` +
      `de calidad de aire, niveles de ruido y calidad de agua superficial.`,
    ),
    bulletParagraph(
      `Especialista en suelos: El profesional especialista en suelos designado por INSIDEO se ` +
      `encargará de la evaluación de los suelos en el área de estudio mediante calicatas.`,
    ),

    // ── 2.1.2 Metodología ───────────────────────────────────────────────────
    heading3("2.1.2 Metodología"),

    // ── 2.1.3 Calidad de aire ───────────────────────────────────────────────
    heading3("2.1.3 Calidad de aire"),
    bodyParagraph(
      `Para la caracterización de este componente ambiental, se realizará el muestreo en ${nAireStr} ` +
      `estación${nAire !== 1 ? "es" : ""}, cuya ubicación se presenta en la Figura 1. De acuerdo con el ` +
      `Protocolo Nacional de Monitoreo de la Calidad Ambiental del Aire (MINAM, 2019), para monitoreos ` +
      `cuyo objetivo sea generar información de base, las estaciones propuestas presentan escala de ` +
      `representatividad local con un radio de representatividad de 0,5 a 4 km.`,
    ),
    bodyParagraph("Los parámetros a evaluar son los siguientes:"),
    bulletParagraph("Material particulado con diámetro menor a 2,5 µm (PM2,5)"),
    bulletParagraph("Material particulado con diámetro menor a 10 µm (PM10)"),
    bulletParagraph("Dióxido de nitrógeno (NO₂)"),
    bulletParagraph("Dióxido de azufre (SO₂)"),
    bulletParagraph("Monóxido de carbono (CO)"),
    bulletParagraph("Ozono (O₃)"),
    bodyParagraph(
      `En el Cuadro 1 se presenta la ubicación de las ${nAireStr} estación${nAire !== 1 ? "es" : ""} ` +
      `de evaluación para calidad de aire.`,
    ),
    ...stationTable(
      "Cuadro 1",
      "Ubicación de las estaciones de evaluación de calidad de aire / niveles de ruido",
      aireRuidoCombined,
      utmZoneLabel,
    ),
    ...figureBlock("Figura 1", `Estaciones de evaluación – Calidad de aire / Niveles de ruido – Proyecto ${projectName}`, mapImage),

    // ── 2.1.4 Niveles de ruido ──────────────────────────────────────────────
    heading3("2.1.4 Niveles de ruido"),
    bodyParagraph(
      `Para la caracterización de los niveles de ruido ambiental, se utilizarán las mismas estaciones ` +
      `consideradas para la evaluación de calidad de aire (Cuadro 1), dado que la ubicación de las ` +
      `estaciones de calidad de aire y ruido coincide, al igual que se señala en el Protocolo Nacional ` +
      `de Monitoreo de Ruido Ambiental (MINAM, 2013).`,
    ),
    bodyParagraph(
      `Los parámetros a evaluar son: Nivel de presión sonora equivalente (LAeq), nivel de presión ` +
      `sonora mínimo (LAmin) y nivel de presión sonora máximo (LAmax). Los resultados se compararán ` +
      `con los Estándares Nacionales de Calidad Ambiental para Ruido (ECA-Ruido, D.S. Nº 085-2003-PCM).`,
    ),

    // ── 2.1.5 Inventario de pasivos ambientales ─────────────────────────────
    heading3("2.1.5 Inventario de pasivos ambientales"),
    bodyParagraph(
      `Se realizará un inventario de pasivos ambientales en el área de estudio del proyecto, con el ` +
      `objetivo de identificar y registrar las evidencias de actividades previas que pudieran haber ` +
      `generado algún tipo de impacto ambiental en el área. Este inventario comprenderá un ` +
      `reconocimiento visual del sitio para identificar pasivos ambientales tales como: residuos ` +
      `sólidos, efluentes, suelos contaminados, entre otros.`,
    ),

    // ── 2.1.6 Inventario de fuentes y usuarios de agua ──────────────────────
    heading3("2.1.6 Inventario de fuentes y usuarios de agua"),
    bodyParagraph(
      `Se realizará un inventario de fuentes de agua superficial y subterránea (manantiales, ` +
      `quebradas, ríos, cochas, etc.) e infraestructuras hidráulicas (canales, tomas de agua, ` +
      `reservorios, etc.) en el área de estudio. Este inventario incluirá el registro de sus ` +
      `usuarios y usos actuales, con la finalidad de caracterizar la disponibilidad y uso del ` +
      `recurso hídrico en el área de influencia del proyecto.`,
    ),

    // ── 2.1.7 Calidad del agua superficial ─────────────────────────────────
    heading3("2.1.7 Calidad del agua superficial"),
    bodyParagraph(
      `Para la caracterización de la calidad del agua superficial se realizará el muestreo en ` +
      `${nAguaStr} estación${nAgua !== 1 ? "es" : ""}. Los puntos de muestreo han sido seleccionados ` +
      `considerando la ubicación de los componentes del proyecto, las cuencas hidrográficas presentes ` +
      `en el área de estudio y los usos del agua identificados. Se compararán con los Estándares de ` +
      `Calidad Ambiental para Agua (ECA-Agua, D.S. Nº 004-2017-MINAM), Categoría 3 (riego de vegetales ` +
      `y bebida de animales) y Categoría 4 (conservación del ambiente acuático).`,
    ),
    bodyParagraph(`En el Cuadro 2 y en la Figura 2 se presenta la ubicación de las estaciones de evaluación.`),
    ...stationTable(
      "Cuadro 2",
      "Ubicación de las estaciones de evaluación de calidad de agua superficial",
      stationsAgua,
      utmZoneLabel,
    ),
    ...figureBlock("Figura 2", `Estaciones de evaluación – Calidad de agua superficial – Proyecto ${projectName}`, mapImage),

    // ── 2.1.8 Suelos ────────────────────────────────────────────────────────
    heading3("2.1.8 Suelos"),
    bodyParagraph(
      `Para la caracterización de los suelos se realizará la evaluación en ${nSuelosStr} ` +
      `estación${nSuelos !== 1 ? "es" : ""} mediante la apertura de calicatas. Se caracterizarán los ` +
      `horizontes del perfil del suelo en cada calicata, registrando sus propiedades morfológicas ` +
      `(textura, estructura, consistencia, color, etc.) conforme a la metodología del Manual de ` +
      `Levantamiento de Suelos del USDA (Soil Survey Staff, 2014). Las muestras de suelo se ` +
      `analizarán en un laboratorio acreditado y los resultados se compararán con los Estándares de ` +
      `Calidad Ambiental para Suelo (ECA-Suelo, D.S. Nº 011-2017-MINAM).`,
    ),
    bodyParagraph(`En el Cuadro 3 y en la Figura 3 se presenta la ubicación de las estaciones de evaluación.`),
    ...stationTable(
      "Cuadro 3",
      "Ubicación de las estaciones de evaluación de suelos",
      stationsSuelos,
      utmZoneLabel,
    ),
    ...figureBlock("Figura 3", `Estaciones de evaluación – Suelos – Proyecto ${projectName}`, mapImage),

    emptyLine(),
  ];
}

function numWord(n: number): string {
  const words: Record<number, string> = {
    0: "cero", 1: "uno", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco",
    6: "seis", 7: "siete", 8: "ocho", 9: "nueve", 10: "diez",
  };
  return words[n] ?? n.toString();
}
