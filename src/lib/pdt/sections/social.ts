import { Paragraph } from "docx";
import { bodyParagraph, bulletParagraph, heading2, heading3 } from "../helpers";

export function buildSocial(projectName: string): Paragraph[] {
  return [
    heading2("2.3 Aspecto social"),
    heading3("2.3.1 Personal"),
    bodyParagraph(
      `Para la caracterización del aspecto social como parte de la línea base de la Declaración ` +
      `de Impacto Ambiental (DIA) del Proyecto de Exploración Minera ${projectName}, se designará ` +
      `un especialista social con experiencia en metodologías de investigación cualitativa y ` +
      `cuantitativa aplicadas a proyectos de exploración minera.`,
    ),
    bulletParagraph(
      `Especialista social: Profesional en ciencias sociales (sociólogo, antropólogo, ` +
      `trabajador social o afín) con experiencia en la elaboración de líneas base sociales para ` +
      `proyectos del sector minero-energético. Se encargará de la aplicación de los instrumentos ` +
      `de recopilación de información primaria (encuestas, entrevistas, grupos focales) y ` +
      `sistematización de la información secundaria.`,
    ),
    heading3("2.3.2 Metodología"),
    bodyParagraph(
      `La caracterización del aspecto social se realizará mediante la recopilación de información ` +
      `primaria y secundaria sobre la población del área de estudio social del proyecto. Se ` +
      `utilizarán las siguientes técnicas de recopilación de información:`,
    ),
    bulletParagraph(
      `Recopilación de información secundaria: Revisión de fuentes oficiales (INEI, MIDIS, ` +
      `MINEDU, MINSA, etc.) y documentos técnicos disponibles sobre las comunidades del área ` +
      `de influencia social.`,
    ),
    bulletParagraph(
      `Encuestas a hogares: Aplicación de encuestas estructuradas a una muestra representativa ` +
      `de los hogares de las comunidades del área de influencia social directa, para obtener ` +
      `información sobre las características sociodemográficas, económicas y de acceso a ` +
      `servicios básicos de la población.`,
    ),
    bulletParagraph(
      `Entrevistas a actores clave: Realización de entrevistas semiestructuradas a autoridades ` +
      `locales, representantes de organizaciones de base, líderes comunitarios e informantes ` +
      `calificados, con el fin de obtener información sobre la dinámica social, económica y ` +
      `cultural de las comunidades del área de estudio.`,
    ),
    bulletParagraph(
      `Grupos focales: Realización de sesiones grupales de discusión para profundizar en temas ` +
      `específicos relacionados con la percepción de la población sobre el proyecto y sus ` +
      `posibles impactos.`,
    ),
  ];
}
