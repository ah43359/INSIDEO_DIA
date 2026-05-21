"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  /** Inserted job UUID — the watcher polls on this. */
  jobId?: string;
  /** User-facing error message. */
  message?: string;
}

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

// ─── Enqueue: watershed-with-exclusions study area ──────────────────────
//
// Computes the between-control-points watershed and optionally subtracts
// the upstream catchments of user-selected named tributaries (Approach C).
// The RPC name stays enqueue_river_corridor_study_area for backward
// compatibility — the underlying algorithm changed but the queue plumbing
// didn't.

export type AreaEstudioStrategy = "watershed" | "corridor";

export interface AreaEstudioComputeOptions {
  /** Which algorithm to run. */
  strategy: AreaEstudioStrategy;
  /** Minimum metres past the AE polygon for the downstream control point. */
  minDownstreamM?: number;
  /** Minimum metres past the AE polygon for the upstream control point. */
  minUpstreamM?: number;
  /** (watershed) ref_rivers.id of named tributaries to subtract. */
  excludedTributaryIds?: number[];
  /** (watershed) Buffer (m) around the receiving river that the tributary
   *  flood-fill is forbidden to enter. */
  trunkBufferM?: number;
  /** (corridor) Buffer half-width (m) on each side of the receiving-river path. */
  corridorWidthM?: number;
  /** (corridor) Buffer (m) around project components used as the AE anchor. */
  projectBufferM?: number;
}

export async function enqueueRiverCorridorStudyArea(
  projectId: string,
  options: AreaEstudioComputeOptions,
): Promise<ActionResult> {
  const payload: Record<string, unknown> = { strategy: options.strategy };
  if (options.minDownstreamM != null) payload.min_downstream_m = options.minDownstreamM;
  if (options.minUpstreamM   != null) payload.min_upstream_m   = options.minUpstreamM;
  if (options.strategy === "watershed") {
    if (options.trunkBufferM != null) payload.trunk_buffer_m = options.trunkBufferM;
    if (options.excludedTributaryIds && options.excludedTributaryIds.length > 0) {
      payload.excluded_tributary_ids = options.excludedTributaryIds;
    }
  } else {
    if (options.corridorWidthM != null) payload.corridor_width_m = options.corridorWidthM;
    if (options.projectBufferM != null) payload.project_buffer_m = options.projectBufferM;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enqueue_river_corridor_study_area", {
    p_project_id: projectId,
    p_payload: payload,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, jobId: String(data) };
}

// ─── Propose sampling stations (enqueue) ────────────────────────────────

export interface ProposeOptions {
  receptorBufferM?: number;
  maxStationsPerKind?: number;
  forceExplosives?: "yes" | "no";
  onlyKinds?: readonly string[];
}

export async function enqueueProposeStations(
  projectId: string,
  options: ProposeOptions = {},
): Promise<ActionResult> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (options.receptorBufferM != null) {
    payload.receptor_buffer_m = options.receptorBufferM;
  }
  if (options.maxStationsPerKind != null) {
    payload.max_stations_per_kind = options.maxStationsPerKind;
  }
  if (options.forceExplosives) {
    payload.force_explosives = options.forceExplosives;
  }
  if (options.onlyKinds && options.onlyKinds.length > 0) {
    payload.only_kinds = options.onlyKinds;
  }

  const { data, error } = await supabase.rpc("enqueue_propose_stations", {
    p_project_id: projectId,
    p_options: payload,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, jobId: String(data) };
}

// ─── Upload (enqueue) ────────────────────────────────────────────────────

export async function enqueueUploadAreaEstudio(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "No se recibió ningún archivo." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `El archivo excede ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    };
  }
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      message: `Extensión no soportada: ${ext}.`,
    };
  }

  const supabase = await createClient();
  const sourceCrs = (formData.get("sourceCrs") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const objectKey = `${projectId}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from("area-estudio-uploads")
    .upload(objectKey, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, message: `Storage upload falló: ${uploadErr.message}` };
  }

  const payload: Record<string, unknown> = {};
  if (sourceCrs) payload.source_crs = sourceCrs;
  if (notes) payload.notes = notes;

  const { data, error } = await supabase.rpc("enqueue_upload_area_estudio", {
    p_project_id: projectId,
    p_storage_path: objectKey,
    p_options: payload,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, jobId: String(data) };
}

// ─── Área efectiva ─────────────────────────────────────────────────────

export async function regenerateAreaEfectiva(
  projectId: string,
  bufferM: number,
): Promise<ActionResult> {
  if (!Number.isFinite(bufferM) || bufferM < 1 || bufferM > 10000) {
    return { ok: false, message: "Buffer debe estar entre 1 y 10000 m." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_area_efectiva", {
    p_project_id: projectId,
    p_buffer_m: Math.round(bufferM),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function saveAreaEfectivaGeom(
  projectId: string,
  geomGeoJson: string,
): Promise<ActionResult> {
  if (!geomGeoJson || geomGeoJson.length < 10) {
    return { ok: false, message: "Geometría vacía." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_area_efectiva_geom", {
    p_project_id: projectId,
    p_geom_geojson: geomGeoJson,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteAreaEfectiva(
  projectId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_area_efectiva", {
    p_project_id: projectId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
