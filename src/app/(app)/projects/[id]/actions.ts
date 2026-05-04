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

// ─── Derive (enqueue) ────────────────────────────────────────────────────

export type DeriveStrategy = "subbasin_envelope" | "buffer_drainage";

export interface DeriveOptions {
  strategy?: DeriveStrategy;
  /** subbasin_envelope: stop expanding when union reaches this area. */
  targetAreaHa?: number;
  /** subbasin_envelope: flow-accum threshold for stream extraction. */
  streamThresholdCells?: number;
  /** subbasin_envelope: hard cap on neighbour expansion. */
  maxHops?: number;
  /** buffer_drainage (legacy): DEM-based drainage source. */
  drainage?: "none" | "local_dem";
  /** buffer_drainage (legacy): buffer around components, m. */
  receptorBufferM?: number;
  /** buffer_drainage (legacy): drop microcuencas larger than this, km². */
  maxMicrocuencaAreaKm2?: number;
  /** buffer_drainage (legacy): clip upstream catchment at this distance, km. */
  maxUpstreamKm?: number;
}

export async function enqueueDeriveAreaEstudio(
  projectId: string,
  options: DeriveOptions = {},
): Promise<ActionResult> {
  const supabase = await createClient();
  const strategy = options.strategy ?? "subbasin_envelope";
  // The RPC's payload column accepts the python script's argument names
  // verbatim — see worker.process_derive.
  const payload: Record<string, unknown> = { strategy };

  if (strategy === "subbasin_envelope") {
    if (options.targetAreaHa != null) payload.target_area_ha = options.targetAreaHa;
    if (options.streamThresholdCells != null) payload.stream_threshold_cells = options.streamThresholdCells;
    if (options.maxHops != null) payload.max_hops = options.maxHops;
  } else {
    payload.drainage = options.drainage ?? "local_dem";
    if (options.receptorBufferM != null) payload.receptor_buffer_m = options.receptorBufferM;
    if (options.maxMicrocuencaAreaKm2 != null) payload.max_microcuenca_area_km2 = options.maxMicrocuencaAreaKm2;
    if (options.maxUpstreamKm != null) payload.max_upstream_km = options.maxUpstreamKm;
  }

  const { data, error } = await supabase.rpc("enqueue_derive_area_estudio", {
    p_project_id: projectId,
    p_options: payload,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, jobId: String(data) };
}

// ─── Propose sampling stations (enqueue) ────────────────────────────────

export interface ProposeOptions {
  receptorBufferM?: number;
  maxStationsPerKind?: number;
  /** ``"yes"`` / ``"no"`` overrides the auto-detected explosives flag. */
  forceExplosives?: "yes" | "no";
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

  // Object key: <projectId>/<timestamp>-<safe-name>. Avoids collisions
  // and groups uploads per project.
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

// ─── Vegetation (enqueue) ──────────────────────────────────────────────

export async function enqueueVegetation(
  projectId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enqueue_vegetation", {
    p_project_id: projectId,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, jobId: String(data) };
}
