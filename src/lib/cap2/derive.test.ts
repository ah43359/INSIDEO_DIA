import { describe, expect, it } from "vitest";
import { centroidFromGeoJsonText, deriveCap2Prefill } from "./derive";
import { fromExportV7, toExportV7, emptyCap2State } from "./state";
import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    cliente_id: "c1",
    nombre_proyecto: "Proyecto Test",
    codigo_cm: null,
    region: "Tacna",
    provincia: "Tarata",
    distrito: "Héroes Albarracín",
    area_total_ha: 500,
    zona_utm: 19,
    datum: "WGS84",
    commodity: ["Cu"],
    metodo_exploracion: ["diamantina"],
    proyecto_brownfield: false,
    iga_previo: null,
    concesiones: null,
    recursos: null,
    residuos: null,
    mano_obra: null,
    cronograma: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const cliente: Cliente = {
  id: "c1",
  razon_social: "Minera Ejemplo S.A.",
  ruc: "20100100100",
  domicilio: "Av. Test 123, Lima",
  representante: "Juan Pérez",
  dni_representante: "12345678",
  cargo: "Apoderado",
  telefono: null,
  correo: null,
};

function comp(
  componente: string,
  cantidad: number,
  attrs: Record<string, unknown> | null = null,
): ComponenteInventario {
  return {
    id: `c-${componente}`,
    project_id: "p1",
    categoria: "A",
    componente,
    cantidad,
    attrs,
  };
}

function geom(nombre: string, tipo: string, longitud_tunel_m: number | null): ComponentGeomFeature {
  return {
    id: `g-${nombre}`,
    project_id: "p1",
    nombre,
    tipo,
    categoria: null,
    area_m2: null,
    longitud_tunel_m,
    geom_geojson: null,
  };
}

describe("deriveCap2Prefill", () => {
  it("returns DIA + blank counts when no components", () => {
    const result = deriveCap2Prefill({
      project: makeProject(),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: null,
    });

    expect(result.state.introType).toBe("DIA");
    expect(result.state.utmZone).toBe("19S");
    expect(result.state.introFields.numPlataformas).toBe("");
    expect(result.state.introFields.numSondajes).toBe("");
    expect(result.state.introFields.kmAccesos).toBe("");
    expect(result.state.introFields.auxiliarList).toBe("");
    expect(result.state.introFields.empresaTitular).toBe("Minera Ejemplo S.A.");
    expect(result.warnings.some((w) => /área de estudio/i.test(w))).toBe(true);
  });

  it("aggregates plataformas, accesos, and auxiliarList", () => {
    const result = deriveCap2Prefill({
      project: makeProject(),
      cliente,
      componentes: [
        comp("Plataforma de perforación", 5, { sondajes: 12 }),
        comp("Helipuerto", 1),
        comp("Piscina australiana", 3),
        comp("Trinchera", 20),
      ],
      componentsGeom: [geom("Acceso A1", "acceso", 1500), geom("Acceso A2", "acceso", 500)],
      areaEstudio: null,
    });

    expect(result.state.introFields.numPlataformas).toBe("5");
    expect(result.state.introFields.numSondajes).toBe("12");
    expect(result.state.introFields.kmAccesos).toBe("2.000");
    // Auxiliary list preserves user wording verbatim
    expect(result.state.introFields.auxiliarList).toContain("1 Helipuerto");
    expect(result.state.introFields.auxiliarList).toContain("3 Piscina australiana");
    expect(result.state.introFields.auxiliarList).toContain("20 Trinchera");
  });

  it("buckets 'Plataforma de helipuerto' as helipuerto, not plataforma", () => {
    const result = deriveCap2Prefill({
      project: makeProject(),
      cliente,
      componentes: [comp("Plataforma de helipuerto", 1)],
      componentsGeom: [],
      areaEstudio: null,
    });

    expect(result.state.introFields.numPlataformas).toBe("");
    expect(result.state.introFields.auxiliarList).toContain("Plataforma de helipuerto");
  });

  it("detects MDIA via iga_previo and warns when estado attrs are missing", () => {
    const result = deriveCap2Prefill({
      project: makeProject({ iga_previo: { rd: "R.D. N° 0036-2025" } }),
      cliente,
      componentes: [comp("Plataforma", 4)],
      componentsGeom: [],
      areaEstudio: null,
    });

    expect(result.state.introType).toBe("MDIA");
    expect(result.warnings.some((w) => /attrs.estado/i.test(w))).toBe(true);
  });

  it("splits aprobado vs reubicado plataformas when attrs.estado is present", () => {
    const result = deriveCap2Prefill({
      project: makeProject({ proyecto_brownfield: true }),
      cliente,
      componentes: [
        comp("Plataforma 1", 1, { estado: "aprobado" }),
        comp("Plataforma 2", 1, { estado: "aprobado" }),
        comp("Plataforma 3", 1, { estado: "reubicado" }),
      ],
      componentsGeom: [],
      areaEstudio: null,
    });

    expect(result.state.introType).toBe("MDIA");
    expect(result.state.introFields.platAprobadas).toBe("2");
    expect(result.state.introFields.platReubicadas).toBe("1");
    // No "estado missing" warning since attrs.estado is present on all rows
    expect(result.warnings.some((w) => /attrs.estado/i.test(w))).toBe(false);
  });

  it("falls back to UTM 19S when zona_utm is missing", () => {
    const result = deriveCap2Prefill({
      project: makeProject({ zona_utm: 17 }),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: null,
    });
    expect(result.state.utmZone).toBe("17S");
  });

  it("derives coordEste/coordNorte from area_estudio centroid", () => {
    // Simple polygon roughly around -71.2 lon, -17.0 lat (UTM 19S)
    const polygon = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [-71.20, -17.00],
          [-71.18, -17.00],
          [-71.18, -16.98],
          [-71.20, -16.98],
          [-71.20, -17.00],
        ],
      ],
    });
    const area: AreaEstudioRow = {
      id: "a1",
      status: "approved",
      area_ha: 250,
      generated_by: "auto",
      generated_at: "2026-05-01T00:00:00Z",
      approved_at: "2026-05-02T00:00:00Z",
      inputs_snapshot: {
        project_id: "p1",
        components_count: 0,
        crs_utm: "19S",
      },
      geom_geojson: polygon,
    };

    const result = deriveCap2Prefill({
      project: makeProject(),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: area,
    });

    expect(result.state.introFields.coordEste).toMatch(/^\d{6}$/);
    expect(result.state.introFields.coordNorte).toMatch(/^\d{7}$/);
  });
});

describe("centroidFromGeoJsonText", () => {
  it("returns null for invalid input", () => {
    expect(centroidFromGeoJsonText(null)).toBeNull();
    expect(centroidFromGeoJsonText("not json")).toBeNull();
    expect(centroidFromGeoJsonText('{"type":"Point"}')).toBeNull();
  });

  it("returns the point itself for Point geometry", () => {
    const result = centroidFromGeoJsonText('{"type":"Point","coordinates":[-71.2,-17.0]}');
    expect(result).toEqual({ lon: -71.2, lat: -17.0 });
  });

  it("averages outer ring vertices for Polygon", () => {
    const result = centroidFromGeoJsonText(
      '{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,10],[0,10],[0,0]]]}',
    );
    expect(result?.lon).toBeCloseTo(4, 5);
    expect(result?.lat).toBeCloseTo(4, 5);
  });
});

describe("Cap2State JSON v7 round-trip", () => {
  it("serializes and parses identically", () => {
    const original = emptyCap2State();
    original.introType = "MDIA";
    original.utmZone = "18S";
    original.introFields = { nombreProyecto: "Test", numPlataformas: "10" };
    original.dgFields = { dg_ruc: "20100100100", min_descripcion: "cobre" };
    original.content = { "2.8.7": "fuentes de emisión..." };

    const exported = toExportV7(original);
    expect(exported.version).toBe(7);
    expect(typeof exported.exportDate).toBe("string");

    const reimported = fromExportV7(JSON.parse(JSON.stringify(exported)));
    expect(reimported.introType).toBe(original.introType);
    expect(reimported.utmZone).toBe(original.utmZone);
    expect(reimported.introFields).toEqual(original.introFields);
    expect(reimported.dgFields).toEqual(original.dgFields);
    expect(reimported.content).toEqual(original.content);
  });

  it("rejects non-version-7 payloads", () => {
    expect(() => fromExportV7({ version: 6 })).toThrow(/Versión/);
    expect(() => fromExportV7(null)).toThrow();
  });
});
