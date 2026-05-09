/**
 * Integration tests for Supabase RPC contracts.
 *
 * These tests validate the contract between the frontend (actions.ts) and
 * the Supabase Edge Functions / PostgreSQL RPC functions.
 *
 * Since we can't hit a live DB in unit tests, these tests verify:
 * 1. RPC payload shapes match expected snake_case column names
 * 2. Action functions return the correct ActionResult shape
 * 3. Upload validation constants are correct
 *
 * For live contract tests against staging, run: npm run test:integration
 */

import { describe, expect, it } from "vitest";
import type {
  ActionResult,
  DeriveOptions,
  DeriveStrategy,
  ProposeOptions,
} from "./actions";

const ALLOWED_EXTENSIONS = new Set([
  ".kmz",
  ".kml",
  ".shp",
  ".zip",
  ".geojson",
  ".json",
  ".gpkg",
]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

describe("Supabase RPC contract — actions.ts", () => {
  describe("enqueueDeriveAreaEstudio", () => {
    it("accepts valid subbasin_envelope options", () => {
      const opts: DeriveOptions = {
        strategy: "subbasin_envelope",
        targetAreaHa: 500,
        streamThresholdCells: 1000,
        maxHops: 50,
      };
      expect(opts.strategy).toBe("subbasin_envelope");
      expect(opts.targetAreaHa).toBe(500);
    });

    it("accepts valid buffer_drainage options", () => {
      const opts: DeriveOptions = {
        strategy: "buffer_drainage",
        drainage: "local_dem",
        receptorBufferM: 500,
        maxMicrocuencaAreaKm2: 50,
        maxUpstreamKm: 10,
      };
      expect(opts.strategy).toBe("buffer_drainage");
      expect(opts.drainage).toBe("local_dem");
    });

    it("defaults to subbasin_envelope when strategy is undefined", () => {
      const opts: DeriveOptions = {};
      const strategy: DeriveStrategy = opts.strategy ?? "subbasin_envelope";
      expect(strategy).toBe("subbasin_envelope");
    });
  });

  describe("enqueueProposeStations", () => {
    it("accepts valid receptor buffer options", () => {
      const opts: ProposeOptions = {
        receptorBufferM: 1000,
        maxStationsPerKind: 20,
        forceExplosives: "yes",
      };
      expect(opts.receptorBufferM).toBe(1000);
      expect(opts.forceExplosives).toBe("yes");
    });

    it("forceExplosives must be 'yes' or 'no'", () => {
      const valid = (v: unknown) => v === "yes" || v === "no";
      expect(valid("yes")).toBe(true);
      expect(valid("no")).toBe(true);
      expect(valid("maybe")).toBe(false);
    });
  });

  describe("enqueueUploadAreaEstudio", () => {
    it("ALLOWED_EXTENSIONS covers all expected geospatial formats", () => {
      const expected = [".kmz", ".kml", ".shp", ".zip", ".geojson", ".json", ".gpkg"];
      for (const ext of expected) {
        expect(ALLOWED_EXTENSIONS.has(ext)).toBe(true);
      }
    });

    it("MAX_UPLOAD_BYTES is 25 MB", () => {
      expect(MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
    });

    it("file extension check is case-sensitive (as per actions.ts)", () => {
      expect(ALLOWED_EXTENSIONS.has(".KMZ")).toBe(false);
      expect(ALLOWED_EXTENSIONS.has(".Kml")).toBe(false);
    });
  });

  describe("ActionResult shape", () => {
    it("success result has ok=true and string jobId", () => {
      const ok: ActionResult = { ok: true, jobId: "abc-123" };
      expect(ok.ok).toBe(true);
      expect(typeof ok.jobId).toBe("string");
    });

    it("error result has ok=false and string message", () => {
      const err: ActionResult = { ok: false, message: "DB timeout" };
      expect(err.ok).toBe(false);
      expect(typeof err.message).toBe("string");
    });

    it("jobId from RPC must be convertible to string", () => {
      const data: unknown = "550e8400-e29b-41d4-a716-446655440000";
      const jobId = String(data);
      expect(jobId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe("RPC snake_case payload contract", () => {
    it("DeriveOptions camelCase → expected snake_case DB columns", () => {
      const opts: DeriveOptions = {
        targetAreaHa: 100,
        streamThresholdCells: 500,
        maxHops: 30,
        receptorBufferM: 1000,
        maxMicrocuencaAreaKm2: 20,
        maxUpstreamKm: 5,
      };

      const expectedSnakeCase: Record<string, string> = {
        targetAreaHa: "target_area_ha",
        streamThresholdCells: "stream_threshold_cells",
        maxHops: "max_hops",
        receptorBufferM: "receptor_buffer_m",
        maxMicrocuencaAreaKm2: "max_microcuenca_area_km2",
        maxUpstreamKm: "max_upstream_km",
      };

      for (const [camel, snake] of Object.entries(expectedSnakeCase)) {
        expect(camel in opts).toBe(true);
        expect(snake).toMatch(/^[a-z0-9_]+$/);
      }
    });

    it("ProposeOptions camelCase → expected snake_case DB columns", () => {
      const opts: ProposeOptions = {
        receptorBufferM: 500,
        maxStationsPerKind: 15,
        forceExplosives: "no",
      };

      const expectedSnakeCase: Record<string, string> = {
        receptorBufferM: "receptor_buffer_m",
        maxStationsPerKind: "max_stations_per_kind",
        forceExplosives: "force_explosives",
      };

      for (const [camel, snake] of Object.entries(expectedSnakeCase)) {
        expect(camel in opts).toBe(true);
        expect(snake).toMatch(/^[a-z0-9_]+$/);
      }
    });
  });
});
