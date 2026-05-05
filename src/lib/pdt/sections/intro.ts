import { Paragraph } from "docx";
import { bodyParagraph, heading1 } from "../helpers";

export function buildIntro(projectName: string): Paragraph[] {
  return [
    heading1("1.0 INTRODUCCIÓN"),
    bodyParagraph(
      `El presente documento describe de manera detallada las actividades a realizar como parte ` +
      `del trabajo de campo asociado a la Declaración de Impacto Ambiental (DIA) del Proyecto de ` +
      `Exploración Minera ${projectName}. Esto se realiza con el fin de describir adecuadamente las ` +
      `actividades de manera segura, así como para realizar el seguimiento específico de las mismas. ` +
      `Asimismo, para cumplir con los requerimientos de la normativa ambiental vigente y en función ` +
      `de los Términos de Referencia para la elaboración de una Declaración de Impacto Ambiental ` +
      `(DIA – Categoría I).`,
    ),
    bodyParagraph(
      `En la Sección 2 "Plan de trabajo", se presentan los trabajos a realizar por subcomponente ` +
      `socioambiental, especificando el personal responsable por cada uno de los componentes, así ` +
      `como las tareas a realizar cada día, los requerimientos de acompañamiento local, materiales ` +
      `y equipos a utilizar, requerimientos de camionetas y conductores; y de ser necesario, los ` +
      `requerimientos de permisos especiales.`,
    ),
    bodyParagraph(
      `Además, en la Sección 3 "Cronograma", se presentan de manera conjunta las fechas propuestas ` +
      `para el trabajo de campo de cada subcomponente. Es importante mencionar que este cronograma ` +
      `es referencial y se puede modificar en función del avance del trabajo de campo y/o situaciones ` +
      `adversas que sucedan durante la salida de campo. Asimismo, el componente biológico depende de ` +
      `la aprobación de los permisos de investigación (permisos de colecta) de SERFOR y PRODUCE.`,
    ),
  ];
}
