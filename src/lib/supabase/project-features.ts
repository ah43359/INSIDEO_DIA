import type { ComponentGeomFeature } from "@/lib/types";

/**
 * Shape returned by the `project_features` RPC (GeoJSON FeatureCollection).
 * Used by DIA chapter derive functions (cap1/cap2 prefill, future chapters).
 */
export interface ProjectFeaturesRpcPayload {
  type: "FeatureCollection";
  features: Array<{
    id?: string | number;
    properties?: Record<string, unknown> | null;
    geometry: GeoJSON.Geometry;
  }>;
}

/**
 * Maps raw JSON from `project_features` into {@link ComponentGeomFeature} rows.
 * Keeps RPC parsing in one place so chapter pages and future loaders stay thin.
 */
export function componentGeomFromProjectFeaturesRpc(
  projectId: string,
  featuresJson: unknown,
): ComponentGeomFeature[] {
  const fc = (featuresJson ?? {
    type: "FeatureCollection",
    features: [],
  }) as ProjectFeaturesRpcPayload;

  return fc.features.map((f) => {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    return {
      id: String(f.id ?? ""),
      project_id: projectId,
      nombre: String(props.nombre ?? ""),
      tipo: String(props.tipo ?? ""),
      categoria: typeof props.categoria === "string" ? props.categoria : null,
      area_m2: typeof props.area_m2 === "number" ? props.area_m2 : null,
      longitud_tunel_m:
        typeof props.longitud_tunel_m === "number" ? props.longitud_tunel_m : null,
      geom_geojson: f.geometry ? JSON.stringify(f.geometry) : null,
    };
  });
}
