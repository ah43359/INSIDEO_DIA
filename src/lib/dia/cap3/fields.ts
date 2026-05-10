// Capítulo 3 — Línea Base (LB).
//
// Per RM 108-2018-MEM/DM Anexo I §3, the LB describes the area of
// influence as a baseline before activities begin. Three subsystems:
// a) medio físico — meteorología, geología, geomorfología, hidrología,
//    hidrogeología, suelos, calidad del aire/ruido/agua/sedimentos
// b) medio biológico — flora, fauna, ecosistemas, especies CITES/IUCN
// c) medio socioeconómico-cultural — demografía, indicadores, uso del
//    territorio, arqueología y patrimonio cultural
// Plus cartografía at the end.
//
// V1 keeps everything as text fields; future iterations will plug a
// sampling-stations table widget into the relevant subsections.

import type { DgField, SectionNode as BaseSectionNode } from "@/lib/dia/framework/manifest";
import {
  collectSectionIds,
  findSection as findSectionGeneric,
} from "@/lib/dia/framework/manifest";

export type DgGroupKey =
  | "lb_alcance"
  | "lb_meteo"
  | "lb_aire"
  | "lb_ruido"
  | "lb_geologia"
  | "lb_geomorfologia"
  | "lb_hidrologia"
  | "lb_hidrogeologia"
  | "lb_suelos"
  | "lb_calidad_agua"
  | "lb_flora"
  | "lb_fauna"
  | "lb_ecosistemas"
  | "lb_demografia"
  | "lb_indicadores"
  | "lb_uso_territorio"
  | "lb_arqueologia"
  | "lb_cartografia";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  lb_alcance: [
    { key: "lb_temporadaCampo", label: "Temporada de levantamiento de campo", placeholder: "Ej: 1 temporada (seca u húmeda) según área de influencia" },
    { key: "lb_fuentesSecundarias", label: "Fuentes secundarias utilizadas", placeholder: "Ej: SENAMHI, INRENA, INEI, MINCUL, SERNANP", multiline: true },
    { key: "lb_metodologiaGeneral", label: "Metodología general del levantamiento", placeholder: "Métodos y criterios aplicados", multiline: true },
  ],
  lb_meteo: [
    { key: "lb_estacionesMeteo", label: "Estaciones meteorológicas usadas (nombre y fuente)", placeholder: "Ej: SENAMHI Tarata (cód. 4708023) — 1990-2024", multiline: true },
    { key: "lb_zonasVida", label: "Zonas de vida (clasificación Holdridge)", placeholder: "Ej: estepa montano subtropical (e-MS), tundra (t-MS)" },
    { key: "lb_tempPromedioC", label: "Temperatura promedio anual (°C)", placeholder: "Ej: 8.4" },
    { key: "lb_precipMmAno", label: "Precipitación promedio anual (mm)", placeholder: "Ej: 320" },
    { key: "lb_humedadPct", label: "Humedad relativa (%)", placeholder: "Ej: 55" },
    { key: "lb_vientosResumen", label: "Régimen de vientos (dirección y velocidad)", placeholder: "Ej: predominio N-NE, 4-6 m/s", multiline: true },
  ],
  lb_aire: [
    { key: "lb_aireProtocolo", label: "Protocolo o guía de monitoreo aplicado", placeholder: "Ej: Protocolo de Monitoreo de Calidad del Aire DIGESA / R.M. 1404-2005-MINSA" },
    { key: "lb_aireParametros", label: "Parámetros monitoreados", placeholder: "Ej: PM10, PM2.5, NO2, SO2, CO, H2S", multiline: true },
    { key: "lb_aireResultados", label: "Resultados resumidos vs ECA", placeholder: "Ej: PM10 promedio 38 µg/m³ < ECA (100 µg/m³). Cumplimiento generalizado.", multiline: true },
  ],
  lb_ruido: [
    { key: "lb_ruidoProtocolo", label: "Protocolo o guía de monitoreo aplicado", placeholder: "Ej: D.S. 085-2003-PCM" },
    { key: "lb_ruidoEstaciones", label: "Estaciones / puntos de monitoreo", placeholder: "Una por línea (código y descripción)", multiline: true },
    { key: "lb_ruidoResultados", label: "Resultados (LAeqT diurno/nocturno) vs ECA", placeholder: "Ej: Diurno 48 dBA / Nocturno 38 dBA — cumple zona residencial", multiline: true },
  ],
  lb_geologia: [
    { key: "lb_geologiaRegional", label: "Geología regional", placeholder: "Resumen de unidades regionales presentes en el área", multiline: true },
    { key: "lb_geologiaLocal", label: "Geología local del área", placeholder: "Descripción detallada de la geología del área efectiva", multiline: true },
    { key: "lb_potencialDAR", label: "Potencial de Drenaje Ácido de Roca (DAR)", placeholder: "Ej: bajo / no aplicable. Sustento técnico.", multiline: true },
  ],
  lb_geomorfologia: [
    { key: "lb_geoformas", label: "Geoformas y unidades geomorfológicas", placeholder: "Ej: laderas montañosas de fuerte pendiente, terrazas aluviales", multiline: true },
    { key: "lb_pendientes", label: "Rangos de pendiente predominantes", placeholder: "Ej: 0-5%, 5-15%, 15-25%, >25%" },
    { key: "lb_riesgosGeo", label: "Riesgos geológicos identificados", placeholder: "Ej: deslizamientos en laderas con pendiente >25%", multiline: true },
  ],
  lb_hidrologia: [
    { key: "lb_cuenca", label: "Cuenca / subcuenca / microcuenca", placeholder: "Ej: Cuenca del Río Sama — Subcuenca río Tala" },
    { key: "lb_pfafstetter", label: "Código Pfafstetter", placeholder: "Ej: 131587" },
    { key: "lb_redHidricaResumen", label: "Red hídrica y caudales", placeholder: "Cursos principales, caudales medios estacionales, etc.", multiline: true },
  ],
  lb_hidrogeologia: [
    { key: "lb_acuiferos", label: "Unidades hidrogeológicas / acuíferos", placeholder: "Ej: acuífero fisurado en rocas volcánicas", multiline: true },
    { key: "lb_nivelFreatico", label: "Nivel freático estimado", placeholder: "Ej: 25-40 m bajo superficie en zona de plataformas" },
    { key: "lb_manantiales", label: "Manantiales y puntos de agua subterránea", placeholder: "Una por línea: código, ubicación, caudal", multiline: true },
  ],
  lb_suelos: [
    { key: "lb_clasificacionSuelos", label: "Clasificación de suelos (Soil Taxonomy / FAO)", placeholder: "Ej: Cryorthents, Lithic Cryorthents", multiline: true },
    { key: "lb_capacidadUso", label: "Capacidad de Uso Mayor de Tierras (CUMT)", placeholder: "Ej: F3sec — tierras aptas para producción forestal con limitaciones" },
    { key: "lb_calidadSuelos", label: "Calidad de suelos (resultado vs ECA)", placeholder: "Resumen de monitoreo de calidad de suelos", multiline: true },
  ],
  lb_calidad_agua: [
    { key: "lb_aguaSupParametros", label: "Calidad de agua superficial — parámetros", placeholder: "Ej: pH, T, OD, conductividad, SST, metales totales/disueltos", multiline: true },
    { key: "lb_aguaSupResultados", label: "Resultados agua superficial vs ECA", placeholder: "Resumen de cumplimiento por parámetro", multiline: true },
    { key: "lb_aguaSubParametros", label: "Calidad de agua subterránea — parámetros", placeholder: "Mismo set adaptado a aguas subterráneas", multiline: true },
    { key: "lb_aguaSubResultados", label: "Resultados agua subterránea vs ECA", placeholder: "Resumen de cumplimiento por parámetro", multiline: true },
  ],
  lb_flora: [
    { key: "lb_formacionesVeg", label: "Formaciones vegetales (clasificación MINAM)", placeholder: "Ej: pajonal andino, matorral húmedo, bofedal", multiline: true },
    { key: "lb_especiesFlora", label: "Especies de flora identificadas", placeholder: "Una por línea: nombre científico — nombre común — categoría DS 043-2006-AG / CITES / IUCN", multiline: true },
    { key: "lb_metodoFlora", label: "Métodos de evaluación de flora", placeholder: "Ej: parcelas de Whittaker, transectos lineales" },
  ],
  lb_fauna: [
    { key: "lb_aves", label: "Avifauna identificada", placeholder: "Especies; categoría de protección si aplica", multiline: true },
    { key: "lb_mamiferos", label: "Mastofauna identificada", placeholder: "Especies; categoría de protección si aplica", multiline: true },
    { key: "lb_reptilesAnfibios", label: "Herpetofauna identificada", placeholder: "Especies; categoría de protección si aplica", multiline: true },
    { key: "lb_metodoFauna", label: "Métodos de evaluación de fauna", placeholder: "Ej: puntos de conteo, redes niebla, trampas Sherman" },
  ],
  lb_ecosistemas: [
    { key: "lb_ecosistemasIdentificados", label: "Ecosistemas identificados (MINAM)", placeholder: "Ej: pajonal de puna húmeda, bofedal altoandino", multiline: true },
    { key: "lb_ecosistemasFragiles", label: "Ecosistemas frágiles dentro del área", placeholder: "Si aplican, especificar superficie y ubicación", multiline: true },
    { key: "lb_anpRelacion", label: "Relación con ANP / ZA / ACR", placeholder: "Ej: a 121 km de Reserva Nacional Punta Coles; sin superposición" },
  ],
  lb_demografia: [
    { key: "lb_poblacionAID", label: "Población del AID", placeholder: "Total y por grupos etarios" },
    { key: "lb_poblacionAII", label: "Población del AII", placeholder: "Total y por grupos etarios" },
    { key: "lb_centrosPoblados", label: "Centros poblados involucrados", placeholder: "Una por línea: nombre, ubigeo, distancia, población", multiline: true },
  ],
  lb_indicadores: [
    { key: "lb_actividadesEconomicas", label: "Actividades económicas principales", placeholder: "Ej: ganadería de camélidos, agricultura de subsistencia", multiline: true },
    { key: "lb_servicios", label: "Servicios básicos (agua, saneamiento, electricidad, salud, educación)", placeholder: "Resumen por centro poblado", multiline: true },
    { key: "lb_idh", label: "Índice de Desarrollo Humano del distrito", placeholder: "Ej: 0.4521 (INEI 2017)" },
  ],
  lb_uso_territorio: [
    { key: "lb_usoActual", label: "Uso actual del territorio", placeholder: "Ej: pastoreo extensivo, sin presencia de cultivos", multiline: true },
    { key: "lb_tenenciaTierra", label: "Tenencia de la tierra", placeholder: "Ej: comunal — Comunidad Campesina de Chipispaya" },
  ],
  lb_arqueologia: [
    { key: "lb_estudioArqueo", label: "Estudio arqueológico realizado", placeholder: "Ej: Evaluación Arqueológica con CIRA aprobado" },
    { key: "lb_ciras", label: "CIRAs obtenidos", placeholder: "Uno por línea: número y fecha", multiline: true },
    { key: "lb_anexoArqueo", label: "Anexo con informe arqueológico", placeholder: "Ej: Anexo 3.7" },
  ],
  lb_cartografia: [
    { key: "lb_planosListado", label: "Listado de planos / mapas (uno por línea)", placeholder: "Ej:\nMapa de ubicación 1/25 000\nMapa geológico 1/25 000\nMapa de cobertura vegetal 1/10 000", multiline: true },
    { key: "lb_anexoPlanos", label: "Anexo con planos", placeholder: "Ej: Anexo 3.X" },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "3.0",
    title: "3.0 Línea Base",
    level: 0,
    children: [
      { id: "3.1", title: "3.1 Alcance y metodología", level: 1, children: [], structuredType: "lb_alcance" },
      {
        id: "3.2",
        title: "3.2 Medio físico",
        level: 1,
        children: [
          { id: "3.2.1", title: "3.2.1 Meteorología, clima y zonas de vida", level: 2, children: [], structuredType: "lb_meteo" },
          { id: "3.2.2", title: "3.2.2 Calidad del aire", level: 2, children: [], structuredType: "lb_aire" },
          { id: "3.2.3", title: "3.2.3 Calidad de ruido ambiental", level: 2, children: [], structuredType: "lb_ruido" },
          { id: "3.2.4", title: "3.2.4 Geología", level: 2, children: [], structuredType: "lb_geologia" },
          { id: "3.2.5", title: "3.2.5 Geomorfología", level: 2, children: [], structuredType: "lb_geomorfologia" },
          { id: "3.2.6", title: "3.2.6 Hidrología", level: 2, children: [], structuredType: "lb_hidrologia" },
          { id: "3.2.7", title: "3.2.7 Hidrogeología", level: 2, children: [], structuredType: "lb_hidrogeologia" },
          { id: "3.2.8", title: "3.2.8 Suelos", level: 2, children: [], structuredType: "lb_suelos" },
          { id: "3.2.9", title: "3.2.9 Calidad del agua", level: 2, children: [], structuredType: "lb_calidad_agua" },
        ],
      },
      {
        id: "3.3",
        title: "3.3 Medio biológico",
        level: 1,
        children: [
          { id: "3.3.1", title: "3.3.1 Flora", level: 2, children: [], structuredType: "lb_flora" },
          { id: "3.3.2", title: "3.3.2 Fauna", level: 2, children: [], structuredType: "lb_fauna" },
          { id: "3.3.3", title: "3.3.3 Ecosistemas", level: 2, children: [], structuredType: "lb_ecosistemas" },
        ],
      },
      {
        id: "3.4",
        title: "3.4 Medio socioeconómico-cultural",
        level: 1,
        children: [
          { id: "3.4.1", title: "3.4.1 Demografía", level: 2, children: [], structuredType: "lb_demografia" },
          { id: "3.4.2", title: "3.4.2 Indicadores socioeconómicos", level: 2, children: [], structuredType: "lb_indicadores" },
          { id: "3.4.3", title: "3.4.3 Uso del territorio", level: 2, children: [], structuredType: "lb_uso_territorio" },
        ],
      },
      { id: "3.5", title: "3.5 Arqueología y patrimonio cultural", level: 1, children: [], structuredType: "lb_arqueologia" },
      { id: "3.6", title: "3.6 Cartografía", level: 1, children: [], structuredType: "lb_cartografia" },
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
