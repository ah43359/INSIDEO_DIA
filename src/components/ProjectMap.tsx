"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Basemaps ─────────────────────────────────────────────────────────
// Three options:
//   default   — Carto Voyager vector tiles (current).
//   topo      — ESRI World Topo (raster, includes shaded relief).
//   satellite — ESRI World Imagery (raster, satellite).
//
// ESRI tile services are free for low-volume use; attribution required.

type BasemapKey = "default" | "topo" | "satellite";

const BASEMAPS: Record<BasemapKey, string | StyleSpecification> = {
  default: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
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
  microcuencas:["microcuencas-fill", "microcuencas-line", "microcuencas-label"],
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
  districts:    ["distritos-fill", "distritos-line"],
  // Roads
  roads:        ["roads-line"],
  // sampling-station kinds are filtered via filter expression rather
  // than separate layers (see toggleStationKindFilter).
} as const;

type LayerGroup = keyof typeof LAYER_GROUPS;

interface ProjectMapProps {
  geojson: GeoJSON.FeatureCollection;
  /** Microcuencas (Pfafstetter UH) that intersect the project. Optional. */
  microcuencas?: GeoJSON.FeatureCollection | null;
  /** Rivers near the project (HydroRIVERS, filtered by RPC). Optional. */
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
  /** Vegetation zones derived from ESA WorldCover. Optional. */
  vegetationZones?: GeoJSON.FeatureCollection | null;
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

// Class colors keyed by string class_code. Numeric ESA WorldCover codes
// stay as their string form ("10", "20", …); MINAM Simbolo codes are
// listed below — each ecosystem gets a distinct hue.
const VEGETATION_CLASS_COLORS: Record<string, string> = {
  // ESA WorldCover numeric codes
  "10": "#1b5e20",  // Tree cover — dark green
  "20": "#4caf50",  // Shrubland — medium green
  "30": "#cddc39",  // Grassland — yellow-green
  "40": "#ff9800",  // Cropland — orange
  "80": "#0288d1",  // Permanent water — blue
  "90": "#8bc34a",  // Herbaceous wetland — light green
  "95": "#009688",  // Mangroves — teal
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
  microcuencas,
rivers,
  receptores,
  samplingStations,
  areaEstudio,
  areaEstudioStatus,
  areaEfectiva,
  vegetationZones,
}: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [basemap, setBasemap] = useState<BasemapKey>("default");

  // Layer-group visibility (true = visible). Default everything on.
  const [groupVisible, setGroupVisible] = useState<Record<LayerGroup, boolean>>({
    area: true,
    efectiva: true,
    subbasins: true,
    microcuencas: true,
    rivers: true,
    receptores: true,
    components: true,
    vegetation: true,
    departments: true,
    provinces: true,
    districts: true,
    roads: true,
  });
  // Sampling-station kinds: each kind togglable independently.
  const [stationKindVisible, setStationKindVisible] = useState<Record<string, boolean>>({});
  // Vegetation classes: each class togglable independently.
  const [vegClassVisible, setVegClassVisible] = useState<Record<string, boolean>>({});

  // Client-side loaded boundaries from GitHub
  const [boundaryData, setBoundaryData] = useState<{
    departamentos: GeoJSON.FeatureCollection | null;
    provincias: GeoJSON.FeatureCollection | null;
    distritos: GeoJSON.FeatureCollection | null;
  }>({
    departamentos: null,
    provincias: null,
    distritos: null,
  });

  const BOUNDARY_URLS = {
    departamentos: "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_departamental_simple.geojson",
    provincias: "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_provincial_simple.geojson",
    distritos: "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_distrital_simple.geojson",
  };

  useEffect(() => {
    const loadBoundaries = async () => {
      try {
        const [deptRes, provRes, distRes] = await Promise.all([
          fetch(BOUNDARY_URLS.departamentos),
          fetch(BOUNDARY_URLS.provincias),
          fetch(BOUNDARY_URLS.distritos),
        ]);
        
        // Log fetch status for debugging
        console.log('Boundary fetch status:', {
          dept: deptRes.status,
          prov: provRes.status,
          dist: distRes.status,
        });
        
        const [dept, prov, dist] = await Promise.all([
          deptRes.ok ? deptRes.json() : null,
          provRes.ok ? provRes.json() : null,
          distRes.ok ? distRes.json() : null,
        ]);
        
        // Log loaded data shape
        console.log('Boundary data loaded:', {
          dept: dept?.features?.length,
          prov: prov?.features?.length,
          dist: dist?.features?.length,
        });
        
        setBoundaryData({
          departamentos: dept,
          provincias: prov,
          distritos: dist,
        });
      } catch (e) {
        console.error("Failed to load boundaries:", e);
      }
    };

    loadBoundaries();
  }, []);

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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAPS[basemap],
      center: [-75, -10],
      zoom: 5,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

    map.on("load", () => {
      // Layer order (bottom → top): microcuencas, área de estudio,
      // rivers, components. Rivers sit *above* the área de estudio fill
      // so they remain visible inside the polygon.
      map.addSource("microcuencas", {
        type: "geojson",
        data: microcuencas ?? EMPTY_FC,
      });
      map.addLayer({
        id: "microcuencas-fill",
        type: "fill",
        source: "microcuencas",
        paint: {
          "fill-color": "#0ea5e9",
          "fill-opacity": 0.08,
        },
      });
      map.addLayer({
        id: "microcuencas-line",
        type: "line",
        source: "microcuencas",
        paint: {
          "line-color": "#0369a1",
          "line-width": 1,
          "line-dasharray": [3, 2],
        },
      });
      map.addLayer({
        id: "microcuencas-label",
        type: "symbol",
        source: "microcuencas",
        layout: {
          "text-field": ["get", "pfafstetter"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#0369a1",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
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

      // Vegetation zones — ESA WorldCover classes, colored by class code.
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

      // Roads — from OpenStreetMap (not yet loaded - placeholder)
      // Will be added when roads data is available
      /*
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
            ["get", "tipo"],
            "primary", "#dc2626",
            "secondary", "#ea580c",
            "tertiary", "#f59e0b",
            "trunk", "#16a34a",
            "#9ca3af",  // default gray
          ],
          "line-width": [
            "match",
            ["get", "tipo"],
            "primary", 4,
            "trunk", 3,
            "secondary", 2.5,
            "tertiary", 2,
            1,
          ],
        },
      });
      */

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

      // Rivers — width scales with strahler order so main channels read
      // through. Tributaries feather into hairlines at low zoom.
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
            ["coalesce", ["get", "strahler_order"], 1],
            1, 0.5,
            3, 1.0,
            5, 1.8,
            7, 2.8,
            9, 4.0,
          ],
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
      if (!extended && microcuencas?.features.length) {
        for (const f of microcuencas.features) {
          extendFromGeometry(f.geometry);
        }
      }
      if (!extended) {
        for (const f of geojson.features) {
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

      // Microcuenca popup (Pfafstetter + nombre)
      map.on("click", "microcuencas-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        const areaKm2 = props.area_km2 != null ? Number(props.area_km2).toFixed(1) : null;
        const html = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">UH ${props.pfafstetter}</div>
            ${props.nombre ? `<div>${props.nombre}</div>` : ""}
            <div>Nivel ${props.nivel}</div>
            ${areaKm2 ? `<div>${areaKm2} km²</div>` : ""}
          </div>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
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
            <div>Código ESA: ${props.class_code}</div>
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
      map.remove();
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

    const cuencasSrc = map.getSource("microcuencas") as GeoJSONSource | undefined;
    if (cuencasSrc) cuencasSrc.setData(microcuencas ?? EMPTY_FC);

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

    const deptSrc = map.getSource("departamentos") as GeoJSONSource | undefined;
    const provSrc = map.getSource("provincias") as GeoJSONSource | undefined;
    const distSrc = map.getSource("distritos") as GeoJSONSource | undefined;
    
    console.log('Updating boundary sources:', {
      deptSrc: !!deptSrc,
      provSrc: !!provSrc,
      distSrc: !!distSrc,
      deptData: boundaryData.departamentos?.features?.length,
      provData: boundaryData.provincias?.features?.length,
      distData: boundaryData.distritos?.features?.length,
    });
    
    if (deptSrc) {
      deptSrc.setData(boundaryData.departamentos ?? EMPTY_FC);
    }
    if (provSrc) {
      provSrc.setData(boundaryData.provincias ?? EMPTY_FC);
    }
    if (distSrc) {
      distSrc.setData(boundaryData.distritos ?? EMPTY_FC);
    }

    // Roads source placeholder (not yet loaded)
    // const roadsSrc = map.getSource("roads") as GeoJSONSource | undefined;

    if (map.getLayer("area-estudio-fill")) {
      map.setPaintProperty("area-estudio-fill", "fill-color", areaColor);
    }
    if (map.getLayer("area-estudio-line")) {
      map.setPaintProperty("area-estudio-line", "line-color", areaColor);
    }
  }, [geojson, microcuencas, rivers, receptores, samplingStations, areaEstudio, areaEfectiva, areaColor, vegetationZones, boundaryData]);

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

  const hasMicrocuencas = (microcuencas?.features.length ?? 0) > 0;
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
  const hasRoads = false; // Roads not loaded yet

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

  return (
    <div
      ref={containerRef}
      className="relative h-[480px] w-full overflow-hidden rounded-lg border border-stone-200"
    >
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
                label: `Área efectiva (${
                  areaEfectiva?.properties?.area_ha?.toLocaleString
                    ? Number(areaEfectiva.properties.area_ha).toLocaleString(
                        "es-PE",
                        { maximumFractionDigits: 1 },
                      )
                    : "—"
                } ha)`,
                swatch: "dashedLine" as const,
                color: "#e11d48",
                visible: groupVisible.efectiva,
                onToggle: () => toggleGroup("efectiva"),
              }
            : null,
          hasArea
            ? {
                label: "Sub-cuencas calculadas (D8)",
                swatch: "dashedLine" as const,
                color: "#059669",
                visible: groupVisible.subbasins,
                onToggle: () => toggleGroup("subbasins"),
              }
            : null,
          hasMicrocuencas
            ? {
                label: "Microcuencas (UH ANA)",
                swatch: "dashedLine" as const,
                color: "#0369a1",
                visible: groupVisible.microcuencas,
                onToggle: () => toggleGroup("microcuencas"),
              }
            : null,
          hasRivers
            ? {
                label: "Ríos (HydroRIVERS)",
                swatch: "line" as const,
                color: "#1d4ed8",
                visible: groupVisible.rivers,
                onToggle: () => toggleGroup("rivers"),
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
  if (items.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Leyenda del mapa"
      className="absolute left-3 bottom-3 z-10 max-w-[16rem] rounded-md border border-stone-200 bg-white/95 p-2.5 text-xs shadow-sm backdrop-blur"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
        Capas <span className="font-normal normal-case">(click para ocultar)</span>
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onToggle}
              aria-pressed={item.visible}
              className={
                "flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-opacity hover:bg-stone-100 " +
                (item.visible ? "opacity-100" : "opacity-40")
              }
            >
              <LegendSwatch item={item} />
              <span className={item.visible ? "text-stone-700" : "text-stone-500 line-through"}>
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
