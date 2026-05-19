"""
Ingest MINAM 2015 Cobertura Vegetal shapefile into public.vegetation_zones.

Source: E:\\GIS\\data\\CoberturaVegetal_2015\\CobVeg_180615.shp (EPSG:32718).
105,354 Polygon features, ~630 MB.

Strategy:
  1. Stream features with fiona (latin1 encoding for Spanish labels).
  2. Bulk-COPY into a staging table with GeoJSON text geom (fast).
  3. INSERT-SELECT into vegetation_zones, parsing GeoJSON server-side,
     computing area_ha (m^2 / 10000) and geom_4326_simple (reprojected
     to 4326 + simplified) via PostGIS.
  4. Drop staging.

Run:
  C:\\Users\\ahija\\miniconda3\\envs\\gis-python\\python.exe \\
    scripts/ingest-minam-vegetation.py
"""
from __future__ import annotations

import io
import json
import sys
import time
import psycopg2
import fiona

SHP = r"E:\GIS\data\CoberturaVegetal_2015\CobVeg_180615.shp"
DB = dict(
    host="127.0.0.1",
    port=54322,
    dbname="postgres",
    user="postgres",
    password="postgres",
)
SRID = 32718
SIMPLIFY_TOLERANCE_DEG = 0.0005  # ~50 m


def main() -> int:
    t0 = time.time()
    conn = psycopg2.connect(**DB)
    conn.autocommit = False
    cur = conn.cursor()

    print("Preparing staging table...", flush=True)
    cur.execute("drop table if exists public._minam_staging;")
    cur.execute(
        """
        create unlogged table public._minam_staging (
          code        text not null,
          name        text not null,
          geom_json   text not null
        );
        """
    )
    conn.commit()

    print(f"Reading shapefile: {SHP}", flush=True)
    buf = io.StringIO()
    written = 0
    skipped = 0
    with fiona.open(SHP, encoding="latin1") as src:
        for feat in src:
            g = feat["geometry"]
            if not g:
                skipped += 1
                continue
            props = feat["properties"]
            code = (props.get("Simbolo") or "").strip()
            name = (props.get("CV_Label") or props.get("CobVeg2013") or code or "").strip()
            if not code or not name:
                skipped += 1
                continue
            # Fiona's geometry is a __geo_interface__-style dict.
            # Convert to plain dict and dump as JSON for ST_GeomFromGeoJSON.
            geom_json = json.dumps({"type": g["type"], "coordinates": g["coordinates"]})
            safe_code = code.replace("\t", " ").replace("\n", " ").replace("\\", "\\\\")
            safe_name = name.replace("\t", " ").replace("\n", " ").replace("\\", "\\\\")
            # COPY text format requires escaping backslashes; JSON has none for us
            # since fiona converts to pure floats. But escape just in case.
            safe_json = geom_json.replace("\\", "\\\\")
            buf.write(f"{safe_code}\t{safe_name}\t{safe_json}\n")
            written += 1
            if written % 10_000 == 0:
                print(f"  ...staged {written} features (t={time.time()-t0:.0f}s)", flush=True)

    print(f"Read complete: {written} features, {skipped} skipped", flush=True)
    print(f"Streaming to PostgreSQL via COPY...", flush=True)
    buf.seek(0)
    cur.copy_expert(
        "copy public._minam_staging (code, name, geom_json) "
        "from stdin with (format text, delimiter E'\\t')",
        buf,
    )
    conn.commit()
    print(f"  COPY done at t={time.time() - t0:.0f}s", flush=True)

    print("Inserting into vegetation_zones (area_ha + geom_4326_simple)...", flush=True)
    cur.execute(
        f"""
        insert into public.vegetation_zones
          (code, name, geom, source, area_ha, geom_4326_simple)
        with parsed as (
          select
            code,
            name,
            ST_SetSRID(ST_GeomFromGeoJSON(geom_json), {SRID}) as geom
          from public._minam_staging
        )
        select
          code,
          name,
          geom::geometry(Polygon, {SRID}),
          'MINAM',
          ST_Area(geom) / 10000.0,
          ST_SimplifyPreserveTopology(
            ST_Transform(geom, 4326),
            {SIMPLIFY_TOLERANCE_DEG}
          )
        from parsed
        where ST_IsValid(geom)
          and GeometryType(geom) = 'POLYGON';
        """
    )
    inserted = cur.rowcount
    conn.commit()
    print(f"  inserted {inserted} rows at t={time.time() - t0:.0f}s", flush=True)

    print("Dropping staging...", flush=True)
    cur.execute("drop table public._minam_staging;")
    conn.commit()

    cur.execute("select count(*), count(distinct code) from public.vegetation_zones;")
    total_rows, distinct_codes = cur.fetchone()
    print(f"\nDone in {time.time() - t0:.1f}s", flush=True)
    print(f"  vegetation_zones: {total_rows} rows, {distinct_codes} distinct codes", flush=True)

    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
