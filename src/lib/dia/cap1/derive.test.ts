import { describe, expect, it } from "vitest";
import { deriveCap1Prefill } from "./derive";
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

function comp(componente: string, cantidad: number, attrs: Record<string, unknown> | null = null): ComponenteInventario {
  return { id: `c-${componente}`, project_id: "p1", categoria: "A", componente, cantidad, attrs };
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

describe("deriveCap1Prefill", () => {
  it("returns blank counts when no components", () => {
    const r = deriveCap1Prefill({
      project: makeProject(),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: null,
    });

    expect(r.state.dgFields.re_distrito).toBe("Héroes Albarracín");
    expect(r.state.dgFields.re_provincia).toBe("Tarata");
    expect(r.state.dgFields.re_region).toBe("Tacna");
    expect(r.state.dgFields.re_utmZona).toBe("19S");
    expect(r.state.dgFields.re_numPlataformas).toBe("");
    expect(r.state.dgFields.re_kmAccesos).toBe("");
    expect(r.state.dgFields.re_componentesAuxiliares).toBe("");
  });

  it("aggregates plataformas, kmAccesos, and auxiliares", () => {
    const r = deriveCap1Prefill({
      project: makeProject(),
      cliente,
      componentes: [
        comp("Plataforma de perforación", 5, { sondajes: 12 }),
        comp("Helipuerto", 1),
        comp("Trinchera", 20),
      ],
      componentsGeom: [geom("Acceso A1", "acceso", 1500), geom("Acceso A2", "acceso", 500)],
      areaEstudio: null,
    });

    expect(r.state.dgFields.re_numPlataformas).toBe("5");
    expect(r.state.dgFields.re_numSondajes).toBe("12");
    expect(r.state.dgFields.re_kmAccesos).toBe("2.000");
    expect(r.state.dgFields.re_componentesAuxiliares).toContain("1 Helipuerto");
    expect(r.state.dgFields.re_componentesAuxiliares).toContain("20 Trinchera");
  });

  it("populates concesiones when project.concesiones is set", () => {
    const r = deriveCap1Prefill({
      project: makeProject({
        concesiones: [
          { nombre: "OSCAR 1", codigo: "010029392", area_ha: 600 },
          { nombre: "ALICIA 2", codigo: "010072593", area_ha: 900 },
        ],
      }),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: null,
    });

    expect(r.state.dgFields.re_numConcesiones).toBe("2");
    expect(r.state.dgFields.re_concesionesLista).toContain("OSCAR 1");
    expect(r.state.dgFields.re_concesionesLista).toContain("(010029392)");
  });

  it("derives coordEste/coordNorte from area_estudio centroid", () => {
    const polygon = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [[-71.20, -17.00], [-71.18, -17.00], [-71.18, -16.98], [-71.20, -16.98], [-71.20, -17.00]],
      ],
    });
    const area: AreaEstudioRow = {
      id: "a1",
      status: "approved",
      area_ha: 250,
      generated_by: "auto",
      generated_at: "2026-05-01T00:00:00Z",
      approved_at: "2026-05-02T00:00:00Z",
      inputs_snapshot: { project_id: "p1", components_count: 0, crs_utm: "19S" },
      geom_geojson: polygon,
    };

    const r = deriveCap1Prefill({
      project: makeProject(),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: area,
    });

    expect(r.state.dgFields.re_coordEste).toMatch(/^\d{6}$/);
    expect(r.state.dgFields.re_coordNorte).toMatch(/^\d{7}$/);
    expect(r.state.dgFields.re_areaEfectivaHa).toBe("250.00");
  });

  it("warns when no area_estudio is available", () => {
    const r = deriveCap1Prefill({
      project: makeProject(),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: null,
    });
    expect(r.warnings.some((w) => /área de estudio/i.test(w))).toBe(true);
  });

  it("emits placeholder warnings for not-yet-built chapters 3-6", () => {
    const r = deriveCap1Prefill({
      project: makeProject(),
      cliente,
      componentes: [],
      componentsGeom: [],
      areaEstudio: null,
    });
    expect(r.warnings.some((w) => /Línea Base/.test(w))).toBe(true);
    expect(r.warnings.some((w) => /Capítulos 4, 5 y 6/.test(w))).toBe(true);
  });
});
