// Seeds the Andino sample project (if not already seeded) and creates
// monitoring stations at sensitive receptors:
//   - Air + noise co-located at centros poblados / communities
//   - Water quality upstream / downstream of the area efectiva
//
// Usage:
//   npx tsx scripts/seed-andino-stations.ts

import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function insertStation(
  client: Client,
  projectId: string,
  code: string,
  kind: string,
  lon: number,
  lat: number,
  rationale: string,
  campaign: string,
) {
  return client.query(
    `INSERT INTO project_sampling_stations
      (project_id, status, discipline, kind, station_code, geom,
       rationale, campaign, generated_by, generated_at)
     VALUES ($1, 'draft', 'fisico', $2, $3,
       ST_SetSRID(ST_MakePoint($4, $5), 4326),
       $6, $7, 'manual', now())`,
    [projectId, kind, code, lon, lat, rationale, campaign],
  );
}

interface StationDef {
  code: string;
  kind: string;
  lon: number;
  lat: number;
  rationale: string;
  campaign: string;
}

interface ProjectIdRow {
  id: string;
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // 1. Seed project if not already
  const { rows: existing } = await client.query<ProjectIdRow>(
    "SELECT id FROM projects WHERE nombre_proyecto = 'Proyecto Andino'",
  );

  if (existing.length === 0) {
    const seedPath = join("E:", "Architecture", "supabase", "seed_andino.sql");
    const seedSql = readFileSync(seedPath, "utf8");
    await client.query(seedSql);
    console.log("✓ Andino project seeded");
  }

  // Grab the project ID (might have been seeded just now or before)
  const { rows: proj } = await client.query<ProjectIdRow>(
    "SELECT id FROM projects WHERE nombre_proyecto = 'Proyecto Andino'",
  );
  const projectId = proj[0].id;

  // 2. Delete old stations so we can recreate them properly
  const { rowCount: deleted } = await client.query(
    "DELETE FROM project_sampling_stations WHERE project_id = $1",
    [projectId],
  );
  if (deleted && deleted > 0) console.log(`  Deleted ${deleted} old stations`);

  // 3. Define all stations
  //
  // Geography:
  //   Components cluster around -77.146, -9.677 (platforms, access, camp).
  //   San Marcos town is ~1.5 km NW at -77.157, -9.662.
  //   Río Mosna passes ~355 m NE of components (IGN 1:100k stream data).
  //   Flow direction: SE → NW (toward the Pacific).
  //   Caseríos / agricultural settlements lie between the project and town.
  //
  // Sensitive receptors (co-located air + noise):
  //   SR-01: San Marcos town — principal centro poblado
  //   SR-02: Caserío agrícola en el valle — settlement between project and town
  //
  // Water quality (Río Mosna):
  //   WQ-01: ~500 m upstream (SE) on the river
  //   WQ-02: ~500 m downstream (NW) on the river

  const stations: StationDef[] = [
    // ── Sensitive Receptor 01: San Marcos town ───────────────────────────
    {
      code: "AQ-01",
      kind: "aire",
      lon: -77.157,
      lat: -9.662,
      rationale: "Receptor sensible — centro poblado San Marcos (zona urbana)",
      campaign: "linea_base",
    },
    {
      code: "N-01",
      kind: "ruido",
      lon: -77.157,
      lat: -9.662,
      rationale: "Receptor sensible — centro poblado San Marcos (co-located con AQ-01)",
      campaign: "linea_base",
    },
    // ── Sensitive Receptor 02: Caserío agrícola ──────────────────────────
    {
      code: "AQ-02",
      kind: "aire",
      lon: -77.151,
      lat: -9.673,
      rationale: "Receptor sensible — caserío/área agrícola entre proyecto y San Marcos",
      campaign: "linea_base",
    },
    {
      code: "N-02",
      kind: "ruido",
      lon: -77.151,
      lat: -9.673,
      rationale: "Receptor sensible — caserío agrícola (co-located con AQ-02)",
      campaign: "linea_base",
    },
    // ── Water quality: 1 upstream + 2 downstream (Río Mosna) ──────────────
    {
      code: "WQ-01",
      kind: "agua_superficial",
      lon: -77.133015,
      lat: -9.668844,
      rationale: "Río Mosna — ~1.5 km aguas arriba (SE) del área de componentes",
      campaign: "linea_base",
    },
    {
      code: "WQ-02",
      kind: "agua_superficial",
      lon: -77.148407,
      lat: -9.671209,
      rationale: "Río Mosna — ~500 m aguas abajo (NW) del área de componentes",
      campaign: "linea_base",
    },
    {
      code: "WQ-03",
      kind: "agua_superficial",
      lon: -77.156704,
      lat: -9.674130,
      rationale: "Río Mosna — aguas abajo, próximo al centro poblado San Marcos",
      campaign: "linea_base",
    },
  ];

  for (const st of stations) {
    await insertStation(client, projectId, st.code, st.kind, st.lon, st.lat, st.rationale, st.campaign);
    console.log(`  ${st.code.padEnd(8)} ${st.kind.padEnd(18)} (${st.lon}, ${st.lat})`);
  }

  // 4. Summary
  const { rows: all } = await client.query(
    `SELECT station_code, kind, ST_X(geom::geometry) as lon, ST_Y(geom::geometry) as lat
     FROM project_sampling_stations WHERE project_id = $1 ORDER BY kind, station_code`,
    [projectId],
  );

  console.log(`\n✓ ${all.length} stations for Proyecto Andino`);
  console.log("  Receptores sensibles:");
  console.log("    SR-01: San Marcos (AQ-01 + N-01)");
  console.log("    SR-02: Caserío agrícola (AQ-02 + N-02)");
  console.log("  Agua superficial (Río Mosna):");
  console.log("    WQ-01: ~1.5 km aguas arriba (SE)");
  console.log("    WQ-02: ~500 m aguas abajo (NW)");
  console.log("    WQ-03: Aguas abajo, próximo a San Marcos");

  await client.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
