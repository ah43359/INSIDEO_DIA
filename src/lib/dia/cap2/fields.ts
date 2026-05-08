// Field manifests for Capítulo 2 — Descripción del Proyecto.
//
// These mirror the field definitions in
// C:\Users\ahija\Desktop\INSIDEO\CODE\eia-chapter2-description-template.html
// (the standalone React/Babel template). Keeping the keys identical lets us
// round-trip JSON state between this app and the standalone tool via its
// "Imp JSON" / "Exp JSON" buttons (export shape `version: 7`).

import type {
  DgField,
  IntroField as BaseIntroField,
  SectionNode as BaseSectionNode,
} from "@/lib/dia/framework/manifest";
import {
  findSection as findSectionGeneric,
  collectSectionIds,
} from "@/lib/dia/framework/manifest";

export type { DgField };

export type IntroGroup =
  | "Proyecto"
  | "Empresa"
  | "Ubicación"
  | "Plataformas"
  | "Accesos"
  | "Infraestructura auxiliar";

export interface IntroField extends BaseIntroField {
  readonly group: IntroGroup;
}

export const INTRO_GROUP_ORDER: readonly IntroGroup[] = [
  "Proyecto",
  "Empresa",
  "Ubicación",
  "Plataformas",
  "Accesos",
  "Infraestructura auxiliar",
];

export const INTRO_FIELDS_DIA: readonly IntroField[] = [
  { key: "nombreProyecto", label: "Nombre del Proyecto", placeholder: 'Ej: Proyecto de Exploración Minera "Ccoropuro"', group: "Proyecto" },
  { key: "abrevProyecto", label: "Abreviatura del Proyecto", placeholder: 'Ej: DIA "Ccoropuro"', group: "Proyecto" },
  { key: "empresaTitular", label: "Empresa titular", placeholder: "Ej: Minera Barrick Peru S.A.", group: "Empresa" },
  { key: "abrevEmpresa", label: "Abreviatura de la empresa", placeholder: "Ej: MBP", group: "Empresa" },
  { key: "coordEste", label: "Coordenada Este (UTM, WGS84)", placeholder: "Ej: 371000", group: "Ubicación" },
  { key: "coordNorte", label: "Coordenada Norte (UTM, WGS84)", placeholder: "Ej: 8067000", group: "Ubicación" },
  { key: "distrito", label: "Distrito", placeholder: "Ej: Héroes Albarracín", group: "Ubicación" },
  { key: "provincia", label: "Provincia", placeholder: "Ej: Tarata", group: "Ubicación" },
  { key: "region", label: "Región", placeholder: "Ej: Tacna", group: "Ubicación" },
  { key: "numPlataformas", label: "Plataformas de perforación (hasta)", placeholder: "Ej: 34", group: "Plataformas" },
  { key: "numSondajes", label: "Total de sondajes", placeholder: "Ej: 62", group: "Plataformas" },
  { key: "kmAccesos", label: "Kilómetros totales de accesos", placeholder: "Ej: 16.225", group: "Accesos" },
  { key: "auxiliarList", label: "Infraestructura auxiliar (separar con coma)", placeholder: "Ej: 1 patio de control, 1 helipuerto, 3 piscinas australianas, 20 trincheras", group: "Infraestructura auxiliar" },
];

export const INTRO_FIELDS_MDIA: readonly IntroField[] = [
  { key: "nombreProyecto", label: "Nombre del Proyecto", placeholder: 'Ej: Proyecto de Exploración Minera "Ccoropuro"', group: "Proyecto" },
  { key: "abrevProyecto", label: "Abreviatura del Proyecto (MDIA)", placeholder: 'Ej: MDIA "Ccoropuro"', group: "Proyecto" },
  { key: "rdAprobacion", label: "Resolución Directoral de aprobación de la DIA", placeholder: "Ej: Resolución Directoral N° 0036-2025-MINEM/DGAAM", group: "Proyecto" },
  { key: "abrevDIA", label: "Abreviatura de la DIA aprobada", placeholder: 'Ej: DIA "Ccoropuro"', group: "Proyecto" },
  { key: "empresaTitular", label: "Empresa titular", placeholder: "Ej: Minera Barrick Peru S.A.", group: "Empresa" },
  { key: "abrevEmpresa", label: "Abreviatura de la empresa", placeholder: "Ej: MBP", group: "Empresa" },
  { key: "coordEste", label: "Coordenada Este (UTM, WGS84)", placeholder: "Ej: 371000", group: "Ubicación" },
  { key: "coordNorte", label: "Coordenada Norte (UTM, WGS84)", placeholder: "Ej: 8067000", group: "Ubicación" },
  { key: "distrito", label: "Distrito", placeholder: "Ej: Héroes Albarracín", group: "Ubicación" },
  { key: "provincia", label: "Provincia", placeholder: "Ej: Tarata", group: "Ubicación" },
  { key: "region", label: "Región", placeholder: "Ej: Tacna", group: "Ubicación" },
  { key: "numPlataformas", label: "Plataformas de perforación (hasta)", placeholder: "Ej: 34", group: "Plataformas" },
  { key: "numSondajes", label: "Total de sondajes", placeholder: "Ej: 62", group: "Plataformas" },
  { key: "platAprobadas", label: "Plataformas que mantienen ubicación aprobada", placeholder: "Ej: 13", group: "Plataformas" },
  { key: "platReubicadas", label: "Plataformas reubicadas", placeholder: "Ej: 21", group: "Plataformas" },
  { key: "kmAccesos", label: "Kilómetros totales de accesos", placeholder: "Ej: 16.225", group: "Accesos" },
  { key: "kmAccesosAprobados", label: "Km accesos aprobados en DIA", placeholder: "Ej: 8.214", group: "Accesos" },
  { key: "kmAccesosNuevos", label: "Km accesos nuevos propuestos", placeholder: "Ej: 8.011", group: "Accesos" },
  { key: "auxiliarList", label: "Infraestructura auxiliar (separar con coma)", placeholder: "Ej: 1 patio de control, 1 helipuerto, 3 piscinas australianas, 20 trincheras, 12 pases vehiculares", group: "Infraestructura auxiliar" },
];

export type DgGroupKey =
  | "nombre"
  | "titular"
  | "representante"
  | "antecedentes_area"
  | "concesiones"
  | "componentes_no_cerrados"
  | "estudios_previos"
  | "permisos_existentes"
  | "propiedad_superficial"
  | "anp"
  | "objetivos"
  | "localizacion"
  | "delimitacion"
  | "area_actividad_minera"
  | "area_uso_minero"
  | "area_influencia_ambiental"
  | "area_influencia_social"
  | "cronograma"
  | "mineralizacion"
  | "residuos"
  | "demanda_agua"
  | "insumos"
  | "maquinaria"
  | "personal"
  | "energia";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  nombre: [
    { key: "dg_tipoEstudio", label: "Tipo de estudio (IGA)", placeholder: "Ej: Declaración de Impacto Ambiental (DIA – Categoría I)" },
    { key: "dg_nombreCompleto", label: "Nombre completo del estudio", placeholder: 'Ej: Declaración de Impacto Ambiental (DIA – Categoría I) del Proyecto de Exploración Minera "Ccoropuro"' },
    { key: "dg_nombreProyecto", label: "Nombre del Proyecto", placeholder: 'Ej: Proyecto de Exploración Minera "Ccoropuro"' },
    { key: "dg_distrito", label: "Distrito", placeholder: "Ej: Héroes Albarracín" },
    { key: "dg_provincia", label: "Provincia", placeholder: "Ej: Tarata" },
    { key: "dg_region", label: "Región", placeholder: "Ej: Tacna" },
  ],
  titular: [
    { key: "dg_empresaNombre", label: "Nombre legal completo de la empresa", placeholder: "Ej: MINERA BARRICK PERU S.A." },
    { key: "dg_empresaAbrev", label: "Abreviatura de la empresa", placeholder: "Ej: MBP" },
    { key: "dg_ruc", label: "RUC (Registro Único de Contribuyentes)", placeholder: "Ej: 20607441139" },
    { key: "dg_direccion", label: "Dirección fiscal de la empresa", placeholder: "Ej: Av. Manuel Olguín 325, Piso 12, distrito de Santiago de Surco, provincia de Lima y región Lima" },
  ],
  representante: [
    { key: "dg_repCargo", label: "Cargo del representante legal", placeholder: "Ej: Apoderado" },
    { key: "dg_repNombre", label: "Nombre completo del representante legal", placeholder: "Ej: Miguel Amble Rodríguez" },
    { key: "dg_repDNI", label: "DNI del representante legal", placeholder: "Ej: 00487678" },
    { key: "dg_repAsiento", label: "Asiento registral (SUNARP)", placeholder: "Ej: A00001" },
    { key: "dg_repPartida", label: "Partida Electrónica (SUNARP)", placeholder: "Ej: 14622278" },
    { key: "dg_repOficina", label: "Oficina Registral", placeholder: "Ej: Oficina Registral de Lima" },
    { key: "dg_repAnexo", label: "Número de anexo con documentos de respaldo", placeholder: "Ej: Anexo 2.1" },
  ],
  antecedentes_area: [
    { key: "dg_areaEfectivaHa", label: "Área efectiva anterior (ha)", placeholder: "Ej: 250.00" },
    { key: "dg_areaInfluenciaHa", label: "Área de influencia directa anterior (ha)", placeholder: "Ej: 500.00" },
    { key: "dg_rdAnterior", label: "RD de la DIA aprobada anteriormente", placeholder: "Ej: R.D. N° 00123-2023-MINEM/DGAAM" },
    { key: "dg_fechaRdAnterior", label: "Fecha de la RD anterior", placeholder: "Ej: 15 de marzo de 2023" },
    { key: "dg_nuevaAreaEfectivaHa", label: "Nueva área efectiva propuesta (ha)", placeholder: "Ej: 310.00" },
    { key: "dg_nuevaAreaInfluenciaHa", label: "Nueva área de influencia directa propuesta (ha)", placeholder: "Ej: 620.00" },
  ],
  concesiones: [
    { key: "dg_numConcesiones", label: "Número de concesiones mineras", placeholder: "Ej: 2" },
    { key: "dg_concesionesDetalle", label: "Detalle de concesiones (nombre, código, área en ha) — una por línea", placeholder: "Ej:\nOSCAR 1-600 (Código: 010029392) - 600 ha\nALICIA 1-900 (Código: 010072593) - 900 ha", multiline: true },
    { key: "dg_cuadroConcesiones", label: "Referencia de cuadro(s) con vértices", placeholder: "Ej: Cuadro 2.1.5 y Cuadro 2.1.6" },
    { key: "dg_figConcesiones", label: "Referencia de figura con concesiones", placeholder: "Ej: Figura 2.1.3" },
    { key: "dg_anexoConcesiones", label: "Anexo con partidas electrónicas de SUNARP", placeholder: "Ej: Anexo 2.2" },
  ],
  componentes_no_cerrados: [
    { key: "dg_componentesNoCerradosTexto", label: "Descripción de componentes no cerrados (si aplica)", placeholder: "Ej: No se cuenta con componentes que no hayan sido cerrados / Se cuenta con 3 plataformas no cerradas...", multiline: true },
    { key: "dg_rmPasivos", label: "Resolución Ministerial de Inventario de Pasivos Ambientales", placeholder: "Ej: R.M. N° 338-2025-MINEM/DM" },
    { key: "dg_figPasivos", label: "Referencia de figura con pasivos ambientales", placeholder: "Ej: Figura 2.1.2" },
  ],
  estudios_previos: [
    { key: "dg_estudiosDescripcion", label: "Descripción de estudios o investigaciones previas", placeholder: "Ej: Se cuenta con una DIA aprobada (2025)...", multiline: true },
    { key: "dg_componentesDIAAprobados", label: "Componentes aprobados en la DIA (si MDIA)", placeholder: "Ej: 40 plataformas, 12 434.86 m accesos, 15 trincheras, 1 patio de control, 1 helipuerto, 3 piscinas australianas, 1 manguera", multiline: true },
    { key: "dg_cronogramaAprobado", label: "Cronograma aprobado (meses)", placeholder: "Ej: 24" },
  ],
  permisos_existentes: [
    { key: "dg_permisosLista", label: "Lista de permisos y certificaciones ambientales existentes (uno por línea)", placeholder: "Ej:\nR.D. N° 0036-2025-MINEM/DGAAM — Aprobación de la DIA\nCIRA N° 227-2024-DDCTAC/MC", multiline: true },
    { key: "dg_cirasLista", label: "Lista de CIRAs obtenidos (uno por línea)", placeholder: "Ej:\nCIRAS N° 227-2024-DDCTAC/MC\nCIRAS N° 228-2024-DDCTAC/MC", multiline: true },
    { key: "dg_anexoRD", label: "Anexo con la RD y permisos", placeholder: "Ej: Anexo 2.4" },
    { key: "dg_anexoCIRAs", label: "Anexo con los CIRAs", placeholder: "Ej: Anexo 2.5" },
  ],
  propiedad_superficial: [
    { key: "dg_propietarioTerreno", label: "Propietario del terreno superficial", placeholder: "Ej: Comunidad Campesina de Chipispaya" },
    { key: "dg_fuenteLimites", label: "Fuente de límites comunales / catastrales", placeholder: "Ej: COFOPRI-MIDAGRI del año 2023" },
    { key: "dg_figPropiedad", label: "Referencia de figura con propiedad superficial", placeholder: "Ej: Figura 2.1.4" },
  ],
  anp: [
    { key: "dg_distanciaANP", label: "Distancia a la ANP más cercana (km)", placeholder: "Ej: 121.43" },
    { key: "dg_nombreANP", label: "Nombre de la ANP más cercana", placeholder: "Ej: Reserva Nacional Sistema de Islas, Islotes y Puntas Guaneras – Punta Coles" },
    { key: "dg_figANP", label: "Referencia de figura con ubicación de ANPs", placeholder: "Ej: Figura 2.1.5" },
  ],
  objetivos: [
    { key: "obj_minerales", label: "Minerales objetivo de exploración", placeholder: "Ej: cobre (Cu) y oro (Au) en óxidos y/o sulfuros" },
    { key: "obj_figComponentes", label: "Referencia de figura con componentes", placeholder: "Ej: Figura 2.2.1" },
  ],
  localizacion: [
    { key: "loc_distanciaCapital", label: "Distancia a la capital del distrito (km)", placeholder: "Ej: 8.27" },
    { key: "loc_centroideEste", label: "Centroide Este (m)", placeholder: "Ej: 371261" },
    { key: "loc_centroideNorte", label: "Centroide Norte (m)", placeholder: "Ej: 8067933" },
    { key: "loc_cuenca", label: "Cuenca hidrográfica", placeholder: "Ej: Cuenca Medio Alta Sama" },
    { key: "loc_codigoPfafstetter", label: "Código Pfafstetter de cuenca", placeholder: "Ej: 131587" },
    { key: "loc_altitudMin", label: "Altitud mínima (m s.n.m.)", placeholder: "Ej: 2000" },
    { key: "loc_altitudMax", label: "Altitud máxima (m s.n.m.)", placeholder: "Ej: 2900" },
    { key: "loc_ccppCercanos", label: "Centros poblados cercanos (nombre, distancia km — uno por línea)", placeholder: "Ej:\nPutina - 0.69\nChipispaya - 0.49", multiline: true },
    { key: "loc_figUbicacion", label: "Referencia de figura de ubicación", placeholder: "Ej: Figura 2.3.1" },
  ],
  delimitacion: [
    { key: "del_numVertices", label: "Número de vértices del polígono", placeholder: "Ej: 204" },
    { key: "del_areaTotalHa", label: "Área total aproximada (ha)", placeholder: "Ej: 507" },
    { key: "del_figAreaEfectiva", label: "Referencia de figura del área efectiva", placeholder: "Ej: Figura 2.4.1" },
  ],
  area_actividad_minera: [
    { key: "aam_areaHa", label: "Área de actividad minera (ha)", placeholder: "Ej: 496.47" },
    { key: "aam_ocupacionHa", label: "Ocupación equivalente (ha)", placeholder: "Ej: menos de 10" },
    { key: "aam_cuadroVertices", label: "Referencia de cuadro de vértices AAM", placeholder: "Ej: Cuadro 2.4.1" },
    { key: "aam_figAAM", label: "Referencia de figura AAM", placeholder: "Ej: Figura 2.4.1" },
  ],
  area_uso_minero: [
    { key: "aum_areaHa", label: "Área de uso minero (ha)", placeholder: "Ej: 10.49" },
    { key: "aum_cuadroVertices", label: "Referencia de cuadro de vértices AUM", placeholder: "Ej: Cuadro 2.4.2" },
  ],
  area_influencia_ambiental: [
    { key: "aia_aiadAreaHa", label: "Área AIAD (ha)", placeholder: "Ej: 553" },
    { key: "aia_aiadVertices", label: "Vértices del polígono AIAD", placeholder: "Ej: 685" },
    { key: "aia_aiaiAreaHa", label: "Área AIAI (ha)", placeholder: "Ej: 600" },
    { key: "aia_aiaiVertices", label: "Vértices del polígono AIAI", placeholder: "Ej: 657" },
    { key: "aia_bufferSur", label: "Buffer zona sur (m)", placeholder: "Ej: 5" },
    { key: "aia_bufferResto", label: "Buffer resto de zonas (m)", placeholder: "Ej: 40" },
    { key: "aia_figAIA", label: "Referencia de figura AIA", placeholder: "Ej: Figura 2.5.1" },
    { key: "aia_tablaAIAD", label: "Referencia de tabla vértices AIAD", placeholder: "Ej: Tabla 2.5.1" },
    { key: "aia_tablaAIAI", label: "Referencia de tabla vértices AIAI", placeholder: "Ej: Tabla 2.5.2" },
  ],
  area_influencia_social: [
    { key: "ais_aisd", label: "Área de influencia social directa (AISD)", placeholder: "Ej: Límites de la Comunidad Campesina de Chipispaya dentro del distrito de Héroes Albarracín" },
    { key: "ais_aisi", label: "Área de influencia social indirecta (AISI)", placeholder: "Ej: Distrito de Héroes Albarracín" },
    { key: "ais_figAIS", label: "Referencia de figura AIS", placeholder: "Ej: Figura 2.5.2" },
    { key: "ais_cuadroAIS", label: "Referencia de cuadro AIS", placeholder: "Ej: Cuadro 2.5.1" },
  ],
  cronograma: [
    { key: "cro_totalMeses", label: "Duración total del Proyecto (meses)", placeholder: "Ej: 34" },
    { key: "cro_construccionMeses", label: "Duración etapa construcción (meses)", placeholder: "Ej: 28" },
    { key: "cro_operacionMeses", label: "Duración etapa operación (meses)", placeholder: "Ej: 27" },
    { key: "cro_cierreProgresivoMeses", label: "Duración cierre progresivo (meses)", placeholder: "Ej: 24" },
    { key: "cro_cierreFinalMeses", label: "Duración cierre final (meses)", placeholder: "Ej: 3" },
    { key: "cro_postCierreMeses", label: "Duración post-cierre (meses)", placeholder: "Ej: 3" },
    { key: "cro_inversionTotal", label: "Inversión total (US$)", placeholder: "Ej: 600000" },
    { key: "cro_invConstruccion", label: "Inversión construcción (US$)", placeholder: "Ej: 60000" },
    { key: "cro_invOperacion", label: "Inversión operación (US$)", placeholder: "Ej: 400000" },
    { key: "cro_invCierreProgresivo", label: "Inversión cierre progresivo (US$)", placeholder: "Ej: 60000" },
    { key: "cro_invCierreFinal", label: "Inversión cierre final (US$)", placeholder: "Ej: 40000" },
    { key: "cro_invPostCierre", label: "Inversión post-cierre (US$)", placeholder: "Ej: 40000" },
    { key: "cro_cuadroCronograma", label: "Referencia de cuadro cronograma", placeholder: "Ej: Cuadro 2.6.1" },
  ],
  mineralizacion: [
    { key: "min_descripcion", label: "Descripción de mineralización objetivo", placeholder: "Ej: exploración de cobre y oro en óxidos y/o sulfuros", multiline: true },
  ],
  residuos: [
    { key: "res_noPeligrososLista", label: "Residuos no peligrosos (uno por línea)", placeholder: "Ej:\nPapel, cartón\nPlásticos\nRestos de alimentos", multiline: true },
    { key: "res_peligrososLista", label: "Residuos peligrosos (uno por línea)", placeholder: "Ej:\nAceites usados\nFiltros de aceite", multiline: true },
    { key: "res_eorsNombre", label: "Nombre de la EO-RS", placeholder: "Ej: Empresa XYZ S.A.C." },
  ],
  demanda_agua: [
    { key: "agua_industrial", label: "Demanda de agua industrial (L/día)", placeholder: "Ej: 16000" },
    { key: "agua_domestico", label: "Demanda de agua doméstica (L/día)", placeholder: "Ej: 2000" },
    { key: "agua_total", label: "Demanda total de agua (L/día)", placeholder: "Ej: 18000" },
    { key: "agua_fuente", label: "Fuente de abastecimiento de agua", placeholder: "Ej: Camión cisterna desde la ciudad de Tacna" },
    { key: "agua_cuadroDetalle", label: "Referencia de cuadro con detalle de demanda", placeholder: "Ej: Cuadro 2.7.3 y Cuadro 2.7.4" },
  ],
  insumos: [
    { key: "ins_aditivosLista", label: "Aditivos de perforación (separar con coma)", placeholder: "Ej: bentonita, polímeros, espumas biodegradables" },
    { key: "ins_combustibleTipo", label: "Tipo de combustible", placeholder: "Ej: Diésel B5-S50" },
    { key: "ins_consumoCombDiario", label: "Consumo diario de combustible (gal/día)", placeholder: "Ej: 120" },
    { key: "ins_cuadroInsumos", label: "Referencia de cuadro de insumos", placeholder: "Ej: Cuadro 2.7.5" },
  ],
  maquinaria: [
    { key: "maq_equiposPerforacion", label: "Cantidad de equipos de perforación", placeholder: "Ej: 2" },
    { key: "maq_avanceDiario", label: "Avance promedio diario por máquina (m/día)", placeholder: "Ej: 25" },
    { key: "maq_metrosLineales", label: "Total metros lineales de perforación", placeholder: "Ej: 31800" },
    { key: "maq_cuadroMaquinaria", label: "Referencia de cuadro de maquinaria", placeholder: "Ej: Cuadro 2.7.6" },
  ],
  personal: [
    { key: "per_totalPersonas", label: "Total de personal en pico de actividad", placeholder: "Ej: 50" },
    { key: "per_turno", label: "Régimen de turnos", placeholder: "Ej: 14 x 7 (14 días de trabajo, 7 días de descanso)" },
    { key: "per_cuadroPersonal", label: "Referencia de cuadro de personal", placeholder: "Ej: Cuadro 2.7.7" },
  ],
  energia: [
    { key: "ene_fuente", label: "Fuente de energía", placeholder: "Ej: Grupos electrógenos a diésel" },
    { key: "ene_potencia", label: "Potencia total instalada (kW)", placeholder: "Ej: 500" },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "2.0",
    title: "2.0 Descripción del Proyecto",
    level: 0,
    children: [
      { id: "2.1", title: "2.1 Introducción", level: 1, children: [], isIntro: true },
      {
        id: "2.2",
        title: "2.2 Antecedentes",
        level: 1,
        children: [
          {
            id: "2.2.1",
            title: "2.2.1 Datos generales",
            level: 2,
            children: [
              { id: "2.2.1.a", title: "Nombre", level: 3, children: [], structuredType: "nombre" },
              { id: "2.2.1.b", title: "Titular", level: 3, children: [], structuredType: "titular" },
              { id: "2.2.1.c", title: "Representante legal", level: 3, children: [], structuredType: "representante" },
            ],
          },
          { id: "2.2.2", title: "2.2.2 Antecedentes del área efectiva y área de influencia directa", level: 2, children: [], structuredType: "antecedentes_area" },
          { id: "2.2.3", title: "2.2.3 Derechos o concesiones mineras", level: 2, children: [], structuredType: "concesiones" },
          { id: "2.2.4", title: "2.2.4 Componentes no cerrados", level: 2, children: [], structuredType: "componentes_no_cerrados" },
          { id: "2.2.5", title: "2.2.5 Estudios o investigaciones previas", level: 2, children: [], structuredType: "estudios_previos" },
          { id: "2.2.6", title: "2.2.6 Permisos existentes", level: 2, children: [], structuredType: "permisos_existentes" },
          { id: "2.2.7", title: "2.2.7 Propiedad Superficial", level: 2, children: [], structuredType: "propiedad_superficial" },
          { id: "2.2.8", title: "2.2.8 Áreas Naturales Protegidas (ANP)", level: 2, children: [], structuredType: "anp" },
        ],
      },
      { id: "2.3", title: "2.3 Objetivos y justificación", level: 1, children: [], structuredType: "objetivos" },
      { id: "2.4", title: "2.4 Localización geográfica y política del Proyecto", level: 1, children: [], structuredType: "localizacion" },
      {
        id: "2.5",
        title: "2.5 Delimitación del perímetro del área efectiva",
        level: 1,
        children: [
          { id: "2.5.1", title: "2.5.1 Área de actividad minera", level: 2, children: [], structuredType: "area_actividad_minera" },
          { id: "2.5.2", title: "2.5.2 Área de uso minero", level: 2, children: [], structuredType: "area_uso_minero" },
        ],
        structuredType: "delimitacion",
      },
      {
        id: "2.6",
        title: "2.6 Área de influencia ambiental",
        level: 1,
        children: [
          { id: "2.6.1", title: "2.6.1 Área de influencia ambiental (AIA)", level: 2, children: [], structuredType: "area_influencia_ambiental" },
          { id: "2.6.2", title: "2.6.2 Área de Influencia Social (AIS)", level: 2, children: [], structuredType: "area_influencia_social" },
        ],
      },
      { id: "2.7", title: "2.7 Cronograma e inversión del Proyecto", level: 1, children: [], structuredType: "cronograma" },
      {
        id: "2.8",
        title: "2.8 Descripción de la etapa de construcción/habilitación, operación y cierre",
        level: 1,
        children: [
          { id: "2.8.1", title: "2.8.1 Mineralización", level: 2, children: [], structuredType: "mineralizacion" },
          { id: "2.8.2", title: "2.8.2 Componentes del Proyecto", level: 2, children: [] },
          { id: "2.8.3", title: "2.8.3 Residuos a generar", level: 2, children: [], structuredType: "residuos" },
          { id: "2.8.4", title: "2.8.4 Demanda de agua", level: 2, children: [], structuredType: "demanda_agua" },
          { id: "2.8.5", title: "2.8.5 Insumos", level: 2, children: [], structuredType: "insumos" },
          { id: "2.8.6", title: "2.8.6 Maquinaria y equipos", level: 2, children: [], structuredType: "maquinaria" },
          { id: "2.8.7", title: "2.8.7 Fuentes de emisión de material particulado, gases y ruidos", level: 2, children: [] },
          { id: "2.8.8", title: "2.8.8 Actividades de transporte", level: 2, children: [] },
          { id: "2.8.9", title: "2.8.9 Descripción del método de construcción", level: 2, children: [] },
          { id: "2.8.10", title: "2.8.10 Personal", level: 2, children: [], structuredType: "personal" },
          { id: "2.8.11", title: "2.8.11 Fuente de abastecimiento de energía", level: 2, children: [], structuredType: "energia" },
          { id: "2.8.12", title: "2.8.12 Cierre y post-cierre", level: 2, children: [] },
          { id: "2.8.13", title: "2.8.13 Manejo de efluentes y emisiones", level: 2, children: [] },
        ],
      },
    ],
  },
];

export const ALL_SECTION_IDS: readonly string[] = collectSectionIds<DgGroupKey>(SECTIONS);

export function findSection(
  id: string,
  nodes: readonly SectionNode[] = SECTIONS,
): SectionNode | null {
  return findSectionGeneric<DgGroupKey>(id, nodes);
}
