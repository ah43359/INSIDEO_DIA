"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatHa } from "@/lib/format";
import { useAreaEstudioSelection } from "@/context/AreaEstudioSelectionContext";
import { useStrahlerCatchmentSelection } from "@/context/StrahlerCatchmentContext";

// ─── Basemaps ─────────────────────────────────────────────────────────
// Three options:
//   default   — Carto Voyager vector tiles (current).
//   topo      — ESRI World Topo (raster, includes shaded relief).
//   satellite — ESRI World Imagery (raster, satellite).
//
// ESRI tile services are free for low-volume use; attribution required.

type BasemapKey = "default" | "topo" | "satellite";

const BASEMAPS: Record<BasemapKey, string | StyleSpecification> = {
  default: {
    version: 8,
    sources: {
      "esri-topo": {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution:
          "Tiles © Esri — Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
      },
    },
    layers: [
      { id: "esri-topo-layer", type: "raster", source: "esri-topo" },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
  topo: {
    version: 8,
    sources: {
      "esri-topo": {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution:
          "Tiles © Esri — Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
      },
    },
    layers: [
      { id: "esri-topo-layer", type: "raster", source: "esri-topo" },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
  satellite: {
    version: 8,
    sources: {
      "esri-imagery": {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution:
          "Tiles © Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community",
      },
    },
    layers: [
      { id: "esri-imagery-layer", type: "raster", source: "esri-imagery" },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
};

const BASEMAP_LABEL: Record<BasemapKey, string> = {
  default: "Mapa",
  topo: "Topográfico",
  satellite: "Satélite",
};

// Map of legend "group" ↔ maplibre layer ids. Clicking a legend row
// toggles every layer in the group's array.
const LAYER_GROUPS = {
  area:        ["area-estudio-fill", "area-estudio-line"],
  efectiva:    ["area-efectiva-fill", "area-efectiva-line"],
  subbasins:   ["subbasins-fill", "subbasins-line"],
  districtMicrocuencas: ["district-microcuencas-fill", "district-microcuencas-line", "district-microcuencas-selected-fill", "district-microcuencas-selected-line"],
  strahlerCatchments: ["strahler-catchments-fill", "strahler-catchments-line", "strahler-catchments-selected-fill", "strahler-catchments-selected-line"],
  catchmentPoint:    ["catchment-point-circle", "catchment-point-stroke", "catchment-point-label"],
  rivers:      ["rivers-line"],
  receptores:  ["receptores-fill", "receptores-label"],
  components:  [
    "components-fill",
    "components-line",
    "components-polygon-fill",
    "components-polygon-line",
    "components-label",
    "components-label-line",
  ],
  vegetation:  ["vegetation-fill", "vegetation-label"],
  // Political boundaries
  departments:  ["departamentos-fill", "departamentos-line"],
  provinces:    ["provincias-fill", "provincias-line"],
  comunidades:  ["comunidades-fill", "comunidades-line", "comunidades-label"],
  districts:    ["distritos-fill", "distritos-line"],
  // Roads
  roads:        ["roads-line"],
  // Concesiones mineras
  concesiones:  ["concesiones-fill", "concesiones-line", "concesiones-label"],
  // IGN Carta Nacional 1:100k topographic contours.
  contornos:    ["contours-line", "contours-label"],
  // Peru country outline (low-zoom reference layer).
  peruOutline:  ["peru-boundary-line"],
  // sampling-station kinds are filtered via filter expression rather
  // than separate layers (see toggleStationKindFilter).
} as const;

type LayerGroup = keyof typeof LAYER_GROUPS;

interface ProjectMapProps {
  geojson: GeoJSON.FeatureCollection;
  /** All microcuencas within the project district(s), for user selection. Optional. */
  districtMicrocuencas?: GeoJSON.FeatureCollection | null;
  /** Strahler-2+ catchment polygons (smoothed) for the study area selection workflow. Optional. */
  strahlerCatchments?: GeoJSON.FeatureCollection | null;
  /** Downstream catchment point (1-feature FeatureCollection of a Point). Optional. */
  catchmentPoint?: GeoJSON.FeatureCollection | null;
  /** Rivers near the project (IGN Carta Nacional 1:100,000, filtered by RPC). Optional. */
  rivers?: GeoJSON.FeatureCollection | null;
  /** Centros poblados that fall in or near the área de estudio. Optional. */
  receptores?: GeoJSON.FeatureCollection | null;
  /** Proposed sampling stations (air / noise / vibration / etc.). Optional. */
  samplingStations?: GeoJSON.FeatureCollection | null;
  /** Single área de estudio polygon (draft or approved). Optional. */
  areaEstudio?: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  /** Visual treatment for the área de estudio outline. */
  areaEstudioStatus?: "draft" | "approved" | "superseded" | null;
  /** Área efectiva — convex hull + buffer of components. Optional. */
  areaEfectiva?: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  /** Vegetation zones from MINAM 2015 cobertura vegetal. Optional. */
  vegetationZones?: GeoJSON.FeatureCollection | null;
  /** Mining concessions (Concesiones Mineras) from INGEMMET Geocatmin. Optional. */
  concesiones?: GeoJSON.FeatureCollection | null;
  /** Contour lines (IGN Carta Nacional 1:100,000) clipped to project buffer. Optional. */
  contours?: GeoJSON.FeatureCollection | null;
  /** Peru country outline (low-zoom reference). Optional. */
  peruBoundary?: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> | null;
  /** Departamentos that intersect the project's region (INEI 2023). Optional. */
  departamentos?: GeoJSON.FeatureCollection | null;
  /** Provincias that intersect the project's region (INEI 2023). Optional. */
  provincias?: GeoJSON.FeatureCollection | null;
  /** Distritos that intersect the project's region (INEI 2023). Optional. */
  distritos?: GeoJSON.FeatureCollection | null;
  /** Comunidades Campesinas that intersect the project's region. Optional. */
  comunidades?: GeoJSON.FeatureCollection | null;
  /** MTC Red Vial road segments that intersect the project's region. Optional. */
  vias?: GeoJSON.FeatureCollection | null;
  /** Active when the user is editing área efectiva vertices on the map. */
  editingAreaEfectiva?: boolean;
  /** Fires whenever the edited polygon changes (drag/insert/delete). */
  onAreaEfectivaGeomChange?: (
    geom: GeoJSON.Polygon | GeoJSON.MultiPolygon | null,
  ) => void;
  /** Bump to force the editor to reset to the persisted polygon. */
  areaEfectivaEditorResetKey?: number;
}

// Color & ranking for sampling-station kinds (kept top-level so the
// legend can reuse it without re-wiring through props).
const STATION_COLORS: Record<string, string> = {
  aire:             "#10b981", // emerald
  ruido:            "#a855f7", // purple
  vibraciones:      "#ef4444", // red
  agua_superficial: "#0ea5e9", // sky
  agua_subterranea: "#0284c7", // darker sky
  suelos:           "#a16207", // earth
  sedimentos:       "#854d0e", // brown
  flora_fauna:      "#16a34a", // green — biological evaluation
  default:          "#1f2937", // graphite
};

const COLOR_BY_TIPO: Record<string, string> = {
  plataforma: "#dc2626",
  acceso: "#f59e0b",
  campamento: "#2563eb",
  tajo: "#7c3aed",
  default: "#52525b",
};

// Class colors keyed by MINAM 2015 Simbolo code — each ecosystem gets a
// distinct hue. Unknown codes fall back to VEGETATION_FALLBACK_COLOR.
const VEGETATION_CLASS_COLORS: Record<string, string> = {
  // MINAM 2015 — Pajonales / Pastizales
  "Pj":     "#d4a017",  // Pajonal andino — golden yellow
  "Pjh":    "#eab308",  // Pajonal de puna húmeda
  // MINAM 2015 — Bosques relictos
  "Br-al":  "#166534",  // Bosque relicto altoandino
  "Br-me":  "#15803d",  // Bosque relicto mesoandino
  "Bp":     "#14532d",  // Bosque de polylepis
  "Bp-A":   "#22c55e",  // Bosque pluvial andino
  // MINAM 2015 — Bosques húmedos / secos
  "Bh-MBT": "#0f766e",  // Bosque húmedo de montaña basimontano
  "Bh-MBS": "#10b981",  // Bosque húmedo de montaña subandino
  "Bh-T":   "#059669",  // Bosque húmedo tropical (Amazonía)
  "Bs-mo":  "#a16207",  // Bosque seco de montaña
  "Bs-MA":  "#b45309",  // Bosque seco macro-andino
  "Bs-T":   "#92400e",  // Bosque seco tropical
  // MINAM 2015 — Matorrales
  "Ma":     "#84cc16",  // Matorral arbustivo
  "Ma-DS":  "#bef264",  // Matorral arbustivo desértico
  "Ma-T":   "#4d7c0f",  // Matorral del piedemonte
  // MINAM 2015 — Humedales / Aguas
  "Bof":    "#2dd4bf",  // Bofedal
  "L/Co":   "#38bdf8",  // Lagunas, lagos y cochas
  "Pa":     "#14b8a6",  // Pantano
  // MINAM 2015 — Áreas intervenidas / Otros
  "Agri":   "#f97316",  // Agricultura costera y andina
  "Agro":   "#fb923c",  // Agropecuario
  "Cul":    "#fdba74",  // Cultivos
  "Pc":     "#65a30d",  // Plantación forestal
  "ZU":     "#dc2626",  // Zonas urbanas
  // MINAM 2015 — Sin vegetación / Especiales
  "Roq":    "#71717a",  // Roquedales
  "D":      "#fde68a",  // Desierto costero
  "Lo":     "#facc15",  // Loma costera
  "Tu":     "#a78bfa",  // Tundra
  "Gn":     "#e0e7ff",  // Glaciar / nieve
};

const VEGETATION_FALLBACK_COLOR = "#94a3b8"; // slate-400 for unknowns

/**
 * Build a MapLibre `match` paint expression from VEGETATION_CLASS_COLORS
 * so the layer config and the colour map don't drift apart.
 */
function buildVegetationFillColorExpression(): object {
  const expr: (string | (string | unknown[])[] | unknown)[] = [
    "match",
    ["get", "code"],
  ];
  for (const [code, color] of Object.entries(VEGETATION_CLASS_COLORS)) {
    expr.push(code, color);
  }
  expr.push(VEGETATION_FALLBACK_COLOR);
  return expr;
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const EMPTY_AREA_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function asAreaFeatureCollection(
  feature: ProjectMapProps["areaEstudio"],
): GeoJSON.FeatureCollection {
  if (!feature) return EMPTY_AREA_FC;
  return { type: "FeatureCollection", features: [feature] };
}

export default function ProjectMap({
  geojson,
  districtMicrocuencas,
  strahlerCatchments,
  catchmentPoint,
  rivers,
  receptores,
  samplingStations,
  areaEstudio,
  areaEstudioStatus,
  areaEfectiva,
  vegetationZones,
  concesiones,
  contours,
  peruBoundary,
  departamentos,
  provincias,
  distritos,
  comunidades,
  vias,
  editingAreaEfectiva = false,
  onAreaEfectivaGeomChange,
  areaEfectivaEditorResetKey = 0,
}: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [basemap, setBasemap] = useState<BasemapKey>("default");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Layer-group visibility (true = visible). Default everything on.
  const [groupVisible, setGroupVisible] = useState<Record<LayerGroup, boolean>>({
    area: true,
    efectiva: true,
    subbasins: true,
    districtMicrocuencas: true,
    strahlerCatchments: true,
    catchmentPoint: true,
    rivers: true,
    receptores: true,
    components: true,
    vegetation: true,
    departments: true,
    provinces: true,
    districts: true,
    comunidades: true,
    roads: true,
    concesiones: true,
    // Contours hidden by default — they add a lot of ink and most users
    // only want them when reading topography.
    contornos: false,
    peruOutline: true,
  });
  // District microcuenca selection — shared via context with the panel.
  const { selectedIds, toggle } = useAreaEstudioSelection();
  const toggleRef = useRef(toggle);
  useEffect(() => { toggleRef.current = toggle; }, [toggle]);

  // Strahler catchment selection — parallel context for the strahler workflow.
  const { selectedIds: strahlerSelectedIds, toggle: strahlerToggle } = useStrahlerCatchmentSelection();
  const strahlerToggleRef = useRef(strahlerToggle);
  useEffect(() => { strahlerToggleRef.current = strahlerToggle; }, [strahlerToggle]);

  // Sampling-station kinds: each kind togglable independently.
  const [stationKindVisible, setStationKindVisible] = useState<Record<string, boolean>>({});
  // Vegetation classes: each class togglable independently.
  const [vegClassVisible, setVegClassVisible] = useState<Record<string, boolean>>({});

  // Boundaries flow in as props from the server. They come from the
  // ref_departamentos / ref_provincias / ref_distritos tables via the
  // get_*_for_project RPCs (real INEI 2023 source).
  const boundaryData = useMemo(
    () => ({
      departamentos: departamentos ?? null,
      provincias: provincias ?? null,
      distritos: distritos ?? null,
    }),
    [departamentos, provincias, distritos],
  );

  // The colour of the área de estudio outline communicates status:
  //   draft → amber   approved → emerald   superseded → muted
  const areaColor =
    areaEstudioStatus === "approved"
      ? "#059669"
      : areaEstudioStatus === "superseded"
      ? "#a8a29e"
      : "#d97706";

  useEffect(() => {
    if (!containerRef.current) return;

    // Tear down any prior map (basemap change re-enters this effect).
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    setMapError(null);
    setMapLoaded(false);

    // Hard gate: MapLibre GL v5 requires WebGL2.
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) {
      queueMicrotask(() => {
        setMapError("Tu navegador no soporta WebGL2, necesario para el mapa.");
      });
      return;
    }

    let map: MlMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAPS[basemap],
        center: [-75, -10],
        zoom: 5,
        attributionControl: { compact: true },
        // Note: preserveDrawingBuffer omitted — causes silent WebGL2
        // context loss on some GPU drivers.
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      queueMicrotask(() => {
        setMapError(msg);
      });
      return;
    }

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

    map.on("error", (e) => {
      console.error("[ProjectMap] error:", e.error);
      setMapError(e.error?.message ?? "Error al cargar el mapa");
    });

    // "load" fires after the first visual render (requires working WebGL2).
    // If it never fires the overlay stays — open DevTools console for clues.
    map.on("load", () => {
      setMapLoaded(true);
      // District microcuencas — selectable polygons for the área de estudio
      // workflow. Two sources: one for all district UH, one for the selection.
      map.addSource("district-microcuencas", {
        type: "geojson",
        data: districtMicrocuencas ?? EMPTY_FC,
        generateId: false,
      });
      map.addSource("district-microcuencas-selected", {
        type: "geojson",
        data: EMPTY_FC,
      });
      map.addLayer({
        id: "district-microcuencas-fill",
        type: "fill",
        source: "district-microcuencas",
        paint: {
          "fill-color": "#38bdf8", // sky-400
          "fill-opacity": 0.05,
        },
      });
      map.addLayer({
        id: "district-microcuencas-line",
        type: "line",
        source: "district-microcuencas",
        paint: {
          "line-color": "#0284c7", // sky-600
          "line-width": 0.8,
          "line-dasharray": [4, 3],
          "line-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "district-microcuencas-selected-fill",
        type: "fill",
        source: "district-microcuencas-selected",
        paint: {
          "fill-color": "#38bdf8", // sky-400
          "fill-opacity": 0.35,
        },
      });
      map.addLayer({
        id: "district-microcuencas-selected-line",
        type: "line",
        source: "district-microcuencas-selected",
        paint: {
          "line-color": "#0369a1", // sky-700
          "line-width": 2,
        },
      });

      // Click on a district microcuenca → toggle selection
      map.on("click", "district-microcuencas-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = Number(f.properties?.id);
        if (!Number.isFinite(id)) return;
        toggleRef.current(id);
      });
      map.on("mouseenter", "district-microcuencas-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "district-microcuencas-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      // ── Strahler catchments — selectable polygons for the strahler workflow ──
      map.addSource("strahler-catchments", {
        type: "geojson",
        data: strahlerCatchments ?? EMPTY_FC,
        generateId: false,
      });
      map.addSource("strahler-catchments-selected", {
        type: "geojson",
        data: EMPTY_FC,
      });
      map.addLayer({
        id: "strahler-catchments-fill",
        type: "fill",
        source: "strahler-catchments",
        paint: {
          "fill-color": "#0d9488", // teal-600
          "fill-opacity": 0.07,
        },
      });
      map.addLayer({
        id: "strahler-catchments-line",
        type: "line",
        source: "strahler-catchments",
        paint: {
          "line-color": "#0f766e", // teal-700
          "line-width": 1,
          "line-dasharray": [4, 3],
          "line-opacity": 0.8,
        },
      });
      map.addLayer({
        id: "strahler-catchments-selected-fill",
        type: "fill",
        source: "strahler-catchments-selected",
        paint: {
          "fill-color": "#0d9488", // teal-600
          "fill-opacity": 0.30,
        },
      });
      map.addLayer({
        id: "strahler-catchments-selected-line",
        type: "line",
        source: "strahler-catchments-selected",
        paint: {
          "line-color": "#134e4a", // teal-900
          "line-width": 2,
        },
      });

      // Click on a strahler catchment → toggle strahler selection
      map.on("click", "strahler-catchments-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = Number(f.properties?.id);
        if (!Number.isFinite(id)) return;
        strahlerToggleRef.current(id);
      });
      map.on("mouseenter", "strahler-catchments-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "strahler-catchments-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      map.addSource("area-estudio", {
        type: "geojson",
        data: asAreaFeatureCollection(areaEstudio),
      });

      // Sub-cuencas calculadas — the D8-computed sub-basin envelope.
      // Renders as a subtle hatched pattern so it can be toggled
      // independently from the generic area-estudio layer.
      map.addSource("subbasins", {
        type: "geojson",
        data: asAreaFeatureCollection(areaEstudio),
      });
      map.addLayer({
        id: "subbasins-fill",
        type: "fill",
        source: "subbasins",
        paint: {
          "fill-color": "#059669",
          "fill-opacity": 0.04,
        },
      });
      map.addLayer({
        id: "subbasins-line",
        type: "line",
        source: "subbasins",
        paint: {
          "line-color": "#059669",
          "line-width": 2,
          "line-dasharray": [6, 3],
        },
      });

      // Vegetation zones — MINAM 2015 cobertura vegetal, colored by Simbolo.
      // Semi-transparent fills with class labels.
      map.addSource("vegetation", {
        type: "geojson",
        data: vegetationZones ?? EMPTY_FC,
      });
      map.addLayer({
        id: "vegetation-fill",
        type: "fill",
        source: "vegetation",
        paint: {
          "fill-color": buildVegetationFillColorExpression(),
          "fill-opacity": 0.45,
        },
      });
      map.addLayer({
        id: "vegetation-label",
        type: "symbol",
        source: "vegetation",
        minzoom: 12,
        layout: {
          "text-field": ["concat", ["get", "class_name"], " (", ["to-string", ["get", "area_ha"]], " ha)"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 9,
          "text-anchor": "center",
          "text-optional": true,
        },
        paint: {
          "text-color": "#1c1917",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
});
  
// Departamentos — political boundaries level 1 (loaded from Supabase)
      console.log('Creating departamentos source');
      map.addSource("departamentos", {
        type: "geojson",
        data: boundaryData.departamentos ?? EMPTY_FC,
      });
      map.addLayer({
        id: "departamentos-fill",
        type: "fill",
        source: "departamentos",
        paint: {
          "fill-color": "#6366f1",
          "fill-opacity": 0.15,
        },
      });
      map.addLayer({
        id: "departamentos-line",
        type: "line",
        source: "departamentos",
        paint: {
          "line-color": "#4338ca",
          "line-width": 2.5,
        },
      });

      // Provincias — political boundaries level 2 (loaded client-side)
      map.addSource("provincias", {
        type: "geojson",
        data: boundaryData.provincias ?? EMPTY_FC,
      });
      map.addLayer({
        id: "provincias-fill",
        type: "fill",
        source: "provincias",
        paint: {
          "fill-color": "#8b5cf6",
          "fill-opacity": 0.15,
        },
      });
      map.addLayer({
        id: "provincias-line",
        type: "line",
        source: "provincias",
        paint: {
          "line-color": "#7c3aed",
          "line-width": 2,
        },
      });

      // Distritos — political boundaries level 3 (loaded client-side)
      map.addSource("distritos", {
        type: "geojson",
        data: boundaryData.distritos ?? EMPTY_FC,
      });
      map.addLayer({
        id: "distritos-fill",
        type: "fill",
        source: "distritos",
        paint: {
          "fill-color": "#a78bfa",
          "fill-opacity": 0.15,
        },
      });
      map.addLayer({
        id: "distritos-line",
        type: "line",
        source: "distritos",
        paint: {
          "line-color": "#8b5cf6",
          "line-width": 1.5,
        },
      });

      // Comunidades Campesinas — community-titled lands (COFOPRI / MINAGRI).
      map.addSource("comunidades", {
        type: "geojson",
        data: comunidades ?? EMPTY_FC,
      });
      map.addLayer({
        id: "comunidades-fill",
        type: "fill",
        source: "comunidades",
        paint: {
          "fill-color": "#f59e0b", // amber-500
          "fill-opacity": 0.18,
        },
      });
      map.addLayer({
        id: "comunidades-line",
        type: "line",
        source: "comunidades",
        paint: {
          "line-color": "#b45309", // amber-700
          "line-width": 1.5,
          "line-dasharray": [4, 2],
        },
      });
      map.addLayer({
        id: "comunidades-label",
        type: "symbol",
        source: "comunidades",
        minzoom: 10,
        layout: {
          "text-field": ["get", "nombre"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#92400e",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
      });

      // Roads — MTC Red Vial (Nacional / Departamental / Vecinal)
      map.addSource("roads", {
        type: "geojson",
        data: EMPTY_FC,
      });
      map.addLayer({
        id: "roads-line",
        type: "line",
        source: "roads",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": [
            "match",
            ["get", "jerarquia"],
            "RN", "#dc2626",          // Nacional — red
            "RD", "#ea580c",          // Departamental — orange
            "RV", "#ca8a04",          // Vecinal — amber
            "#9ca3af",                // default gray
          ],
          "line-width": [
            "match",
            ["get", "jerarquia"],
            "RN", 3,
            "RD", 2,
            "RV", 1,
            1,
          ],
          "line-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "area-estudio-fill",
        type: "fill",
        source: "area-estudio",
        paint: {
          "fill-color": areaColor,
          "fill-opacity": 0.06,
        },
      });
      map.addLayer({
        id: "area-estudio-line",
        type: "line",
        source: "area-estudio",
        paint: {
          "line-color": areaColor,
          "line-width": 2.5,
        },
      });

      // Área efectiva — tighter polygon (convex hull + buffer) hugging the
      // components. Distinct color so it's never confused with the área de
      // estudio. Coral / orange-pink.
      map.addSource("area-efectiva", {
        type: "geojson",
        data: asAreaFeatureCollection(areaEfectiva),
      });
      map.addLayer({
        id: "area-efectiva-fill",
        type: "fill",
        source: "area-efectiva",
        paint: {
          "fill-color": "#fb7185", // rose-400
          "fill-opacity": 0.08,
        },
      });
      map.addLayer({
        id: "area-efectiva-line",
        type: "line",
        source: "area-efectiva",
        paint: {
          "line-color": "#e11d48", // rose-600
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      // Rivers — IGN Carta Nacional only (HydroRIVERS is excluded from display).
      // Width scales with strahler_order (computed by compute_strahler.py);
      // falls back to a length_km-derived proxy for segments not yet ordered.
      map.addSource("rivers", {
        type: "geojson",
        data: rivers ?? EMPTY_FC,
      });
      map.addLayer({
        id: "rivers-line",
        type: "line",
        source: "rivers",
        paint: {
          "line-color": "#1d4ed8",
          "line-opacity": 0.75,
          "line-width": [
            "interpolate",
            ["linear"],
            [
              "coalesce",
              ["get", "strahler_order"],
              [
                "case",
                [">=", ["coalesce", ["get", "length_km"], 0], 80], 7,
                [">=", ["coalesce", ["get", "length_km"], 0], 20], 5,
                [">=", ["coalesce", ["get", "length_km"], 0], 5], 3,
                1,
              ],
            ],
            1, 0.5,
            3, 1.0,
            5, 1.8,
            7, 2.8,
            9, 4.0,
          ],
        },
      });

      // ── Catchment point — the downstream confluence anchor ─────────────────
      // A single Point feature (or empty) showing where the project's
      // receiving river meets a Strahler ≥ 3 river. Drawn above the rivers
      // so the marker is visible against the blue lines.
      map.addSource("catchment-point", {
        type: "geojson",
        data: catchmentPoint ?? EMPTY_FC,
      });
      // Color expressions: downstream = amber, upstream = sky.
      // Inline arrays are accepted by MapLibre's paint-property spec at runtime.
      const strokeColor = [
        "match", ["get", "kind"],
        "upstream",   "#0369a1", // sky-700
        /* downstream */ "#b45309", // amber-700
      ] as const;
      const fillColor = [
        "match", ["get", "kind"],
        "upstream",   "#0ea5e9", // sky-500
        /* downstream */ "#d97706", // amber-600
      ] as const;
      const textColor = [
        "match", ["get", "kind"],
        "upstream",   "#0c4a6e", // sky-900
        /* downstream */ "#78350f", // amber-900
      ] as const;
      map.addLayer({
        id: "catchment-point-stroke",
        type: "circle",
        source: "catchment-point",
        paint: {
          "circle-radius": 11,
          "circle-color": "#ffffff",
          "circle-opacity": 1,
          "circle-stroke-color": strokeColor,
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "catchment-point-circle",
        type: "circle",
        source: "catchment-point",
        paint: {
          "circle-radius": 6,
          "circle-color": fillColor,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "catchment-point-label",
        type: "symbol",
        source: "catchment-point",
        layout: {
          "text-field": ["concat", "Punto de control · ", ["get", "label"]],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": textColor,
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.6,
        },
      });
      // Click → popup with full metadata
      map.on("click", "catchment-point-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const kind = (props.kind as string) ?? "downstream";
        const isUp = kind === "upstream";
        const title = isUp
          ? "Punto de control aguas arriba"
          : "Punto de control aguas abajo";
        const distLabel = isUp ? "Aguas arriba del AE" : "Aguas abajo del AE";
        const titleColor = isUp ? "#0c4a6e" : "#78350f";
        const recv = (props.receiving_nombre as string | null) || "(sin nombre)";
        const recvS = props.receiving_strahler ?? "?";
        const conf = (props.confluent_nombre as string | null) || "(sin nombre)";
        const confS = props.confluent_strahler ?? "?";
        const fmt = (m: unknown): string => {
          if (m == null) return "—";
          const n = Number(m);
          if (!Number.isFinite(n)) return "—";
          return n >= 1000 ? `${(n / 1000).toFixed(1)} km` : `${n.toFixed(0)} m`;
        };
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 240px;">
            <div style="font-weight: 600; color: ${titleColor}; margin-bottom: 4px;">
              ${title}
            </div>
            <table style="border-collapse: collapse; font-size: 11px;">
              <tr><td style="color:#78716c; padding-right:8px;">Río receptor</td><td>${recv} (Strahler ${recvS})</td></tr>
              <tr><td style="color:#78716c; padding-right:8px;">Confluye con</td><td>${conf} (Strahler ${confS})</td></tr>
              <tr><td style="color:#78716c; padding-right:8px;">${distLabel}</td><td>${fmt(props.distance_from_ae_m)}</td></tr>
              <tr><td style="color:#78716c; padding-right:8px;">Ruta total</td><td>${fmt(props.path_length_m)}</td></tr>
            </table>
          </div>`;
        new maplibregl.Popup({ closeButton: true, maxWidth: "300px" })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });
      map.on("mouseenter", "catchment-point-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "catchment-point-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      // Curvas de nivel — IGN Carta Nacional 1:100,000 contours, clipped
      // to a buffer of the área de estudio by the server (RPC). Major
      // contours every 250 m render thicker than the 50 m base interval.
      map.addSource("contours", {
        type: "geojson",
        data: contours ?? EMPTY_FC,
      });
      map.addLayer({
        id: "contours-line",
        type: "line",
        source: "contours",
        paint: {
          "line-color": "#78716c", // stone-500
          "line-opacity": 0.55,
          "line-width": [
            "case",
            ["==", ["%", ["coalesce", ["get", "altitud"], 0], 250], 0], 0.9,
            0.35,
          ],
        },
      });
      map.addLayer({
        id: "contours-label",
        type: "symbol",
        source: "contours",
        minzoom: 13,
        filter: ["==", ["%", ["coalesce", ["get", "altitud"], 0], 250], 0],
        layout: {
          "text-field": ["concat", ["to-string", ["get", "altitud"]], " m"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 10,
          "symbol-placement": "line",
          "symbol-spacing": 250,
        },
        paint: {
          "text-color": "#57534e",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
      });

      // Peru country outline — low-zoom reference layer (hidden past z7).
      map.addSource("peru-boundary", {
        type: "geojson",
        data: peruBoundary
          ? { type: "FeatureCollection", features: [peruBoundary] }
          : EMPTY_FC,
      });
      map.addLayer({
        id: "peru-boundary-line",
        type: "line",
        source: "peru-boundary",
        maxzoom: 7,
        paint: {
          "line-color": "#0c4a6e", // sky-900
          "line-width": 1.5,
          "line-opacity": 0.7,
        },
      });

      // Concesiones mineras — mining concessions from INGEMMET Geocatmin.
      // The project's own concession (is_own) gets a distinct outline.
      map.addSource("concesiones", {
        type: "geojson",
        data: concesiones ?? EMPTY_FC,
      });
      map.addLayer({
        id: "concesiones-fill",
        type: "fill",
        source: "concesiones",
        paint: {
          "fill-color": [
            "case",
            ["get", "is_own"],
            "#fbbf24", // amber-400 — project's own concession
            "#d4a017", // golden
          ],
          "fill-opacity": [
            "case",
            ["get", "is_own"],
            0.18,
            0.08,
          ],
        },
      });
      map.addLayer({
        id: "concesiones-line",
        type: "line",
        source: "concesiones",
        paint: {
          "line-color": [
            "case",
            ["get", "is_own"],
            "#d97706", // amber-600 — project's own concession
            "#b45309", // amber-800
          ],
          "line-width": [
            "case",
            ["get", "is_own"],
            2.5,
            1,
          ],
          "line-dasharray": [4, 3],
        },
      });
      map.addLayer({
        id: "concesiones-label",
        type: "symbol",
        source: "concesiones",
        minzoom: 10,
        layout: {
          "text-field": ["get", "codigo"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 10,
          "text-offset": [0, 0.8],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#78350f",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
      });

      // Receptores sensibles — small triangle-ish dots; size scales with
      // CAT_POBLAD priority so cities/villages read through clusters.
      map.addSource("receptores", {
        type: "geojson",
        data: receptores ?? EMPTY_FC,
      });
      map.addLayer({
        id: "receptores-fill",
        type: "circle",
        source: "receptores",
        paint: {
          "circle-radius": [
            "match",
            ["get", "categoria_poblado"],
            "CIUDAD",                 7,
            "VILLA",                  6,
            "PUEBLO",                 5,
            "CASERÍO",                4,
            "ANEXO",                  3,
            3,
          ],
          "circle-color": "#ec4899", // pink-500
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "receptores-label",
        type: "symbol",
        source: "receptores",
        minzoom: 11,
        layout: {
          "text-field": ["get", "nombre"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 10,
          "text-offset": [0, 1.0],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#831843",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      });

      // Sampling stations — colored by kind, encoded as a paint match.
      map.addSource("sampling-stations", {
        type: "geojson",
        data: samplingStations ?? EMPTY_FC,
      });
      map.addLayer({
        id: "sampling-stations-fill",
        type: "circle",
        source: "sampling-stations",
        paint: {
          // Different sizes per kind so stations are individually
          // recognisable when several share a coordinate.
          "circle-radius": [
            "match",
            ["get", "kind"],
            "aire",             8,
            "ruido",            10,
            "vibraciones",      12,
            "agua_superficial", 11,
            "agua_subterranea", 9,
            "suelos",           7,
            "sedimentos",       8,
            "flora_fauna",      9,
            8,
          ],
          "circle-color": [
            "match",
            ["get", "kind"],
            "aire",             STATION_COLORS.aire,
            "ruido",            STATION_COLORS.ruido,
            "vibraciones",      STATION_COLORS.vibraciones,
            "agua_superficial", STATION_COLORS.agua_superficial,
            "agua_subterranea", STATION_COLORS.agua_subterranea,
            "suelos",           STATION_COLORS.suelos,
            "sedimentos",       STATION_COLORS.sedimentos,
            "flora_fauna",      STATION_COLORS.flora_fauna,
            STATION_COLORS.default,
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "sampling-stations-label",
        type: "symbol",
        source: "sampling-stations",
        layout: {
          "text-field": ["get", "station_code"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 10,
          "text-offset": [0, -1.4],
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      });

      map.addSource("components", { type: "geojson", data: geojson });

      // Color expression reused by point/line/polygon layers.
      const colorByTipo = [
        "match",
        ["get", "tipo"],
        "plataforma", COLOR_BY_TIPO.plataforma,
        "acceso",     COLOR_BY_TIPO.acceso,
        "campamento", COLOR_BY_TIPO.campamento,
        "tajo",       COLOR_BY_TIPO.tajo,
        COLOR_BY_TIPO.default,
      ] as const;

      // Polygons (e.g. tajos, depósitos delineated as Polygon).
      map.addLayer({
        id: "components-polygon-fill",
        type: "fill",
        source: "components",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": colorByTipo,
          "fill-opacity": 0.25,
        },
      });
      map.addLayer({
        id: "components-polygon-line",
        type: "line",
        source: "components",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "line-color": colorByTipo,
          "line-width": 1.5,
        },
      });

      // Lines (accesos, líneas eléctricas, cercos, conducciones).
      map.addLayer({
        id: "components-line",
        type: "line",
        source: "components",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": colorByTipo,
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });

      // Points (plataformas, campamentos, calicatas, etc.).
      map.addLayer({
        id: "components-fill",
        type: "circle",
        source: "components",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 8,
          "circle-color": colorByTipo,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "components-label",
        type: "symbol",
        source: "components",
        filter: ["!=", ["geometry-type"], "LineString"],
        layout: {
          "text-field": ["get", "nombre"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "symbol-placement": "point",
        },
        paint: {
          "text-color": "#1c1917",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
      map.addLayer({
        id: "components-label-line",
        type: "symbol",
        source: "components",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: {
          "text-field": ["get", "nombre"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 11,
          "symbol-placement": "line-center",
        },
        paint: {
          "text-color": "#1c1917",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Fit to the widest available extent: área de estudio > microcuencas
      // > components. The outermost layer is the most informative bound.
      const bounds = new maplibregl.LngLatBounds();
      let extended = false;

      const extendFromGeometry = (geom: GeoJSON.Geometry) => {
        if (geom.type === "Point") {
          bounds.extend(geom.coordinates as [number, number]);
          extended = true;
        } else if (geom.type === "MultiPoint" || geom.type === "LineString") {
          for (const c of geom.coordinates as [number, number][]) {
            bounds.extend(c);
            extended = true;
          }
        } else if (
          geom.type === "MultiLineString" ||
          geom.type === "Polygon"
        ) {
          for (const ring of geom.coordinates as [number, number][][]) {
            for (const c of ring) {
              bounds.extend(c);
              extended = true;
            }
          }
        } else if (geom.type === "MultiPolygon") {
          for (const poly of geom.coordinates as [number, number][][][]) {
            for (const ring of poly) {
              for (const c of ring) {
                bounds.extend(c);
                extended = true;
              }
            }
          }
        }
      };

      if (areaEstudio) {
        extendFromGeometry(areaEstudio.geometry);
      }
      if (!extended) {
        for (const f of geojson.features) {
          extendFromGeometry(f.geometry);
        }
      }
      // Always include the catchment point in the initial view so the user
      // sees the full project → control-point context on page load.
      if (catchmentPoint?.features.length) {
        for (const f of catchmentPoint.features) {
          extendFromGeometry(f.geometry);
        }
      }
      if (extended) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
      }

      // Component popups — same handler for points, lines, and polygons.
      const componentPopup = (e: maplibregl.MapLayerMouseEvent): void => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${props.nombre}</div>
            <div>Tipo: ${props.tipo}</div>
            ${props.categoria ? `<div>Categoría: ${props.categoria}</div>` : ""}
            ${props.area_m2 ? `<div>Área: ${props.area_m2} m²</div>` : ""}
            ${props.longitud_tunel_m ? `<div>Longitud: ${props.longitud_tunel_m} m</div>` : ""}
          </div>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      };
      const componentLayers: string[] = [
        "components-fill",
        "components-line",
        "components-polygon-fill",
        "components-polygon-line",
      ];
      for (const id of componentLayers) {
        map.on("click", id, componentPopup);
        map.on("mouseenter", id, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", id, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // River popup
      map.on("click", "rivers-line", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const len = props.length_km != null ? Number(props.length_km).toFixed(1) : null;
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">
              ${props.nombre ?? `Río ${props.source_id}`}
            </div>
            ${len ? `<div>Longitud: ${len} km</div>` : ""}
            ${props.strahler_order != null ? `<div>Strahler: ${props.strahler_order}</div>` : ""}
          </div>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });
      map.on("mouseenter", "rivers-line", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "rivers-line", () => {
        map.getCanvas().style.cursor = "";
      });

      // Receptor popup
      map.on("click", "receptores-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const inside = String(props.inside_area_estudio) === "true";
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${props.nombre}</div>
            ${props.categoria_poblado ? `<div>${props.categoria_poblado}</div>` : ""}
            ${props.distrito ? `<div>${props.distrito} / ${props.provincia ?? ""}</div>` : ""}
            <div style="margin-top:4px; color: ${inside ? "#059669" : "#a16207"};">
              ${inside ? "Dentro del área de estudio" : "En buffer perimetral"}
            </div>
          </div>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });

      // Sampling station popup
      map.on("click", "sampling-stations-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        let params: string[] = [];
        if (typeof props.parameters === "string") {
          try { params = JSON.parse(props.parameters); } catch { params = []; }
        } else if (Array.isArray(props.parameters)) {
          params = props.parameters as string[];
        }
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; max-width: 280px;">
            <div style="font-weight: 600; margin-bottom: 4px;">
              ${props.station_code} <span style="font-weight: 400; color: #64748b;">· ${props.kind}</span>
            </div>
            ${props.target_receptor_nombre ? `<div>Receptor: ${props.target_receptor_nombre}</div>` : ""}
            ${params.length ? `<div style="margin-top:4px;"><b>Parámetros:</b> ${params.join(", ")}</div>` : ""}
            ${props.rationale ? `<div style="margin-top:4px; color: #475569;">${props.rationale}</div>` : ""}
          </div>`;
        new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });

      // Concesión minera popup
      map.on("click", "concesiones-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${props.nombre}</div>
            <div>Código: ${props.codigo}</div>
            ${props.titular ? `<div>Titular: ${props.titular}</div>` : ""}
            ${props.area_ha ? `<div>Área: ${formatHa(props.area_ha)} ha</div>` : ""}
            ${props.estado ? `<div>Estado: ${props.estado}</div>` : ""}
            ${props.tipo ? `<div>Tipo: ${props.tipo}</div>` : ""}
            ${props.is_own ? '<div style="margin-top:4px; color: #d97706; font-weight: 600;">Concesión del proyecto</div>' : ""}
          </div>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });
      map.on("mouseenter", "concesiones-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "concesiones-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      // Vegetation zone popup
      map.on("click", "vegetation-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${props.class_name}</div>
            <div>Área: ${props.area_ha} ha</div>
            <div>Código MINAM: ${props.class_code}</div>
          </div>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });
      map.on("mouseenter", "vegetation-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "vegetation-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Re-runs only on basemap change; data updates flow through the
    // effect below via `setData`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  // Reactively update sources + outline colour when props change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const compSrc = map.getSource("components") as GeoJSONSource | undefined;
    if (compSrc) compSrc.setData(geojson);

    const districtCuencasSrc = map.getSource("district-microcuencas") as GeoJSONSource | undefined;
    if (districtCuencasSrc) districtCuencasSrc.setData(districtMicrocuencas ?? EMPTY_FC);

    const strahlerSrc = map.getSource("strahler-catchments") as GeoJSONSource | undefined;
    if (strahlerSrc) strahlerSrc.setData(strahlerCatchments ?? EMPTY_FC);

    const catchmentPointSrc = map.getSource("catchment-point") as GeoJSONSource | undefined;
    if (catchmentPointSrc) catchmentPointSrc.setData(catchmentPoint ?? EMPTY_FC);

    const riversSrc = map.getSource("rivers") as GeoJSONSource | undefined;
    if (riversSrc) riversSrc.setData(rivers ?? EMPTY_FC);

    const recepSrc = map.getSource("receptores") as GeoJSONSource | undefined;
    if (recepSrc) recepSrc.setData(receptores ?? EMPTY_FC);

    const stationsSrc = map.getSource("sampling-stations") as GeoJSONSource | undefined;
    if (stationsSrc) stationsSrc.setData(samplingStations ?? EMPTY_FC);

    const areaSrc = map.getSource("area-estudio") as GeoJSONSource | undefined;
    if (areaSrc) areaSrc.setData(asAreaFeatureCollection(areaEstudio));

    const efectivaSrc = map.getSource("area-efectiva") as GeoJSONSource | undefined;
    if (efectivaSrc) efectivaSrc.setData(asAreaFeatureCollection(areaEfectiva));

    const subSrc = map.getSource("subbasins") as GeoJSONSource | undefined;
    if (subSrc) subSrc.setData(asAreaFeatureCollection(areaEstudio));

    const vegSrc = map.getSource("vegetation") as GeoJSONSource | undefined;
    if (vegSrc) vegSrc.setData(vegetationZones ?? EMPTY_FC);

    const concSrc = map.getSource("concesiones") as GeoJSONSource | undefined;
    if (concSrc) concSrc.setData(concesiones ?? EMPTY_FC);

    const contoursSrc = map.getSource("contours") as GeoJSONSource | undefined;
    if (contoursSrc) contoursSrc.setData(contours ?? EMPTY_FC);

    const comunSrc = map.getSource("comunidades") as GeoJSONSource | undefined;
    if (comunSrc) comunSrc.setData(comunidades ?? EMPTY_FC);

    const peruBoundarySrc = map.getSource("peru-boundary") as GeoJSONSource | undefined;
    if (peruBoundarySrc)
      peruBoundarySrc.setData(
        peruBoundary
          ? { type: "FeatureCollection", features: [peruBoundary] }
          : EMPTY_FC,
      );

    const deptSrc = map.getSource("departamentos") as GeoJSONSource | undefined;
    const provSrc = map.getSource("provincias") as GeoJSONSource | undefined;
    const distSrc = map.getSource("distritos") as GeoJSONSource | undefined;
    if (deptSrc) {
      deptSrc.setData(boundaryData.departamentos ?? EMPTY_FC);
    }
    if (provSrc) {
      provSrc.setData(boundaryData.provincias ?? EMPTY_FC);
    }
    if (distSrc) {
      distSrc.setData(boundaryData.distritos ?? EMPTY_FC);
    }

    const roadsSrc = map.getSource("roads") as GeoJSONSource | undefined;
    if (roadsSrc) roadsSrc.setData(vias ?? EMPTY_FC);

    if (map.getLayer("area-estudio-fill")) {
      map.setPaintProperty("area-estudio-fill", "fill-color", areaColor);
    }
    if (map.getLayer("area-estudio-line")) {
      map.setPaintProperty("area-estudio-line", "line-color", areaColor);
    }
  }, [geojson, districtMicrocuencas, strahlerCatchments, catchmentPoint, rivers, receptores, samplingStations, areaEstudio, areaEfectiva, areaColor, vegetationZones, concesiones, contours, peruBoundary, boundaryData, comunidades, vias]);

  // Separate effect specifically for boundary data updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    
    const deptSrc = map.getSource("departamentos") as GeoJSONSource | undefined;
    const provSrc = map.getSource("provincias") as GeoJSONSource | undefined;
    const distSrc = map.getSource("distritos") as GeoJSONSource | undefined;
    
    if (deptSrc) {
      deptSrc.setData(boundaryData.departamentos ?? EMPTY_FC);
    }
    if (provSrc) {
      provSrc.setData(boundaryData.provincias ?? EMPTY_FC);
    }
    if (distSrc) {
      distSrc.setData(boundaryData.distritos ?? EMPTY_FC);
    }
  }, [boundaryData]);

  // Reactively update the selected district microcuencas source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("district-microcuencas-selected") as GeoJSONSource | undefined;
    if (!src || !districtMicrocuencas) return;
    const selected: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: districtMicrocuencas.features.filter(
        (f) => selectedIds.has(Number(f.properties?.id)),
      ),
    };
    src.setData(selected);
  }, [selectedIds, districtMicrocuencas]);

  // Reactively update the selected strahler catchments source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("strahler-catchments-selected") as GeoJSONSource | undefined;
    if (!src || !strahlerCatchments) return;
    const selected: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: strahlerCatchments.features.filter(
        (f) => strahlerSelectedIds.has(Number(f.properties?.id)),
      ),
    };
    src.setData(selected);
  }, [strahlerSelectedIds, strahlerCatchments]);

  // Apply group visibility toggles to the underlying maplibre layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      for (const [group, layerIds] of Object.entries(LAYER_GROUPS)) {
        const visible = groupVisible[group as LayerGroup];
        for (const id of layerIds) {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
          }
        }
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [groupVisible]);

  // Apply station-kind visibility via a filter expression. Empty
  // selection (all off) falls back to "kind == nothing" → no features.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const visibleKinds = Object.entries(stationKindVisible)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const filter: maplibregl.FilterSpecification | null =
        visibleKinds.length === 0
          ? ["==", ["get", "kind"], "__none__"]
          : ["in", ["get", "kind"], ["literal", visibleKinds]];
      for (const id of ["sampling-stations-fill", "sampling-stations-label"]) {
        if (map.getLayer(id)) map.setFilter(id, filter);
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [stationKindVisible]);

  // Apply vegetation-class visibility via a filter expression.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const entries = Object.entries(vegClassVisible);
      const visibleCodes = entries.filter(([, v]) => v).map(([k]) => k);
      // Empty state = no user choices yet → show all (null removes the filter).
      // Only hide when the user has explicitly toggled every class off.
      const filter: maplibregl.FilterSpecification | null =
        entries.length === 0
          ? null
          : visibleCodes.length === 0
          ? ["==", ["get", "code"], "__none__"]
          : ["in", ["get", "code"], ["literal", visibleCodes]];
      for (const id of ["vegetation-fill", "vegetation-label"]) {
        if (map.getLayer(id)) map.setFilter(id, filter);
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [vegClassVisible]);

  // Toggle handlers
  const toggleGroup = (g: LayerGroup) =>
    setGroupVisible((prev) => ({ ...prev, [g]: !prev[g] }));
  const toggleStationKind = (k: string) =>
    setStationKindVisible((prev) => ({ ...prev, [k]: !prev[k] }));
  const toggleVegClass = (c: string) =>
    setVegClassVisible((prev) => ({ ...prev, [c]: !prev[c] }));

  const hasDistrictMicrocuencas = (districtMicrocuencas?.features.length ?? 0) > 0;
  const hasStrahlerCatchments = (strahlerCatchments?.features.length ?? 0) > 0;
  const hasCatchmentPoint = (catchmentPoint?.features.length ?? 0) > 0;
  const hasRivers = (rivers?.features.length ?? 0) > 0;
  const hasReceptores = (receptores?.features.length ?? 0) > 0;
  const hasStations = (samplingStations?.features.length ?? 0) > 0;
  const hasArea = areaEstudio !== null && areaEstudio !== undefined;
  const hasAreaEfectiva = areaEfectiva !== null && areaEfectiva !== undefined;
  const hasComponents = geojson.features.length > 0;
  const hasVegetation = (vegetationZones?.features.length ?? 0) > 0;
  const hasDepartamentos = (boundaryData.departamentos?.features.length ?? 0) > 0;
  const hasProvincias = (boundaryData.provincias?.features.length ?? 0) > 0;
  const hasDistritos = (boundaryData.distritos?.features.length ?? 0) > 0;
  const hasComunidades = (comunidades?.features.length ?? 0) > 0;
  const hasRoads = (vias?.features.length ?? 0) > 0;
  const hasConcesiones = (concesiones?.features.length ?? 0) > 0;
  const hasContours = (contours?.features.length ?? 0) > 0;
  const hasPeruBoundary = peruBoundary !== null && peruBoundary !== undefined;

  // Distinct station kinds present, in stable order, for the legend.
  const stationKinds = useMemo<string[]>(() => {
    if (!hasStations || !samplingStations) return [];
    const seen = new Set<string>();
    for (const f of samplingStations.features) {
      const k = f.properties?.kind;
      if (typeof k === "string") seen.add(k);
    }
    const order = ["aire", "ruido", "vibraciones",
                   "agua_superficial", "agua_subterranea",
                   "suelos", "sedimentos", "flora_fauna"];
    return [...seen].sort((a, b) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [hasStations, samplingStations]);

  // Distinct vegetation class codes present, in area-descending order.
  const vegetationClasses = useMemo<{ code: string; name: string; area_ha: number }[]>(() => {
    if (!hasVegetation || !vegetationZones) return [];
    const byClass = new Map<string, { name: string; area_ha: number }>();
    for (const f of vegetationZones.features) {
      const p = f.properties;
      if (!p) continue;
      const code = String(p.code ?? "");
      if (!code) continue;
      const existing = byClass.get(code);
      const area = Number(p.area_ha) || 0;
      if (existing) existing.area_ha += area;
      else byClass.set(code, { name: String(p.class_name || `Class ${code}`), area_ha: area });
    }
    return [...byClass.entries()]
      .map(([code, info]) => ({ code, ...info }))
      .sort((a, b) => b.area_ha - a.area_ha);
  }, [hasVegetation, vegetationZones]);

  // No effect needed to seed defaults — the legend reads
  // `stationKindVisible[k] ?? true`, so any kind not yet in state is
  // treated as visible until the user toggles it.

  const areaStatusLabel =
    areaEstudioStatus === "approved"
      ? "Aprobada"
      : areaEstudioStatus === "superseded"
      ? "Reemplazada"
      : "Borrador";

  // ─── Área efectiva vertex editor ────────────────────────────────────
  // Self-contained: when `editingAreaEfectiva` is true, draws draggable
  // vertex handles + clickable midpoint handles on top of the persisted
  // área-efectiva polygon. All sources/layers/listeners are removed when
  // the editor turns off or the component unmounts.
  useEffect(() => {
    const map: MlMap | null = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!editingAreaEfectiva || !areaEfectiva) return;
    const seed = areaEfectiva.geometry as
      | GeoJSON.Polygon
      | GeoJSON.MultiPolygon;
    if (seed.type !== "Polygon" && seed.type !== "MultiPolygon") return;
    // After the guard, capture a non-null reference for closures below.
    const m: MlMap = map;

    // Deep clone so prop never mutates.
    const working: GeoJSON.Polygon | GeoJSON.MultiPolygon = JSON.parse(
      JSON.stringify(seed),
    );
    onAreaEfectivaGeomChange?.(working);

    type RingPath = { polyIdx: number; ringIdx: number };
    type Ring = { path: RingPath; coords: GeoJSON.Position[] };

    function getRings(): Ring[] {
      if (working.type === "Polygon") {
        return working.coordinates.map((coords, ringIdx) => ({
          path: { polyIdx: 0, ringIdx },
          coords,
        }));
      }
      const out: Ring[] = [];
      working.coordinates.forEach((poly, polyIdx) => {
        poly.forEach((coords, ringIdx) => {
          out.push({ path: { polyIdx, ringIdx }, coords });
        });
      });
      return out;
    }

    function setRing(path: RingPath, ring: GeoJSON.Position[]): void {
      if (working.type === "Polygon") {
        working.coordinates[path.ringIdx] = ring;
      } else {
        working.coordinates[path.polyIdx][path.ringIdx] = ring;
      }
    }

    function vertexFC(): GeoJSON.FeatureCollection<GeoJSON.Point> {
      const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
      for (const r of getRings()) {
        // Skip the closing vertex (same as the first) so we don't render it twice.
        for (let i = 0; i < r.coords.length - 1; i++) {
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: r.coords[i] },
            properties: {
              polyIdx: r.path.polyIdx,
              ringIdx: r.path.ringIdx,
              vertexIdx: i,
            },
          });
        }
      }
      return { type: "FeatureCollection", features };
    }

    function midpointFC(): GeoJSON.FeatureCollection<GeoJSON.Point> {
      const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
      for (const r of getRings()) {
        for (let i = 0; i < r.coords.length - 1; i++) {
          const [x1, y1] = r.coords[i];
          const [x2, y2] = r.coords[i + 1];
          features.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [(x1 + x2) / 2, (y1 + y2) / 2],
            },
            properties: {
              polyIdx: r.path.polyIdx,
              ringIdx: r.path.ringIdx,
              insertAfter: i,
            },
          });
        }
      }
      return { type: "FeatureCollection", features };
    }

    function refreshSources(): void {
      const vs = m.getSource("ae-editor-vertices") as
        | GeoJSONSource
        | undefined;
      const ms2 = m.getSource("ae-editor-midpoints") as
        | GeoJSONSource
        | undefined;
      vs?.setData(vertexFC());
      ms2?.setData(midpointFC());
      // Also reflect changes on the main área-efectiva layer.
      const efectivaSrc = m.getSource("area-efectiva") as
        | GeoJSONSource
        | undefined;
      efectivaSrc?.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: working,
            properties: {},
          },
        ],
      });
    }

    // ── Add sources & layers ────────────────────────────────────────
    m.addSource("ae-editor-vertices", {
      type: "geojson",
      data: vertexFC(),
    });
    m.addSource("ae-editor-midpoints", {
      type: "geojson",
      data: midpointFC(),
    });
    m.addLayer({
      id: "ae-editor-midpoints",
      type: "circle",
      source: "ae-editor-midpoints",
      paint: {
        "circle-radius": 5,
        "circle-color": "#16a34a",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.85,
      },
    });
    m.addLayer({
      id: "ae-editor-vertices",
      type: "circle",
      source: "ae-editor-vertices",
      paint: {
        "circle-radius": 7,
        "circle-color": "#0284c7",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });

    // ── Drag state ──────────────────────────────────────────────────
    type DragState = {
      polyIdx: number;
      ringIdx: number;
      vertexIdx: number;
    };
    let dragging: DragState | null = null;

    function onVertexMouseDown(e: maplibregl.MapMouseEvent): void {
      const feats = (e as unknown as { features?: { properties: unknown }[] })
        .features;
      if (!feats || feats.length === 0) return;
      // Shift+click = delete vertex
      if (e.originalEvent.shiftKey) {
        const p = feats[0].properties as {
          polyIdx: number;
          ringIdx: number;
          vertexIdx: number;
        };
        deleteVertex(p.polyIdx, p.ringIdx, p.vertexIdx);
        return;
      }
      e.preventDefault();
      const p = feats[0].properties as {
        polyIdx: number;
        ringIdx: number;
        vertexIdx: number;
      };
      dragging = {
        polyIdx: p.polyIdx,
        ringIdx: p.ringIdx,
        vertexIdx: p.vertexIdx,
      };
      m.getCanvas().style.cursor = "grabbing";
      m.dragPan.disable();
      m.on("mousemove", onMapMouseMove);
      m.once("mouseup", onMapMouseUp);
    }

    function onMapMouseMove(e: maplibregl.MapMouseEvent): void {
      if (!dragging) return;
      const rings = getRings();
      const ring = rings.find(
        (r) =>
          r.path.polyIdx === dragging!.polyIdx &&
          r.path.ringIdx === dragging!.ringIdx,
      );
      if (!ring) return;
      const newRing = ring.coords.slice();
      newRing[dragging.vertexIdx] = [e.lngLat.lng, e.lngLat.lat];
      // Keep the closing vertex synced if we moved the first.
      if (dragging.vertexIdx === 0) {
        newRing[newRing.length - 1] = [e.lngLat.lng, e.lngLat.lat];
      }
      setRing(ring.path, newRing);
      refreshSources();
    }

    function onMapMouseUp(): void {
      if (!dragging) return;
      dragging = null;
      m.getCanvas().style.cursor = "";
      m.dragPan.enable();
      m.off("mousemove", onMapMouseMove);
      onAreaEfectivaGeomChange?.(working);
    }

    function deleteVertex(
      polyIdx: number,
      ringIdx: number,
      vertexIdx: number,
    ): void {
      const rings = getRings();
      const ring = rings.find(
        (r) => r.path.polyIdx === polyIdx && r.path.ringIdx === ringIdx,
      );
      if (!ring) return;
      // A valid ring needs ≥ 4 points (3 distinct + closing).
      if (ring.coords.length <= 4) return;
      const newRing = ring.coords.slice();
      newRing.splice(vertexIdx, 1);
      // If we removed index 0, make the new first point the closing one.
      if (vertexIdx === 0) {
        newRing[newRing.length - 1] = newRing[0];
      }
      setRing(ring.path, newRing);
      refreshSources();
      onAreaEfectivaGeomChange?.(working);
    }

    function onMidpointClick(e: maplibregl.MapMouseEvent): void {
      const feats = (e as unknown as { features?: { properties: unknown }[] })
        .features;
      if (!feats || feats.length === 0) return;
      const p = feats[0].properties as {
        polyIdx: number;
        ringIdx: number;
        insertAfter: number;
      };
      const rings = getRings();
      const ring = rings.find(
        (r) => r.path.polyIdx === p.polyIdx && r.path.ringIdx === p.ringIdx,
      );
      if (!ring) return;
      const newRing = ring.coords.slice();
      newRing.splice(p.insertAfter + 1, 0, [e.lngLat.lng, e.lngLat.lat]);
      setRing(ring.path, newRing);
      refreshSources();
      onAreaEfectivaGeomChange?.(working);
    }

    function onVertexEnter(): void {
      m.getCanvas().style.cursor = "grab";
    }
    function onVertexLeave(): void {
      if (!dragging) m.getCanvas().style.cursor = "";
    }

    m.on("mousedown", "ae-editor-vertices", onVertexMouseDown);
    m.on("mouseenter", "ae-editor-vertices", onVertexEnter);
    m.on("mouseleave", "ae-editor-vertices", onVertexLeave);
    m.on("click", "ae-editor-midpoints", onMidpointClick);
    m.on("mouseenter", "ae-editor-midpoints", onVertexEnter);
    m.on("mouseleave", "ae-editor-midpoints", onVertexLeave);

    // ── Cleanup ─────────────────────────────────────────────────────
    return () => {
      m.off("mousedown", "ae-editor-vertices", onVertexMouseDown);
      m.off("mouseenter", "ae-editor-vertices", onVertexEnter);
      m.off("mouseleave", "ae-editor-vertices", onVertexLeave);
      m.off("click", "ae-editor-midpoints", onMidpointClick);
      m.off("mouseenter", "ae-editor-midpoints", onVertexEnter);
      m.off("mouseleave", "ae-editor-midpoints", onVertexLeave);
      m.off("mousemove", onMapMouseMove);
      m.dragPan.enable();
      m.getCanvas().style.cursor = "";

      if (m.getLayer("ae-editor-vertices"))
        m.removeLayer("ae-editor-vertices");
      if (m.getLayer("ae-editor-midpoints"))
        m.removeLayer("ae-editor-midpoints");
      if (m.getSource("ae-editor-vertices"))
        m.removeSource("ae-editor-vertices");
      if (m.getSource("ae-editor-midpoints"))
        m.removeSource("ae-editor-midpoints");

      // Restore main efectiva layer to the persisted (unedited) polygon.
      const efectivaSrc = m.getSource("area-efectiva") as
        | GeoJSONSource
        | undefined;
      efectivaSrc?.setData(asAreaFeatureCollection(areaEfectiva));
      onAreaEfectivaGeomChange?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAreaEfectiva, mapLoaded, areaEfectivaEditorResetKey]);

  return (
    <div
      ref={containerRef}
      className="relative h-[480px] w-full overflow-hidden rounded-lg border border-stone-200"
    >
      {/* Loading / error overlay — sits above the canvas, hidden once map loads */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-50">
          <span className="text-sm text-stone-400">Cargando mapa…</span>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-50 px-6">
          <p className="text-center text-sm text-red-600">
            <span className="font-semibold">Error al cargar el mapa:</span><br />{mapError}
          </p>
        </div>
      )}
      <BasemapSelector value={basemap} onChange={setBasemap} />
      <MapLegend
        items={[
          hasArea
            ? {
                label: `Área de estudio (${areaStatusLabel})`,
                swatch: "area" as const,
                color: areaColor,
                visible: groupVisible.area,
                onToggle: () => toggleGroup("area"),
              }
            : null,
          hasAreaEfectiva
            ? {
                label: `Área efectiva (${formatHa(areaEfectiva?.properties?.area_ha)} ha)`,
                swatch: "dashedLine" as const,
                color: "#e11d48",
                visible: groupVisible.efectiva,
                onToggle: () => toggleGroup("efectiva"),
              }
            : null,
          hasCatchmentPoint
            ? {
                label: "Puntos de control (aguas arriba / abajo)",
                swatch: "dot" as const,
                color: "#d97706",
                visible: groupVisible.catchmentPoint,
                onToggle: () => toggleGroup("catchmentPoint"),
              }
            : null,
          hasRivers
            ? {
                label: "Ríos (IGN 1:100k)",
                swatch: "line" as const,
                color: "#1d4ed8",
                visible: groupVisible.rivers,
                onToggle: () => toggleGroup("rivers"),
              }
            : null,
          hasContours
            ? {
                label: "Curvas de nivel (IGN 1:100k)",
                swatch: "line" as const,
                color: "#78716c",
                visible: groupVisible.contornos,
                onToggle: () => toggleGroup("contornos"),
              }
            : null,
          hasPeruBoundary
            ? {
                label: "Límite Perú",
                swatch: "line" as const,
                color: "#0c4a6e",
                visible: groupVisible.peruOutline,
                onToggle: () => toggleGroup("peruOutline"),
              }
            : null,
          hasConcesiones
            ? {
                label: "Concesiones mineras",
                swatch: "dashedLine" as const,
                color: "#b45309",
                visible: groupVisible.concesiones,
                onToggle: () => toggleGroup("concesiones"),
              }
            : null,
          hasReceptores
            ? {
                label: "Receptores sensibles (CCPP)",
                swatch: "dot" as const,
                color: "#ec4899",
                visible: groupVisible.receptores,
                onToggle: () => toggleGroup("receptores"),
              }
            : null,
          hasDepartamentos
            ? {
                label: "Departamentos",
                swatch: "area" as const,
                color: "#4338ca",
                visible: groupVisible.departments,
                onToggle: () => toggleGroup("departments"),
              }
            : null,
          hasProvincias
            ? {
                label: "Provincias",
                swatch: "area" as const,
                color: "#7c3aed",
                visible: groupVisible.provinces,
                onToggle: () => toggleGroup("provinces"),
              }
            : null,
          hasDistritos
            ? {
                label: "Distritos",
                swatch: "area" as const,
                color: "#8b5cf6",
                visible: groupVisible.districts,
                onToggle: () => toggleGroup("districts"),
              }
            : null,
          hasComunidades
            ? {
                label: "Comunidades campesinas",
                swatch: "area" as const,
                color: "#b45309",
                visible: groupVisible.comunidades,
                onToggle: () => toggleGroup("comunidades"),
              }
            : null,
          hasRoads
            ? {
                label: "Red vial MTC",
                swatch: "line" as const,
                color: "#dc2626",
                visible: groupVisible.roads,
                onToggle: () => toggleGroup("roads"),
              }
            : null,
          ...stationKinds.map((k): LegendItem => ({
            label: `Estación · ${SAMPLING_KIND_LABEL[k] ?? k}`,
            swatch: "dot" as const,
            color: STATION_COLORS[k] ?? STATION_COLORS.default,
            visible: stationKindVisible[k] ?? true,
            onToggle: () => toggleStationKind(k),
          })),
          hasComponents
            ? {
                label: "Componentes",
                swatch: "componentDots" as const,
                colors: COMPONENT_LEGEND_DOTS,
                visible: groupVisible.components,
                onToggle: () => toggleGroup("components"),
              }
            : null,
          ...vegetationClasses.map((vc): LegendItem => ({
            label: `${vc.name} (${vc.area_ha.toFixed(1)} ha)`,
            swatch: "dot" as const,
            color: VEGETATION_CLASS_COLORS[vc.code] ?? "#78909c",
            visible: vegClassVisible[vc.code] ?? true,
            onToggle: () => toggleVegClass(vc.code),
          })),
        ].filter((x): x is LegendItem => x !== null)}
      />
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────────────

const COMPONENT_LEGEND_DOTS: { label: string; color: string }[] = [
  { label: "Plataforma", color: COLOR_BY_TIPO.plataforma },
  { label: "Acceso", color: COLOR_BY_TIPO.acceso },
  { label: "Campamento", color: COLOR_BY_TIPO.campamento },
  { label: "Tajo", color: COLOR_BY_TIPO.tajo },
  { label: "Otro", color: COLOR_BY_TIPO.default },
];

interface LegendItemBase {
  label: string;
  visible: boolean;
  onToggle: () => void;
}

type LegendItem =
  | (LegendItemBase & { swatch: "area"; color: string })
  | (LegendItemBase & { swatch: "line"; color: string })
  | (LegendItemBase & { swatch: "dashedLine"; color: string })
  | (LegendItemBase & { swatch: "dot"; color: string })
  | (LegendItemBase & { swatch: "componentDots"; colors: { label: string; color: string }[] });

const SAMPLING_KIND_LABEL: Record<string, string> = {
  aire: "Aire",
  ruido: "Ruido",
  vibraciones: "Vibraciones",
  agua_superficial: "Agua superficial",
  agua_subterranea: "Agua subterránea",
  suelos: "Suelos",
  sedimentos: "Sedimentos",
  flora_fauna: "Flora y fauna",
};

function LegendSwatch({ item }: { item: LegendItem }) {
  switch (item.swatch) {
    case "area":
      return (
        <span
          aria-hidden
          className="inline-block h-3 w-5 rounded-sm border-2"
          style={{
            borderColor: item.color,
            backgroundColor: `${item.color}1A`, // 10% alpha
          }}
        />
      );
    case "line":
      return (
        <span
          aria-hidden
          className="inline-block h-[2px] w-5 rounded-full"
          style={{ backgroundColor: item.color }}
        />
      );
    case "dashedLine":
      return (
        <span
          aria-hidden
          className="inline-block h-[2px] w-5"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, ${item.color} 0 4px, transparent 4px 7px)`,
          }}
        />
      );
    case "dot":
      return (
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full ring-1 ring-white"
          style={{ backgroundColor: item.color }}
        />
      );
    case "componentDots":
      return (
        <span aria-hidden className="inline-flex items-center gap-0.5">
          {item.colors.map((c) => (
            <span
              key={c.label}
              title={c.label}
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white"
              style={{ backgroundColor: c.color }}
            />
          ))}
        </span>
      );
  }
}

function BasemapSelector({
  value,
  onChange,
}: {
  value: BasemapKey;
  onChange: (b: BasemapKey) => void;
}) {
  const opts: BasemapKey[] = ["default", "topo", "satellite"];
  return (
    <div
      role="radiogroup"
      aria-label="Fondo del mapa"
      className="absolute left-3 top-3 z-10 flex rounded-md border border-stone-200 bg-white/95 p-0.5 text-xs shadow-sm backdrop-blur"
    >
      {opts.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={
            "rounded px-2 py-1 transition-colors " +
            (value === opt
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:bg-stone-100")
          }
        >
          {BASEMAP_LABEL[opt]}
        </button>
      ))}
    </div>
  );
}


function MapLegend({ items }: { items: LegendItem[] }) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;
  const visibleCount = items.filter((i) => i.visible).length;
  return (
    <div
      role="region"
      aria-label="Leyenda del mapa"
      className="absolute left-3 bottom-3 z-10 max-w-[14rem] rounded-md border border-stone-200 bg-white/95 text-xs shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-stone-50"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          Capas{' '}
          <span className="font-normal normal-case text-stone-400">
            ({visibleCount}/{items.length})
          </span>
        </span>
        <svg
          aria-hidden
          className={`h-3 w-3 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 5 L6 8 L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="max-h-72 space-y-0.5 overflow-y-auto border-t border-stone-200 px-2.5 pb-2 pt-1.5">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={item.onToggle}
                aria-pressed={item.visible}
                className={
                  "flex w-full items-center gap-2 rounded px-1 py-[3px] text-left transition-opacity hover:bg-stone-100 " +
                  (item.visible ? "opacity-100" : "opacity-40")
                }
              >
                <LegendSwatch item={item} />
                <span className={"truncate " + (item.visible ? "text-stone-700" : "text-stone-500 line-through")}>
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
