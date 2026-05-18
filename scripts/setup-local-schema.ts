// One-shot CLI: inspect local DB schema and create missing
// RPCs and tables required for the app to work correctly.
//
// Usage:
//   npx tsx scripts/setup-local-schema.ts

import { Client } from "pg";

const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface RoutineInfo {
  proname: string;
}

async function inspect(client: Client) {
  const tables = ["components_geom", "componente_inventario", "project_sampling_stations"];
  for (const t of tables) {
    const { rows } = await client.query<ColumnInfo>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [t],
    );
    console.log(`\n=== ${t} ===`);
    for (const r of rows) {
      console.log(`  ${r.column_name.padEnd(30)} ${r.data_type.padEnd(20)} ${r.is_nullable}`);
    }
  }
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // 1. Inspect current schema
  await inspect(client);

  // 2. Create station_measurements table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS station_measurements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      station_id UUID NOT NULL REFERENCES project_sampling_stations(id) ON DELETE CASCADE,
      station_code TEXT,
      kind TEXT,
      campaign TEXT NOT NULL,
      measurement_date DATE NOT NULL,
      parameters JSONB NOT NULL DEFAULT '{}',
      eca_compliance JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log("\n✓ station_measurements table ready");

  // 3. Create insert_station_measurement RPC
  // Drop all overloads first
  await client.query(`DROP FUNCTION IF EXISTS insert_station_measurement(UUID, TEXT, TEXT, JSONB, TEXT) CASCADE`);
  await client.query(`DROP FUNCTION IF EXISTS insert_station_measurement(UUID, TEXT, TEXT, JSONB) CASCADE`);
  await client.query(`
    CREATE FUNCTION insert_station_measurement(
      p_station_id UUID,
      p_campaign TEXT,
      p_measurement_date TEXT,
      p_parameters JSONB,
      p_notes TEXT DEFAULT NULL
    ) RETURNS UUID
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v record;
      v_id UUID;
    BEGIN
      SELECT station_code, kind INTO v
      FROM project_sampling_stations WHERE id = p_station_id;
      INSERT INTO station_measurements (
        station_id, station_code, kind, campaign,
        measurement_date, parameters, notes
      ) VALUES (
        p_station_id, v.station_code, v.kind, p_campaign,
        p_measurement_date::DATE, p_parameters, p_notes
      ) RETURNING id INTO v_id;
      RETURN v_id;
    END;
    $$;
  `);
  console.log("✓ insert_station_measurement RPC ready");

  // 4. Create project_features RPC (returns GeoJSON FeatureCollection)
  await client.query(`DROP FUNCTION IF EXISTS project_features(UUID) CASCADE`);
  await client.query(`
    CREATE FUNCTION project_features(p_id UUID)
    RETURNS JSON
    LANGUAGE plpgsql
    AS $$
    DECLARE
      result JSON;
    BEGIN
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) INTO result
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'id', id,
          'geometry', ST_AsGeoJSON(geom)::json,
          'properties', json_build_object(
            'nombre', nombre,
            'tipo', tipo,
            'categoria', categoria,
            'area_m2', area_m2,
            'longitud_tunel_m', longitud_tunel_m
          )
        ) AS feature
        FROM components_geom
        WHERE project_id = p_id
      ) sub;
      
      RETURN result;
    END;
    $$;
  `);
  console.log("✓ project_features RPC ready");

  // 5. Verify both RPCs now exist
  const { rows: rpcs } = await client.query<RoutineInfo>(
    `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
     AND proname IN ('insert_station_measurement', 'project_features')`
  );
  console.log("\nVerified RPCs:", rpcs.map(r => r.proname).join(", "));

  await client.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
