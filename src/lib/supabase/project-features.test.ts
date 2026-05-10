import { describe, expect, it } from "vitest";
import { componentGeomFromProjectFeaturesRpc } from "./project-features";

describe("componentGeomFromProjectFeaturesRpc", () => {
  it("returns empty list for null/undefined payload", () => {
    expect(componentGeomFromProjectFeaturesRpc("p1", null)).toEqual([]);
    expect(componentGeomFromProjectFeaturesRpc("p1", undefined)).toEqual([]);
  });

  it("maps RPC features to ComponentGeomFeature rows", () => {
    const rows = componentGeomFromProjectFeaturesRpc("proj-9", {
      type: "FeatureCollection",
      features: [
        {
          id: "f1",
          properties: {
            nombre: "Acceso Norte",
            tipo: "acceso",
            categoria: "infra",
            area_m2: 1200,
            longitud_tunel_m: 400,
          },
          geometry: { type: "Point", coordinates: [-70.1, -17.2] },
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "f1",
      project_id: "proj-9",
      nombre: "Acceso Norte",
      tipo: "acceso",
      categoria: "infra",
      area_m2: 1200,
      longitud_tunel_m: 400,
    });
    expect(rows[0].geom_geojson).toContain("Point");
  });
});
