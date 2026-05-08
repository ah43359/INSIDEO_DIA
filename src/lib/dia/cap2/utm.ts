// UTM ↔ lat/lon and Peru basin lookup.
//
// Ported from the standalone template at
// C:\Users\ahija\Desktop\INSIDEO\CODE\eia-chapter2-description-template.html
// (lines 21–84). For lon/lat → UTM the existing `toUtm` helper in
// `src/lib/pdt/helpers.ts` is preferred (uses proj4 for accuracy); this file
// covers the inverse direction the template needs for basin auto-detect.

import type { UtmZone } from "./state";

export interface PeruBasin {
  readonly name: string;
  readonly bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number };
}

export const PERU_BASINS: readonly PeruBasin[] = [
  { name: "Cuenca del Río Sama", bounds: { latMin: -17.95, latMax: -17.30, lonMin: -70.40, lonMax: -69.50 } },
  { name: "Cuenca del Río Locumba", bounds: { latMin: -17.55, latMax: -17.10, lonMin: -70.70, lonMax: -69.65 } },
  { name: "Cuenca del Río Caplina", bounds: { latMin: -18.10, latMax: -17.60, lonMin: -70.30, lonMax: -69.80 } },
  { name: "Cuenca del Río Osmore-Moquegua", bounds: { latMin: -17.35, latMax: -16.90, lonMin: -71.20, lonMax: -70.15 } },
  { name: "Cuenca del Río Tambo", bounds: { latMin: -16.60, latMax: -16.00, lonMin: -71.50, lonMax: -70.20 } },
  { name: "Cuenca del Río Majes-Camaná", bounds: { latMin: -16.45, latMax: -15.20, lonMin: -72.80, lonMax: -71.30 } },
  { name: "Cuenca del Río Chili", bounds: { latMin: -16.55, latMax: -16.15, lonMin: -71.80, lonMax: -71.20 } },
  { name: "Cuenca del Río Ocoña", bounds: { latMin: -15.80, latMax: -14.80, lonMin: -73.50, lonMax: -72.10 } },
  { name: "Cuenca del Lago Titicaca", bounds: { latMin: -17.30, latMax: -14.90, lonMin: -70.50, lonMax: -68.70 } },
  { name: "Cuenca del Río Ilave", bounds: { latMin: -16.90, latMax: -16.10, lonMin: -70.30, lonMax: -69.30 } },
  { name: "Cuenca del Río Coata", bounds: { latMin: -15.90, latMax: -15.10, lonMin: -70.60, lonMax: -69.90 } },
  { name: "Cuenca del Río Ramis", bounds: { latMin: -15.40, latMax: -14.30, lonMin: -70.70, lonMax: -69.50 } },
  { name: "Cuenca del Río Vilcanota-Urubamba", bounds: { latMin: -14.60, latMax: -12.50, lonMin: -73.00, lonMax: -71.00 } },
  { name: "Cuenca del Río Apurímac", bounds: { latMin: -15.00, latMax: -12.50, lonMin: -73.80, lonMax: -72.00 } },
  { name: "Cuenca del Río Mantaro", bounds: { latMin: -12.80, latMax: -10.90, lonMin: -76.50, lonMax: -74.20 } },
  { name: "Cuenca del Río Huallaga", bounds: { latMin: -10.50, latMax: -6.30, lonMin: -77.00, lonMax: -75.00 } },
  { name: "Cuenca del Río Marañón", bounds: { latMin: -10.50, latMax: -4.50, lonMin: -78.50, lonMax: -75.00 } },
  { name: "Cuenca del Río Santa", bounds: { latMin: -10.20, latMax: -8.10, lonMin: -78.60, lonMax: -77.10 } },
  { name: "Cuenca del Río Rímac", bounds: { latMin: -12.10, latMax: -11.60, lonMin: -76.80, lonMax: -76.50 } },
  { name: "Cuenca del Río Cañete", bounds: { latMin: -13.20, latMax: -12.40, lonMin: -76.50, lonMax: -75.60 } },
  { name: "Cuenca del Río Ica", bounds: { latMin: -14.80, latMax: -13.60, lonMin: -76.00, lonMax: -75.00 } },
  { name: "Cuenca del Río Piura", bounds: { latMin: -5.60, latMax: -4.60, lonMin: -80.80, lonMax: -79.50 } },
  { name: "Cuenca del Río Chira", bounds: { latMin: -5.10, latMax: -3.80, lonMin: -80.80, lonMax: -79.20 } },
  { name: "Cuenca del Río Chancay-Lambayeque", bounds: { latMin: -7.00, latMax: -6.10, lonMin: -80.00, lonMax: -79.00 } },
  { name: "Cuenca del Río Jequetepeque", bounds: { latMin: -7.60, latMax: -7.00, lonMin: -79.80, lonMax: -78.60 } },
  { name: "Cuenca del Río Chicama", bounds: { latMin: -8.20, latMax: -7.40, lonMin: -79.50, lonMax: -78.60 } },
  { name: "Cuenca del Río Moche", bounds: { latMin: -8.30, latMax: -7.80, lonMin: -79.40, lonMax: -78.50 } },
];

const UTM_CENTRAL_MERIDIANS: Readonly<Record<UtmZone, number>> = {
  "17S": -81,
  "18S": -75,
  "19S": -69,
};

export interface LatLon {
  lat: number;
  lon: number;
}

export function utmToLatLon(easting: number, northing: number, zone: UtmZone): LatLon {
  const k0 = 0.9996;
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const e1sq = 2 * f - f * f;
  const lon0 = (UTM_CENTRAL_MERIDIANS[zone] * Math.PI) / 180;
  const x = (easting - 500000) / k0;
  const y = (northing - 10000000) / k0;
  const M = y;
  const mu = M / (a * (1 - e1sq / 4 - (3 * e1sq * e1sq) / 64 - (5 * e1sq * e1sq * e1sq) / 256));
  const e1 = (1 - Math.sqrt(1 - e1sq)) / (1 + Math.sqrt(1 - e1sq));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);
  const sinPhi = Math.sin(phi1);
  const cosPhi = Math.cos(phi1);
  const tanPhi = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e1sq * sinPhi * sinPhi);
  const T1 = tanPhi * tanPhi;
  const C1 = (e1sq / (1 - e1sq)) * cosPhi * cosPhi;
  const R1 = (a * (1 - e1sq)) / Math.pow(1 - e1sq * sinPhi * sinPhi, 1.5);
  const D = x / N1;
  const lat =
    phi1 -
    ((N1 * tanPhi) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e1sq / (1 - e1sq))) * D * D * D * D) / 24);
  const lon =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e1sq / (1 - e1sq)) + 24 * T1 * T1) *
        D *
        D *
        D *
        D *
        D) /
        120) /
      cosPhi;
  return { lat: (lat * 180) / Math.PI, lon: (lon * 180) / Math.PI };
}

export interface BasinResult extends LatLon {
  basin: string | null;
}

export function findBasin(easting: number, northing: number, zone: UtmZone): BasinResult {
  const { lat, lon } = utmToLatLon(easting, northing, zone);
  const found = PERU_BASINS.find(
    (b) =>
      lat >= b.bounds.latMin &&
      lat <= b.bounds.latMax &&
      lon >= b.bounds.lonMin &&
      lon <= b.bounds.lonMax,
  );
  return { lat, lon, basin: found ? found.name : null };
}

export function utmZoneFromNumber(zone: number | null | undefined): UtmZone {
  if (zone === 17) return "17S";
  if (zone === 18) return "18S";
  return "19S";
}
