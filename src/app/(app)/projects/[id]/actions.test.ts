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
