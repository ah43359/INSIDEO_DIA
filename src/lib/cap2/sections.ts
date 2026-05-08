// Cap. 2 docx body builders, one function per top-level section block.
//
// Body text matches the standalone template
// (eia-chapter2-description-template.html, lines ~1700–1910).

import type { Paragraph } from "docx";
import type { Cap2State } from "./state";
import { bodyP, boldRun, bulletP, normalRun, sectionHeading, v } from "./styles";

type Build = (state: Cap2State) => Paragraph[];

export const buildIntro: Build = (state) => {
  const { introFields: iF, utmZone, introType } = state;
  const isDIA = introType === "DIA";
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.1 Introducción"));

  out.push(
    bodyP([
      normalRun(
        "En el presente capítulo se describen los antecedentes, componentes y actividades correspondientes al ",
      ),
      boldRun(v(iF.nombreProyecto, "NOMBRE DEL PROYECTO")),
      normalRun(' (en adelante, el "Proyecto"), el cual se encuentra bajo la titularidad de '),
      boldRun(v(iF.empresaTitular, "EMPRESA")),
      normalRun(' (en adelante, "'),
      boldRun(v(iF.abrevEmpresa, "ABREV.")),
      normalRun(
        isDIA
          ? '"), para sustentar la aprobación de la Declaración de Impacto Ambiental (DIA – Categoría I) (en adelante, la "'
          : '"), para sustentar la aprobación de la Modificación de la Declaración de Impacto Ambiental (MDIA – Categoría I) (en adelante, la "',
      ),
      boldRun(v(iF.abrevProyecto, isDIA ? "ABREV. DIA" : "ABREV. MDIA")),
      normalRun('").'),
    ]),
  );

  if (!isDIA) {
    out.push(
      bodyP([
        normalRun("Es importante mencionar que el Proyecto cuenta con una DIA aprobada mediante la "),
        boldRun(v(iF.rdAprobacion, "RESOLUCIÓN DIRECTORAL")),
        normalRun(' (en adelante, "'),
        boldRun(v(iF.abrevDIA, "ABREV. DIA")),
        normalRun('").'),
      ]),
    );
  }

  out.push(
    bodyP([
      normalRun("El Proyecto se encuentra ubicado en el distrito de "),
      boldRun(v(iF.distrito, "DISTRITO")),
      normalRun(", provincia de "),
      boldRun(v(iF.provincia, "PROVINCIA")),
      normalRun(", región "),
      boldRun(v(iF.region, "REGIÓN")),
      normalRun(", con punto de referencia en las coordenadas UTM (Datum WGS84, Zona "),
      normalRun(utmZone),
      normalRun(") Este: "),
      boldRun(v(iF.coordEste, "ESTE")),
      normalRun(" m, Norte: "),
      boldRun(v(iF.coordNorte, "NORTE")),
      normalRun(" m."),
    ]),
  );

  out.push(bodyP("El Proyecto comprende el desarrollo de actividades de exploración minera mediante la ejecución de:"));
  out.push(
    bulletP(
      `Habilitación y perforación de hasta ${v(iF.numPlataformas, "N°")} plataformas de perforación, con un total de ${v(iF.numSondajes, "N°")} sondajes.`,
    ),
  );
  out.push(bulletP(`Habilitación y uso de hasta ${v(iF.kmAccesos, "N°")} km de accesos.`));
  if (iF.auxiliarList?.trim()) {
    out.push(bulletP(`Infraestructura auxiliar: ${iF.auxiliarList}.`));
  }

  return out;
};

export const buildAntecedentes: Build = (state) => {
  const { dgFields: dF, content, introType } = state;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.2 Antecedentes"));

  out.push(sectionHeading(2, "2.2.1 Datos generales"));
  out.push(sectionHeading(3, "Nombre"));
  out.push(
    bodyP([
      normalRun("El presente estudio corresponde a "),
      boldRun(v(dF.dg_nombreCompleto || dF.dg_tipoEstudio, "NOMBRE COMPLETO DEL ESTUDIO")),
      normalRun(", correspondiente al Proyecto "),
      boldRun(v(dF.dg_nombreProyecto, "NOMBRE DEL PROYECTO")),
      normalRun(", ubicado en el distrito de "),
      boldRun(v(dF.dg_distrito, "DISTRITO")),
      normalRun(", provincia de "),
      boldRun(v(dF.dg_provincia, "PROVINCIA")),
      normalRun(" y región "),
      boldRun(v(dF.dg_region, "REGIÓN")),
      normalRun("."),
    ]),
  );

  out.push(sectionHeading(3, "Titular"));
  out.push(
    bodyP([
      normalRun("El titular del Proyecto es "),
      boldRun(v(dF.dg_empresaNombre, "EMPRESA")),
      normalRun(" (RUC: "),
      boldRun(v(dF.dg_ruc, "RUC")),
      normalRun("), con domicilio en "),
      boldRun(v(dF.dg_direccion, "DIRECCIÓN")),
      normalRun("."),
    ]),
  );

  out.push(sectionHeading(3, "Representante legal"));
  out.push(
    bodyP([
      normalRun("El representante legal es "),
      boldRun(v(dF.dg_repNombre, "NOMBRE")),
      normalRun(", "),
      boldRun(v(dF.dg_repCargo, "CARGO")),
      normalRun(", con DNI N° "),
      boldRun(v(dF.dg_repDNI, "DNI")),
      normalRun("."),
    ]),
  );

  if (introType === "MDIA") {
    out.push(sectionHeading(2, "2.2.2 Antecedentes del área efectiva y área de influencia directa"));
    out.push(
      bodyP([
        normalRun("El área efectiva anterior comprende "),
        boldRun(v(dF.dg_areaEfectivaHa, "ÁREA")),
        normalRun(" ha y el área de influencia directa anterior, "),
        boldRun(v(dF.dg_areaInfluenciaHa, "ÁREA")),
        normalRun(" ha, según lo aprobado mediante "),
        boldRun(v(dF.dg_rdAnterior, "RD")),
        normalRun(" del "),
        boldRun(v(dF.dg_fechaRdAnterior, "FECHA")),
        normalRun(". La nueva área efectiva propuesta es "),
        boldRun(v(dF.dg_nuevaAreaEfectivaHa, "ÁREA")),
        normalRun(" ha y la nueva área de influencia directa, "),
        boldRun(v(dF.dg_nuevaAreaInfluenciaHa, "ÁREA")),
        normalRun(" ha."),
      ]),
    );
  }

  out.push(sectionHeading(2, "2.2.3 Derechos o concesiones mineras"));
  out.push(
    bodyP([
      normalRun("El Proyecto se desarrollará dentro de "),
      boldRun(v(dF.dg_numConcesiones, "N°")),
      normalRun(" concesión(es) minera(s), cuyas partidas electrónicas se adjuntan en el "),
      boldRun(v(dF.dg_anexoConcesiones, "ANEXO")),
      normalRun(". Los vértices se detallan en "),
      boldRun(v(dF.dg_cuadroConcesiones, "CUADRO")),
      normalRun(" y se grafican en "),
      boldRun(v(dF.dg_figConcesiones, "FIGURA")),
      normalRun("."),
    ]),
  );
  if (dF.dg_concesionesDetalle?.trim()) {
    for (const line of dF.dg_concesionesDetalle.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  }

  out.push(sectionHeading(2, "2.2.4 Componentes no cerrados"));
  out.push(bodyP(dF.dg_componentesNoCerradosTexto?.trim() || "[Completar descripción de componentes no cerrados]"));

  out.push(sectionHeading(2, "2.2.5 Estudios o investigaciones previas"));
  out.push(bodyP(dF.dg_estudiosDescripcion?.trim() || "[Completar descripción de estudios previos]"));

  out.push(sectionHeading(2, "2.2.6 Permisos existentes"));
  if (dF.dg_permisosLista?.trim()) {
    for (const line of dF.dg_permisosLista.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  } else {
    out.push(bodyP("[Completar lista de permisos]"));
  }

  out.push(sectionHeading(2, "2.2.7 Propiedad superficial"));
  out.push(
    bodyP([
      normalRun("El terreno superficial corresponde a "),
      boldRun(v(dF.dg_propietarioTerreno, "PROPIETARIO")),
      normalRun(", según "),
      boldRun(v(dF.dg_fuenteLimites, "FUENTE")),
      normalRun(" (ver "),
      boldRun(v(dF.dg_figPropiedad, "FIGURA")),
      normalRun(")."),
    ]),
  );

  out.push(sectionHeading(2, "2.2.8 Áreas Naturales Protegidas (ANP)"));
  out.push(
    bodyP([
      normalRun("La ANP más cercana al Proyecto es "),
      boldRun(v(dF.dg_nombreANP, "ANP")),
      normalRun(", ubicada a aproximadamente "),
      boldRun(v(dF.dg_distanciaANP, "DISTANCIA")),
      normalRun(" km (ver "),
      boldRun(v(dF.dg_figANP, "FIGURA")),
      normalRun(")."),
    ]),
  );

  // Free-text override for 2.2 if user wrote one
  if (content["2.2"]?.trim()) out.push(bodyP(content["2.2"]));

  return out;
};

export const buildObjetivos: Build = (state) => {
  const { introType, dgFields: dF, introFields: iF } = state;
  const isDIA = introType === "DIA";
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.3 Objetivos y justificación"));
  out.push(
    bodyP(
      "El objetivo general del presente documento es desarrollar una descripción y análisis de las instalaciones y actividades propuestas, así como de sus efectos en el entorno ambiental con respecto a la condición basal.",
    ),
  );
  out.push(
    bodyP([
      normalRun(isDIA ? "De manera específica, el objetivo de la presente DIA" : "De manera específica, el objetivo de la presente Modificación de la DIA"),
      normalRun(
        ` está relacionado a la habilitación y perforación de hasta ${v(iF.numPlataformas, "N°")} plataformas de perforación, ${v(iF.numSondajes, "N°")} sondajes, ${v(iF.kmAccesos, "N°")} km de accesos`,
      ),
      normalRun(iF.auxiliarList ? `, ${iF.auxiliarList}` : ""),
      normalRun(
        ". Esto se realiza con la finalidad de investigar áreas favorables y tomar decisiones informadas respecto a continuar la exploración de potenciales áreas mineralizadas de ",
      ),
      boldRun(v(dF.obj_minerales, "MINERALES OBJETIVO")),
      normalRun("."),
    ]),
  );
  return out;
};

export const buildLocalizacion: Build = (state) => {
  const { dgFields: dF, introFields: iF, utmZone } = state;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.4 Localización geográfica y política del Proyecto"));
  out.push(
    bodyP([
      normalRun("El área efectiva del Proyecto se encuentra ubicada en el distrito de "),
      boldRun(v(iF.distrito, "DISTRITO")),
      normalRun(", provincia de "),
      boldRun(v(iF.provincia, "PROVINCIA")),
      normalRun(" y región "),
      boldRun(v(iF.region, "REGIÓN")),
      normalRun(", a "),
      boldRun(v(dF.loc_distanciaCapital, "DISTANCIA")),
      normalRun(" km al oeste de la capital del distrito."),
    ]),
  );
  out.push(
    bodyP([
      normalRun("La ubicación del centroide del área efectiva del Proyecto es: Este "),
      boldRun(v(dF.loc_centroideEste, "ESTE")),
      normalRun(" m, Norte "),
      boldRun(v(dF.loc_centroideNorte, "NORTE")),
      normalRun(` m (UTM, WGS84, Zona ${utmZone}).`),
    ]),
  );
  out.push(
    bodyP([
      normalRun("Geográficamente, el área efectiva se encuentra en la "),
      boldRun(v(dF.loc_cuenca, "CUENCA")),
      normalRun(" (código Pfafstetter "),
      boldRun(v(dF.loc_codigoPfafstetter, "CÓDIGO")),
      normalRun("), a una altitud que varía entre los "),
      boldRun(v(dF.loc_altitudMin, "MIN")),
      normalRun(" m s.n.m. y "),
      boldRun(v(dF.loc_altitudMax, "MAX")),
      normalRun(" m s.n.m. de elevación."),
    ]),
  );
  return out;
};

export const buildDelimitacion: Build = (state) => {
  const { dgFields: dF } = state;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.5 Delimitación del perímetro del área efectiva"));
  out.push(
    bodyP([
      normalRun("El área efectiva del Proyecto se encuentra delimitada por una (01) poligonal cerrada definida por "),
      boldRun(v(dF.del_numVertices, "N°")),
      normalRun(" vértices, comprendiendo un área total aproximada de "),
      boldRun(v(dF.del_areaTotalHa, "ÁREA")),
      normalRun(" ha."),
    ]),
  );

  out.push(sectionHeading(2, "2.5.1 Área de actividad minera"));
  out.push(
    bodyP([
      normalRun("El área de actividad minera (AAM) comprende un área de "),
      boldRun(v(dF.aam_areaHa, "ÁREA")),
      normalRun(" ha, con una ocupación equivalente a "),
      boldRun(v(dF.aam_ocupacionHa, "N°")),
      normalRun(" ha."),
    ]),
  );

  out.push(sectionHeading(2, "2.5.2 Área de uso minero"));
  out.push(
    bodyP([
      normalRun("El área de uso minero comprende un área de "),
      boldRun(v(dF.aum_areaHa, "ÁREA")),
      normalRun(" ha."),
    ]),
  );

  return out;
};

export const buildInfluencia: Build = (state) => {
  const { dgFields: dF } = state;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.6 Área de influencia ambiental"));
  out.push(sectionHeading(2, "2.6.1 Área de influencia ambiental (AIA)"));
  out.push(
    bodyP([
      normalRun("El AIAD del Proyecto comprende un área aproximada total de "),
      boldRun(v(dF.aia_aiadAreaHa, "ÁREA")),
      normalRun(" ha, delimitada por un (01) polígono con "),
      boldRun(v(dF.aia_aiadVertices, "N°")),
      normalRun(" vértices. El AIAI comprende un área de "),
      boldRun(v(dF.aia_aiaiAreaHa, "ÁREA")),
      normalRun(" ha, con "),
      boldRun(v(dF.aia_aiaiVertices, "N°")),
      normalRun(" vértices."),
    ]),
  );

  out.push(sectionHeading(2, "2.6.2 Área de influencia social (AIS)"));
  out.push(
    bodyP([
      normalRun("El área de influencia social directa (AISD) corresponde a: "),
      boldRun(v(dF.ais_aisd, "DESCRIPCIÓN AISD")),
      normalRun(". El área de influencia social indirecta (AISI) corresponde a: "),
      boldRun(v(dF.ais_aisi, "DESCRIPCIÓN AISI")),
      normalRun("."),
    ]),
  );

  return out;
};

export const buildCronograma: Build = (state) => {
  const { dgFields: dF } = state;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.7 Cronograma e inversión del Proyecto"));
  out.push(
    bodyP([
      normalRun("Las actividades de construcción se realizarán durante "),
      boldRun(v(dF.cro_construccionMeses, "N°")),
      normalRun(" meses. La etapa de operación durante "),
      boldRun(v(dF.cro_operacionMeses, "N°")),
      normalRun(" meses. El cierre progresivo tendrá una duración de "),
      boldRun(v(dF.cro_cierreProgresivoMeses, "N°")),
      normalRun(" meses, el cierre final de "),
      boldRun(v(dF.cro_cierreFinalMeses, "N°")),
      normalRun(" meses y el post-cierre de "),
      boldRun(v(dF.cro_postCierreMeses, "N°")),
      normalRun(" meses. En total, aproximadamente "),
      boldRun(v(dF.cro_totalMeses, "N°")),
      normalRun(" meses."),
    ]),
  );
  out.push(
    bodyP([
      normalRun("El monto de inversión del Proyecto asciende a aproximadamente US$ "),
      boldRun(v(dF.cro_inversionTotal, "TOTAL")),
      normalRun("."),
    ]),
  );
  return out;
};

export const buildDescripcion: Build = (state) => {
  const { dgFields: dF, content } = state;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "2.8 Descripción de la etapa de construcción/habilitación, operación y cierre"));

  out.push(sectionHeading(2, "2.8.1 Mineralización"));
  out.push(
    bodyP([
      normalRun(
        "El Proyecto tiene como finalidad recolectar información con el fin de identificar áreas favorables para la ",
      ),
      boldRun(v(dF.min_descripcion || dF.obj_minerales, "DESCRIPCIÓN DE MINERALIZACIÓN")),
      normalRun(" dentro del área efectiva propuesta."),
    ]),
  );

  out.push(sectionHeading(2, "2.8.2 Componentes del Proyecto"));
  out.push(bodyP(content["2.8.2"]?.trim() || "[Completar descripción de componentes del Proyecto]"));

  out.push(sectionHeading(2, "2.8.3 Residuos a generar"));
  out.push(bodyP("El Proyecto generará residuos sólidos tanto peligrosos como no peligrosos. Los residuos no peligrosos incluyen:"));
  if (dF.res_noPeligrososLista?.trim()) {
    for (const line of dF.res_noPeligrososLista.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  }
  out.push(bodyP("Los residuos peligrosos incluyen:"));
  if (dF.res_peligrososLista?.trim()) {
    for (const line of dF.res_peligrososLista.split("\n").filter((l) => l.trim())) {
      out.push(bulletP(line.trim()));
    }
  }
  out.push(
    bodyP([
      normalRun("Los residuos serán manejados por "),
      boldRun(v(dF.res_eorsNombre, "EO-RS")),
      normalRun(", de acuerdo con las normativas ambientales vigentes."),
    ]),
  );

  out.push(sectionHeading(2, "2.8.4 Demanda de agua"));
  out.push(bodyP("La demanda de agua para el Proyecto se compone de:"));
  out.push(bulletP(`Agua industrial: ${v(dF.agua_industrial, "L/día")} L/día`));
  out.push(bulletP(`Agua doméstica: ${v(dF.agua_domestico, "L/día")} L/día`));
  out.push(bulletP(`Demanda total: ${v(dF.agua_total, "L/día")} L/día`));
  out.push(
    bodyP([
      normalRun("La fuente de abastecimiento de agua será "),
      boldRun(v(dF.agua_fuente, "FUENTE DE AGUA")),
      normalRun("."),
    ]),
  );

  out.push(sectionHeading(2, "2.8.5 Insumos"));
  out.push(
    bodyP([
      normalRun("Los aditivos de perforación a utilizar serán: "),
      boldRun(v(dF.ins_aditivosLista, "ADITIVOS")),
      normalRun(". El combustible utilizado será "),
      boldRun(v(dF.ins_combustibleTipo, "TIPO DE COMBUSTIBLE")),
      normalRun(" con un consumo estimado de "),
      boldRun(v(dF.ins_consumoCombDiario, "CONSUMO (gal/día)")),
      normalRun(" gal/día."),
    ]),
  );

  out.push(sectionHeading(2, "2.8.6 Maquinaria y equipos"));
  out.push(
    bodyP([
      normalRun("Se utilizarán "),
      boldRun(v(dF.maq_equiposPerforacion, "N°")),
      normalRun(" equipos de perforación, con un avance promedio de "),
      boldRun(v(dF.maq_avanceDiario, "m/día")),
      normalRun(" m/día por máquina, resultando en aproximadamente "),
      boldRun(v(dF.maq_metrosLineales, "m")),
      normalRun(" metros lineales de perforación."),
    ]),
  );

  for (const id of ["2.8.7", "2.8.8", "2.8.9"]) {
    const titles: Record<string, string> = {
      "2.8.7": "2.8.7 Fuentes de emisión de material particulado, gases y ruidos",
      "2.8.8": "2.8.8 Actividades de transporte",
      "2.8.9": "2.8.9 Descripción del método de construcción",
    };
    out.push(sectionHeading(2, titles[id]));
    out.push(bodyP(content[id]?.trim() || `[Completar ${titles[id]}]`));
  }

  out.push(sectionHeading(2, "2.8.10 Personal"));
  out.push(
    bodyP([
      normalRun("El Proyecto empleará un máximo de "),
      boldRun(v(dF.per_totalPersonas, "N° DE PERSONAS")),
      normalRun(" personas en el pico de actividad, trabajando bajo un régimen de "),
      boldRun(v(dF.per_turno, "RÉGIMEN DE TURNOS")),
      normalRun("."),
    ]),
  );

  out.push(sectionHeading(2, "2.8.11 Fuente de abastecimiento de energía"));
  out.push(
    bodyP([
      normalRun("La fuente de energía para el Proyecto será "),
      boldRun(v(dF.ene_fuente, "FUENTE DE ENERGÍA")),
      normalRun(" con una potencia total instalada de "),
      boldRun(v(dF.ene_potencia, "kW")),
      normalRun(" kW."),
    ]),
  );

  out.push(sectionHeading(2, "2.8.12 Cierre y post-cierre"));
  out.push(bodyP(content["2.8.12"]?.trim() || "[Completar descripción de cierre y post-cierre]"));

  out.push(sectionHeading(2, "2.8.13 Manejo de efluentes y emisiones"));
  out.push(bodyP(content["2.8.13"]?.trim() || "[Completar descripción de manejo de efluentes y emisiones]"));

  return out;
};
