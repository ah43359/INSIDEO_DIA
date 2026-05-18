// Cap 3 baseline narrative contract — TS mirror of the methodology playbook at
// `knowledge/playbooks/baseline-results-writing.md`.
//
// Each record encodes the per-section recipe required by the playbook §4–§6.
// `buildSystemPrompt(3, sectionPath)` injects the matching record into the
// system prompt so the LLM writes against the methodology, not just the corpus.
//
// Keep this file in sync with the playbook. When the playbook recipe changes
// (new ECA decree, updated protocol, new anti-pattern), update the matching
// record here and bump VERSION.

export const VERSION = "1.0.0";

export type Tier = "dia" | "eia_sd" | "eia_d" | "modificacion";

export interface SectionRecipe {
  readonly sectionPath: string;
  readonly title: string;
  /** Minimum tier at which this section is required. */
  readonly minTier: Tier;
  /** Verbatim regulatory citations the LLM must use. */
  readonly citations: readonly string[];
  /** Required tables / figures (numbered descriptions). */
  readonly requiredTables: readonly string[];
  /** Hard-block anti-patterns. */
  readonly antiPatterns: readonly string[];
  /** Phrasing canon — natural-language template the LLM should adapt. */
  readonly canon: string;
}

/** The 5-block universal pattern from playbook §3. Injected into every Cap 3 prompt. */
export const UNIVERSAL_PATTERN = `
Toda sección de resultados de línea base se redacta en cinco bloques secuenciales:

BLOQUE A — ALCANCE Y METODOLOGÍA
- Ámbito (AID/AII y plano de ubicación de estaciones).
- Protocolo de muestreo o inventario, citado por su norma (DS / RM / RJ).
- Número, código y coordenadas UTM WGS84 de estaciones/puntos (tabla obligatoria).
- Temporada(s) y fechas.
- Laboratorio con número de acreditación INACAL y referencia al anexo del certificado.
- Equipo de campo (institución, responsable colegiado cuando aplique).

BLOQUE B — MARCO COMPARATIVO
- ECA/LMP aplicable, con decreto + anexo + categoría/zona explícitos.
- Justificación de la categoría/zona elegida.
- Si no existe ECA peruano para un parámetro, cita a estándar internacional (OMS/EPA) con razón explícita.

BLOQUE C — RESULTADOS
- Tabla resultados↔ECA por estación y parámetro (✓/✗).
- Texto explícito enumerando cumplimientos.
- Por cada excedencia: estación, parámetro, valor medido, umbral, magnitud relativa (Δ%), causa probable preliminar.
- Temporadas disaggregadas (no se promedia seca+húmeda sin reportar cada una).

BLOQUE D — INTERPRETACIÓN
- Significado del cumplimiento/excedencia en el contexto del AID/AII.
- Atribución (natural / antrópica preexistente / metodológica).
- Conexión con otras sub-secciones de la LB.
- Implicancia para el diseño del Plan de Manejo Ambiental, sin pre-juzgar la evaluación de impactos.

BLOQUE E — TRAZABILIDAD
- Listado de anexos: informes de laboratorio, cadenas de custodia, certificados de acreditación, planos de estaciones, permisos sectoriales.
- Referencias internas a tablas y figuras del capítulo.
`.trim();

export const RECIPES: Readonly<Record<string, SectionRecipe>> = {
  "3.1": {
    sectionPath: "3.1",
    title: "Alcance y metodología",
    minTier: "dia",
    citations: [
      "D.S. N° 042-2017-EM",
      "D.S. N° 040-2014-EM",
      "D.S. N° 019-2009-MINAM",
      "R.M. N° 108-2018-MEM/DM Anexo I §3",
    ],
    requiredTables: [
      "Listado de fuentes secundarias (institución, año, alcance).",
      "Cronograma de campañas de campo por temporada.",
    ],
    antiPatterns: [
      "Redactar 'se utilizaron metodologías estándar' sin nombrar normas.",
      "Omitir las fuentes secundarias.",
      "No justificar el uso de una sola temporada cuando el TdR exige dos.",
    ],
    canon:
      "La caracterización de la línea base se desarrolló sobre el AID y AII delimitados en el Capítulo 2, mediante: (i) recopilación de información secundaria (SENAMHI, INGEMMET, INEI, MINAM, ANA, SERNANP, MINCUL); (ii) {una|dos} temporada(s) de campo; (iii) red de monitoreo ambiental; (iv) evaluación biológica con protocolos MINAM/SERFOR; y (v) trabajo social participativo en el AID.",
  },
  "3.2.1": {
    sectionPath: "3.2.1",
    title: "Meteorología, clima y zonas de vida",
    minTier: "dia",
    citations: ["SENAMHI", "Clasificación de Zonas de Vida de Holdridge", "Mapa Ecológico del Perú (INRENA/MINAM)"],
    requiredTables: [
      "Tabla 3.2.1-1 — estaciones SENAMHI utilizadas (código, nombre, coords, altitud, serie).",
      "Tabla 3.2.1-2 — promedios mensuales (T° media/máx/mín, precipitación, HR).",
      "Figura — rosa de vientos por temporada.",
      "Mapa de zonas de vida (Holdridge).",
    ],
    antiPatterns: [
      "Usar series <10 años para EIA-d.",
      "Reportar promedios anuales sin variabilidad mensual.",
      "Omitir la altitud de la estación SENAMHI.",
    ],
    canon:
      "La caracterización climática se basó en los registros de la(s) estación(es) SENAMHI {nombre} (cód. {N}), serie {año-inicio}–{año-fin}. Temperatura media anual {T} °C; precipitación acumulada anual {P} mm; humedad relativa media {H} %. Vientos predominantes del cuadrante {…} con velocidad media {v} m/s. Clasificación de Holdridge: {zonas de vida}.",
  },
  "3.2.2": {
    sectionPath: "3.2.2",
    title: "Calidad del aire",
    minTier: "dia",
    citations: [
      "D.S. N° 003-2017-MINAM (ECA Aire)",
      "D.S. N° 010-2019-MINAM (Protocolo Nacional de Monitoreo de Calidad del Aire)",
    ],
    requiredTables: [
      "Tabla 3.2.2-1 — estaciones (código, coords UTM, criterio: barlovento/sotavento/intermedia/centro poblado).",
      "Tabla 3.2.2-2 — parámetros, equipos, métodos, LD.",
      "Tabla 3.2.2-3 — resultados por estación vs ECA Aire DS 003-2017-MINAM.",
      "Mapa de ubicación de estaciones AIR-XXX.",
    ],
    antiPatterns: [
      "Citar el derogado DS 074-2001-PCM.",
      "Reportar sólo promedios sin valores diarios.",
      "Omitir la justificación del criterio de ubicación (barlovento/sotavento).",
      "EIA-d sin segunda temporada o sin modelo AERMOD cuando aplica.",
    ],
    canon:
      "Se evaluaron {N} estaciones de calidad del aire (AIR-001 a AIR-{N}) en la temporada {seca|húmeda} de {año}, conforme al Protocolo Nacional de Monitoreo de la Calidad Ambiental del Aire (D.S. N° 010-2019-MINAM). Parámetros: PM10, PM2.5, NO2, SO2{, CO, O3 si aplica}. Laboratorio {…} (INACAL N° LE-{XXX}, Anexo {YY}). Resultados comparados con el ECA Aire D.S. N° 003-2017-MINAM. PM10 entre {min} y {max} µg/m³; {n} estaciones cumplen ECA (100 µg/m³, 24h) y {m} exceden — la estación {código} registró {valor}, excedencia de {Δ%}, atribuida a {causa}. PM2.5 en {min}–{max} µg/m³. NO2/SO2/CO bajo ECA en todas las estaciones.",
  },
  "3.2.3": {
    sectionPath: "3.2.3",
    title: "Calidad de ruido ambiental",
    minTier: "dia",
    citations: [
      "D.S. N° 085-2003-PCM (ECA Ruido)",
      "R.M. N° 227-2013-MINAM (Protocolo Nacional de Monitoreo de Ruido Ambiental)",
      "ISO 1996-1/2",
    ],
    requiredTables: [
      "Tabla 3.2.3-1 — estaciones (código, coords, zona acústica declarada, criterio).",
      "Tabla 3.2.3-2 — equipos (sonómetro Tipo 1, certificado de calibración, fecha).",
      "Tabla 3.2.3-3 — resultados LAeqT diurno/nocturno vs ECA por zona.",
    ],
    antiPatterns: [
      "No declarar zona acústica por estación.",
      "Promediar diurno y nocturno.",
      "No reportar fecha de calibración del sonómetro.",
    ],
    canon:
      "Mediciones de ruido en {N} puntos (NOI-001 a NOI-{N}), horario diurno (07:01–22:00) y nocturno (22:01–07:00), conforme al D.S. N° 085-2003-PCM y R.M. N° 227-2013-MINAM. Sonómetros Tipo 1 calibrados (Anexo {ZZ}). Zonas: {NOI-001…NOI-X} Residencial (60/50 dB(A)), {NOI-Y…} Industrial (80/70 dB(A)). LAeqT diurno entre {min} y {max} dB(A); nocturno entre {min} y {max}. Cumplimiento generalizado salvo {excedencias si aplica}.",
  },
  "3.2.4": {
    sectionPath: "3.2.4",
    title: "Geología",
    minTier: "dia",
    citations: [
      "Cartas Geológicas Nacionales INGEMMET (escala + año)",
      "Test ABA / NAG (cuando aplica a EIA-d con sulfuros)",
    ],
    requiredTables: [
      "Mapa geológico (escala según tier).",
      "Columna estratigráfica regional.",
      "Tabla 3.2.4-1 — unidades litoestratigráficas.",
      "Tabla 3.2.4-2 (EIA-d) — resultados ABA/NAG por muestra.",
    ],
    antiPatterns: [
      "Copiar la descripción regional sin verificar la unidad del cuadrante específico.",
      "Omitir el potencial DAR en proyectos con sulfuros.",
      "Usar el mapa 1:1 000 000 como única referencia en EIA-d.",
    ],
    canon:
      "Regionalmente afloran rocas del {Grupo/Formación …}, compuestas por {litología}. Localmente predominan {…} con {alteración hidrotermal / sulfuros diseminados / depósitos cuaternarios}. Potencial DAR/ARD: {clasificación} con {%} de muestras {generador/incierto/no generador}.",
  },
  "3.2.5": {
    sectionPath: "3.2.5",
    title: "Geomorfología",
    minTier: "dia",
    citations: ["Mapa Geomorfológico INGEMMET (cuando disponible)", "CENEPRED (riesgos)"],
    requiredTables: [
      "Mapa geomorfológico.",
      "Mapa de pendientes (rangos 0-5/5-15/15-25/25-50/>50%).",
      "Tabla 3.2.5-1 — unidades geomorfológicas + % área.",
      "Tabla 3.2.5-2 — distribución de pendientes.",
      "Tabla 3.2.5-3 — procesos morfodinámicos identificados.",
    ],
    antiPatterns: [
      "Confundir geomorfología con geología.",
      "Reportar pendientes sin clasificar por rangos comparables.",
      "Ignorar procesos morfodinámicos en EIA-d.",
    ],
    canon:
      "Unidades geomorfológicas: {laderas montañosas / planicies onduladas / conos coluviales / morrenas}. Pendientes predominantes en {15–25%} ({X}% del área) y {5–15%} ({Y}%). Procesos morfodinámicos: {…}. Riesgos: {bajo de deslizamientos / medio de caída de rocas}.",
  },
  "3.2.6": {
    sectionPath: "3.2.6",
    title: "Hidrología",
    minTier: "dia",
    citations: [
      "ANA — clasificación Pfafstetter (R.M. 033-2008-AG)",
      "ALA local",
      "SNIRH-ANA",
    ],
    requiredTables: [
      "Mapa hidrológico con microcuencas Pfafstetter codificadas.",
      "Tabla 3.2.6-1 — caracterización de la(s) microcuenca(s).",
      "Tabla 3.2.6-2 (EIA-d) — caudales aforados por punto y temporada.",
    ],
    antiPatterns: [
      "Confundir cuenca y subcuenca.",
      "Reportar Pfafstetter sin la microcuenca específica.",
      "Omitir el régimen (perenne vs intermitente).",
    ],
    canon:
      "El área se ubica en la cuenca del río {nombre}, subcuenca {nombre}, microcuenca de la quebrada {nombre}, código Pfafstetter {N}. La red hídrica está conformada por la quebrada {principal} (orden {n}, régimen {perenne/intermitente}, caudal medio anual {Q} m³/s). Régimen hidrológico: {nivo-pluvial/pluvial}.",
  },
  "3.2.7": {
    sectionPath: "3.2.7",
    title: "Hidrogeología",
    minTier: "eia_d",
    citations: [
      "Mapa Hidrogeológico del Perú (INGEMMET)",
      "Inventario ANA de fuentes de agua subterránea",
      "Método GOD / DRASTIC (EIA-d)",
    ],
    requiredTables: [
      "Tabla 3.2.7-1 — unidades hidrogeológicas.",
      "Tabla 3.2.7-2 — inventario de manantiales (código, coords, caudal, régimen, uso, calidad).",
      "Mapa hidrogeológico + ubicación de manantiales y piezómetros.",
    ],
    antiPatterns: [
      "Declarar 'no aplica' en EIA-d sin justificación técnica.",
      "Reportar manantiales sin coordenadas.",
      "Omitir la vulnerabilidad acuífera en EIA-d.",
    ],
    canon:
      "Se identificaron {n} manantiales (M-01 a M-{n}). M-01 con caudal {Q} L/s, régimen {…}. Nivel freático entre {min} y {max} m. Acuíferos identificados: {fisurado en volcanoclásticas / poroso en depósitos cuaternarios}. Vulnerabilidad acuífera (GOD): {baja/media/alta}.",
  },
  "3.2.8": {
    sectionPath: "3.2.8",
    title: "Suelos",
    minTier: "dia",
    citations: [
      "Soil Taxonomy USDA",
      "WRB FAO",
      "D.S. N° 017-2009-AG (CUMT)",
      "D.S. N° 011-2017-MINAM (ECA Suelo)",
    ],
    requiredTables: [
      "Tabla 3.2.8-1 — calicatas (código, coords, profundidad, horizontes).",
      "Tabla 3.2.8-2 — clasificación Soil Taxonomy/WRB por calicata.",
      "Tabla 3.2.8-3 — CUMT por unidad (símbolo + limitaciones).",
      "Tabla 3.2.8-4 — resultados calidad vs ECA Suelo DS 011-2017-MINAM (uso aplicable).",
    ],
    antiPatterns: [
      "Confundir Soil Taxonomy con CUMT.",
      "Citar el ECA derogado DS 002-2013-MINAM.",
      "Reportar calidad de suelos sin declarar el uso aplicable.",
      "Omitir CUMT en EIA-sd o EIA-d.",
    ],
    canon:
      "{N} calicatas (SUE-001 a SUE-{N}) hasta {prof} m. Soil Taxonomy: {Cryorthents líticos / Leptosols dystricos}. CUMT (D.S. N° 017-2009-AG): {P3sec — pastoreo, calidad baja, limitaciones suelo/erosión/clima}. Calidad vs ECA Suelo D.S. N° 011-2017-MINAM (uso {agrícola}): hidrocarburos F1/F2/F3 y metales {As, Cd, Hg} cumplen; {Pb en SUE-003: {valor} mg/kg vs ECA {umbral}, atribuida a anomalía geoquímica natural}.",
  },
  "3.2.9": {
    sectionPath: "3.2.9",
    title: "Calidad del agua (superficial y subterránea)",
    minTier: "dia",
    citations: [
      "D.S. N° 004-2017-MINAM (ECA Agua)",
      "R.J. N° 010-2016-ANA (Protocolo Nacional de Monitoreo de Calidad de Recursos Hídricos Superficiales)",
      "APHA Standard Methods",
    ],
    requiredTables: [
      "Tabla 3.2.9-1 — estaciones (código, coords, cuerpo de agua, criterio: aguas arriba/abajo/control).",
      "Tabla 3.2.9-2 — parámetros con métodos y LD.",
      "Tabla 3.2.9-3 — resultados vs ECA DS 004-2017-MINAM, Categoría y Subcategoría declarada.",
      "Mapa de puntos de monitoreo + dirección de flujo.",
    ],
    antiPatterns: [
      "No declarar Categoría y Subcategoría.",
      "Comparar contra ECAs derogados (DS 015-2015-MINAM, DS 002-2008-MINAM).",
      "Muestrear sin permiso ANA cuando se intersecta faja marginal.",
      "No disaggregar superficial y subterránea.",
      "Pedir conformidad con Cat. 1-A1 cuando el uso real es Cat. 3 o 4.",
    ],
    canon:
      "{N} estaciones de agua superficial (ASUP-001 a ASUP-{N}) en temporada {seca|húmeda} de {año}, conforme al R.J. N° 010-2016-ANA. Comparación con ECA Agua D.S. N° 004-2017-MINAM, Categoría {3} — Subcategoría {D1: vegetales de tallo bajo y bebida de animales}, aplicable por {uso identificado en 3.4.3}. pH ({rango}) y OD ({rango}) dentro de ECA. Metales {As, Cd, Pb, Hg} cumplen salvo {As en ASUP-003: {valor} vs ECA {umbral}, atribuida al fondo geoquímico natural caracterizado en 3.2.4}. Laboratorio INACAL N° LE-{XXX}, Anexo {YY}.",
  },
  "3.3.1": {
    sectionPath: "3.3.1",
    title: "Flora y vegetación",
    minTier: "dia",
    citations: [
      "Mapa Nacional de Cobertura Vegetal (MINAM 2015)",
      "Holdridge (zonas de vida — referencia cruzada con 3.2.1)",
      "D.S. N° 043-2006-AG (flora amenazada)",
      "CITES Apéndices I/II/III",
      "UICN Lista Roja",
      "Autorización SERFOR (R.D.E. N° …)",
    ],
    requiredTables: [
      "Mapa de cobertura vegetal.",
      "Tabla 3.3.1-1 — formaciones vegetales (nombre, % área, fisonomía, zona de vida).",
      "Tabla 3.3.1-2 — esfuerzo de muestreo por formación.",
      "Tabla 3.3.1-3 — listado florístico (familia, especie, autor, formación, hábito, categorías D.S. 043-2006-AG / CITES / UICN, endemismo).",
      "Tabla 3.3.1-4 (EIA-d) — índices de diversidad + curva de acumulación.",
    ],
    antiPatterns: [
      "Listar especies sin declarar categoría de protección.",
      "Colectar sin autorización SERFOR.",
      "Identificar sólo a nivel de género en EIA-d cuando la especie es identificable.",
      "Reportar cobertura sin esfuerzo de muestreo justificado.",
      "Omitir endemismos.",
    ],
    canon:
      "Levantamiento florístico en temporada {seca|húmeda} de {año} bajo autorización SERFOR R.D.E. N° {…} (Anexo {YY}), responsabilidad de {biólogo/a, CBP {…}}. Transectos lineales de 50 m con parcelas Whittaker modificadas (0.1 ha, n = {N}). Identificación in situ + herborización (herbario {USM/MOL}). {N} especies, {N} familias. Especies con categoría: *Polylepis incana* (queñual) — En Peligro (D.S. N° 043-2006-AG), Vulnerable (UICN); *Buddleja coriacea* (kolle) — Vulnerable. Formaciones: pajonal andino ({X}%), bofedal altoandino ({Y}%), matorral húmedo ({Z}%), roquedal ({W}%) — consistente con Mapa Nacional MINAM 2015 y zonas de vida Holdridge.",
  },
  "3.3.2": {
    sectionPath: "3.3.2",
    title: "Fauna silvestre",
    minTier: "dia",
    citations: [
      "D.S. N° 004-2014-MINAGRI (fauna amenazada)",
      "R.M. N° 057-2015-MINAGRI",
      "CITES Apéndices I/II/III",
      "UICN Lista Roja",
      "Autorización SERFOR (R.D.E. N° …)",
      "Autorización PRODUCE (hidrobiología, cuando aplica)",
    ],
    requiredTables: [
      "Tabla 3.3.2-1 — esfuerzo por grupo (aves puntos×min, mamíferos km transecto, días-trampa, horas-red, VES).",
      "Tabla 3.3.2-2 — listado por grupo (clase/orden/familia/especie/categorías/endemismo/hábitat).",
      "Tabla 3.3.2-3 (EIA-d) — índices de diversidad por grupo y formación.",
      "Curva de acumulación de especies.",
    ],
    antiPatterns: [
      "Colectar/capturar sin autorización SERFOR.",
      "Métodos no estandarizados (sólo entrevistas a la comunidad).",
      "Omitir nocturnos en proyectos con murciélagos potenciales.",
      "Declarar especies 'vistas' sin estandarización del esfuerzo.",
      "No incluir hidrobiología en EIA-d con cuerpos de agua permanentes.",
    ],
    canon:
      "Inventario en temporada {seca|húmeda} de {año} bajo SERFOR R.D.E. N° {…}. Avifauna: puntos de conteo radio fijo 50 m ({N}×10 min). Mamíferos: transectos lineales 1 km + Sherman (20×{días}). Herpetofauna: VES. {N} aves, {M} mamíferos, {K} herpetofauna. Categorías: *Vultur gryphus* (cóndor) — EP (D.S. N° 004-2014-MINAGRI), VU (UICN), Apéndice I CITES; *Vicugna vicugna* — CA (D.S. N° 004-2014-MINAGRI), Apéndice II CITES; *Lama guanicoe* — EP; *Telmatobius marmoratus* — EP (UICN).",
  },
  "3.3.3": {
    sectionPath: "3.3.3",
    title: "Ecosistemas",
    minTier: "dia",
    citations: [
      "Mapa Nacional de Ecosistemas (MINAM)",
      "D.S. N° 005-2018-MINAM (ecosistemas frágiles)",
      "Ley N° 28611 Art. 99 (ecosistemas frágiles)",
      "R.M. N° 005-2018-MINAM (lista sectorial de ecosistemas frágiles)",
      "Ley N° 26834 + D.S. N° 038-2001-AG (ANP)",
      "Ley N° 30215 (servicios ecosistémicos, EIA-d)",
    ],
    requiredTables: [
      "Mapa de ecosistemas + ANP/ZA/ACR/ACP overlay.",
      "Tabla 3.3.3-1 — ecosistemas (nombre, % área, descripción, fragilidad Sí/No con sustento).",
      "Tabla 3.3.3-2 (EIA-d) — servicios ecosistémicos.",
      "Tabla 3.3.3-3 — relación con ANP/ZA/ACR/ACP (distancia, superposición).",
    ],
    antiPatterns: [
      "Declarar que no hay ecosistemas frágiles sin verificar R.M. 005-2018-MINAM y Ley 28611 Art. 99.",
      "Reportar distancia a ANP sin nombrarla.",
      "Ignorar la Zona de Amortiguamiento.",
    ],
    canon:
      "Ecosistemas: pajonal de puna húmeda ({X}%), bofedal altoandino ({Y}% — **frágil** R.M. N° 005-2018-MINAM, Ley N° 28611 Art. 99), matorral húmedo montano, roquedal. Franja de exclusión de 50 m alrededor del bofedal. Proyecto a {N km} de la {ANP nombre}, sin superposición con su ZA. {Servicios ecosistémicos (EIA-d): provisión de agua, forraje, regulación climática local.}",
  },
  "3.4.1": {
    sectionPath: "3.4.1",
    title: "Demografía",
    minTier: "dia",
    citations: [
      "INEI — Censo Nacional 2017 (Población, Vivienda, Comunidades Indígenas)",
      "INEI — Compendios estadísticos departamentales",
      "MINCUL — Base de Datos de Pueblos Indígenas u Originarios (BDPI)",
    ],
    requiredTables: [
      "Tabla 3.4.1-1 — centros poblados del AID (nombre, UBIGEO, distancia, población, viviendas).",
      "Tabla 3.4.1-2 — estructura poblacional por edad y sexo (pirámide).",
      "Tabla 3.4.1-3 — caracterización del AII (distrito): población, tasa de crecimiento, densidad, urbano/rural.",
      "Mapa de centros poblados sobre AID y AII.",
    ],
    antiPatterns: [
      "Reportar sólo el AII (distrito) sin caracterización del AID.",
      "Usar el Censo 2007 cuando el 2017 está disponible.",
      "Omitir la consulta a la BDPI.",
      "Reportar población sin pirámide etaria.",
    ],
    canon:
      "AID social: centro poblado {Chillihua} (UBIGEO {…}), {145} habitantes ({H/M}), a {2.3 km} del área efectiva. Distribución etaria: 0–14 ({34}%), 15–64 ({58}%), 65+ ({8}%). AII: distrito de {Yauri}, {32 850} habitantes (INEI 2017), crecimiento anual {1.2}%. Consulta BDPI (MINCUL): {comunidades inscritas / no inscritas como pueblos indígenas}.",
  },
  "3.4.2": {
    sectionPath: "3.4.2",
    title: "Indicadores socioeconómicos",
    minTier: "dia",
    citations: [
      "INEI — ENAHO, ENAPRES, Mapa de Pobreza",
      "PNUD — Informe sobre Desarrollo Humano del Perú (IDH distrital)",
      "MINEDU — Escale",
      "MINSA — DIRESA",
      "MVCS — agua y saneamiento",
    ],
    requiredTables: [
      "Tabla 3.4.2-1 — actividades económicas (PEA por rama, ingreso, autoconsumo vs mercado).",
      "Tabla 3.4.2-2 — servicios básicos (agua, saneamiento, electricidad, internet) AID vs distrito.",
      "Tabla 3.4.2-3 — educación.",
      "Tabla 3.4.2-4 — salud.",
      "Tabla 3.4.2-5 — IDH y componentes.",
    ],
    antiPatterns: [
      "Copiar indicadores del nivel provincial cuando el distrital está disponible.",
      "Reportar IDH sin sus componentes.",
      "No diferenciar AID vs distrito en cobertura de servicios.",
      "Ignorar grupos vulnerables en EIA-d.",
    ],
    canon:
      "Actividades económicas: ganadería extensiva de camélidos y ovinos, agricultura de subsistencia, pequeña minería artesanal, comercio local. Cobertura agua potable {62}% AID vs {X}% distrito; saneamiento {35}%; electrificación {88}%. Salud: 1 posta médica a 12 km + promotor en {Chillihua}. Educación: inicial y primaria en {Chillihua}; secundaria en Yauri. IDH distrital {0.4521} (INEI/PNUD 2017) — desarrollo medio-bajo.",
  },
  "3.4.3": {
    sectionPath: "3.4.3",
    title: "Uso del territorio",
    minTier: "dia",
    citations: [
      "Ley N° 24656 (Comunidades Campesinas)",
      "Ley N° 22175 (Comunidades Nativas)",
      "D.L. N° 1015 y D.L. N° 1073",
      "SUNARP (partida registral de la comunidad)",
      "INGEMMET / GEOCATMIN (concesiones mineras)",
      "SERNANP (ANP/ZA)",
    ],
    requiredTables: [
      "Tabla 3.4.3-1 — uso actual del suelo (% área).",
      "Tabla 3.4.3-2 — tenencia (tipo, comunidad, partida SUNARP, superficie comunal).",
      "Tabla 3.4.3-3 — concesiones mineras vigentes en el área de estudio.",
      "Mapa de uso actual + tenencia + concesiones + comunidades.",
    ],
    antiPatterns: [
      "Reportar 'tierras comunales' sin partida SUNARP.",
      "Omitir concesiones mineras vigentes (especialmente colindantes).",
      "Ignorar la consulta a la Defensoría del Pueblo para conflictos sociales.",
      "Mezclar 'uso actual' con 'uso potencial' (CUMT — eso va en 3.2.8).",
    ],
    canon:
      "Uso actual: pastoreo extensivo (camélidos) {78}%, cultivos andinos {8}%, áreas sin uso productivo {14}%. Tenencia: tierras comunales de la C.C. de {Chillihua}, SUNARP Partida N° {…}. No hay propiedad privada individual en el área efectiva. Concesiones mineras vigentes (GEOCATMIN): {…}. Defensoría del Pueblo: {sin/con} conflictos sociales activos registrados.",
  },
  "3.5": {
    sectionPath: "3.5",
    title: "Arqueología y patrimonio cultural",
    minTier: "dia",
    citations: [
      "Ley N° 28296 (Ley General del Patrimonio Cultural de la Nación)",
      "D.S. N° 003-2014-MC (Reglamento de Intervenciones Arqueológicas)",
      "CIRA (Ministerio de Cultura — N° y fecha)",
      "PEA / monitoreo arqueológico (cuando aplica)",
    ],
    requiredTables: [
      "Informe arqueológico de reconocimiento (anexo).",
      "Resolución CIRA (anexo).",
      "Plano de reconocimiento arqueológico.",
    ],
    antiPatterns: [
      "Declarar 'no aplica' porque el proyecto está en zona alta sin sustentar.",
      "Reemplazar el CIRA por una declaración jurada.",
      "No nombrar al arqueólogo responsable ni su RNA.",
    ],
    canon:
      "Reconocimiento arqueológico superficial sin excavaciones en {mes año} a cargo de {arqueólogo/a, RNA-{N}}. {Se identificaron / No se identificaron} restos arqueológicos en el área efectiva. CIRA N° {0762-2024-DCE/MC}, fecha {…}, adjunto en Anexo 3.5. {Monitoreo arqueológico permanente bajo PEA N° {…} cuando aplica.}",
  },
  "3.6": {
    sectionPath: "3.6",
    title: "Cartografía",
    minTier: "dia",
    citations: [
      "IGN — Cartas Nacionales 1:100 000 / 1:50 000 / 1:25 000",
      "Sistema WGS84 — Zona UTM correspondiente",
    ],
    requiredTables: [
      "Listado de planos con código, título y escala.",
      "Anexo cartográfico (todos los planos).",
    ],
    antiPatterns: [
      "Planos sin grilla UTM.",
      "Planos sin escala gráfica + numérica.",
      "Planos referenciados en el texto que no aparecen en el listado.",
      "Cuadrantes IGN no citados.",
    ],
    canon: [
      "Mapa 1 — Ubicación general 1:50 000",
      "Mapa 2 — Componentes del proyecto 1:5 000",
      "Mapa 3 — Áreas de influencia ambiental y social 1:25 000",
      "Mapa 4 — Geológico",
      "Mapa 5 — Geomorfológico",
      "Mapa 6 — Hidrológico (microcuencas Pfafstetter)",
      "Mapa 7 — Cobertura vegetal",
      "Mapa 8 — Uso actual del territorio",
      "Mapa 9 — Estaciones de monitoreo ambiental",
      "Mapa 10 — Reconocimiento arqueológico",
    ].join("\n"),
  },
};

/** Tier ranking — used to validate `section.minTier <= caller.tier`. */
const TIER_ORDER: Record<Tier, number> = { dia: 0, eia_sd: 1, eia_d: 2, modificacion: 0 };

export function isSectionRequiredAtTier(sectionPath: string, tier: Tier): boolean {
  const recipe = RECIPES[sectionPath];
  if (!recipe) return false;
  return TIER_ORDER[tier] >= TIER_ORDER[recipe.minTier];
}

/** Render the recipe as a Spanish-language block for prompt injection. */
export function renderRecipeForPrompt(sectionPath: string): string | null {
  const r = RECIPES[sectionPath];
  if (!r) return null;
  return [
    `CONTRATO METODOLÓGICO PARA LA SECCIÓN ${r.sectionPath} — ${r.title}`,
    ``,
    `Citaciones normativas obligatorias (usar verbatim):`,
    ...r.citations.map((c) => `  - ${c}`),
    ``,
    `Tablas y figuras obligatorias:`,
    ...r.requiredTables.map((t) => `  - ${t}`),
    ``,
    `Anti-patrones (no redactar de esta manera):`,
    ...r.antiPatterns.map((a) => `  - ${a}`),
    ``,
    `Phrasing canon (adaptar, no copiar verbatim):`,
    r.canon,
  ].join("\n");
}
