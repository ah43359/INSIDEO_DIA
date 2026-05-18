// One-shot CLI: convert INEI 2023 shapefiles (Departamental, Provincial,
// Distrital) to simplified GeoJSON and write into public/data/.
//
// Usage:
//   npx tsx scripts/convert-inei-boundaries.ts
//
// Output (written to public/data/):
//   inei_departamentos_2023.geojson
//   inei_provincias_2023.geojson
//   inei_distritos_2023.geojson

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { read as readShapefile } from "shapefile";
import simplify from "simplify-js";

const SHP_DIR = "E:/GIS/data/Limites Politicos INEI 2023";
const OUT_DIR = join(process.cwd(), "public", "data");

type Point = { x: number; y: number };

// Tolerance in WGS84 degrees. Higher = simpler/smaller file.
// ~0.01° ≈ 1 km at the equator.
const TOLERANCE: Record<string, number> = {
  departamentos: 0.02,
  provincias: 0.01,
  distritos: 0.005,
};

function coordToPoint(c: number[]): Point {
  return { x: c[0], y: c[1] };
}

function pointToCoord(p: Point): number[] {
  return [p.x, p.y];
}

function simplifyRing(ring: number[][], tol: number): number[][] {
  if (ring.length < 4) return ring;
  const pts = ring.map(coordToPoint);
  const simplified = simplify(pts, tol, true);
  const result = simplified.map(pointToCoord);
  if (result.length >= 2) {
    const first = result[0];
    const last = result[result.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      result.push([first[0], first[1]]);
    }
  }
  return result;
}

function simplifyPolygon(coords: number[][][], tol: number): number[][][] {
  return coords.map((ring) => simplifyRing(ring, tol));
}

function simplifyGeometry(geom: GeoJSON.Geometry, tol: number): GeoJSON.Geometry {
  if (geom.type === "Polygon") {
    return { type: "Polygon", coordinates: simplifyPolygon(geom.coordinates, tol) };
  }
  if (geom.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geom.coordinates.map((p) => simplifyPolygon(p, tol)) };
  }
  return geom;
}

const FILES = [
  { key: "departamentos", name: "Departamental INEI 2023", out: "inei_departamentos_2023.geojson" },
  { key: "provincias", name: "Provincial INEI 2023", out: "inei_provincias_2023.geojson" },
  { key: "distritos", name: "Distrital INEI 2023", out: "inei_distritos_2023.geojson" },
];

async function main() {
  for (const { key, name, out } of FILES) {
    const shpPath = join(SHP_DIR, `${name}.shp`);
    const geojson = await readShapefile(shpPath) as GeoJSON.FeatureCollection;

    const tol = TOLERANCE[key];
    for (const f of geojson.features) {
      if (f.geometry) {
        f.geometry = simplifyGeometry(f.geometry, tol);
      }

      // Normalise property names
      const p = f.properties as Record<string, unknown> ?? {};
      p.departamento = p.DEPARTAMEN;
      p.provincia = p.PROVINCIA;
      p.distrito = p.DISTRITO;
      p.ccdd = p.CCDD;
      p.ccpp = p.CCPP;
      p.ccdi = p.CCDI;
      p.ubigeo = p.UBIGEO;
    }

    const outPath = join(OUT_DIR, out);
    await writeFile(outPath, JSON.stringify(geojson), "utf-8");

    const mb = (Buffer.byteLength(JSON.stringify(geojson), "utf-8") / 1024 / 1024).toFixed(1);
    console.log(`✓ ${out}  —  ${geojson.features.length} features, ${mb} MB`);
  }
}

main().catch((err) => {
  console.error("Conversion failed:", err);
  process.exit(1);
});
