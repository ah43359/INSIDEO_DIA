// Smoke tests for Caps 3-7 derive functions. Each one is mostly
// placeholder content (the real LB / PPC / impacts / PMA / consultora
// data is filled by the user), so we verify the basics: empty input
// yields a usable state, defaults are seeded, warnings exist where
// promised, and chapter-specific seeded fields are present.

import { describe, expect, it } from "vitest";
import { deriveCap3Prefill } from "./cap3/derive";
import { deriveCap4Prefill } from "./cap4/derive";
import { deriveCap5Prefill } from "./cap5/derive";
import { deriveCap6Prefill } from "./cap6/derive";
import { deriveCap7Prefill } from "./cap7/derive";
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

const emptyInput = {
  project: makeProject(),
  cliente,
  componentes: [] as ComponenteInventario[],
  componentsGeom: [] as ComponentGeomFeature[],
  areaEstudio: null as AreaEstudioRow | null,
};

describe("Cap. 3 (Línea Base) derive", () => {
  it("returns an empty state with a manual-fill warning", () => {
    const r = deriveCap3Prefill(emptyInput);
    expect(r.state.dgFields).toBeTypeOf("object");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => /campo|monitoreo|estaciones/i.test(w))).toBe(true);
  });

  it("seeds Pfafstetter when area_estudio inputs_snapshot has microcuencas", () => {
    const area: AreaEstudioRow = {
      id: "a1",
      status: "approved",
      area_ha: 250,
      generated_by: "auto",
      generated_at: "2026-05-01T00:00:00Z",
      approved_at: null,
      inputs_snapshot: {
        project_id: "p1",
        components_count: 0,
        crs_utm: "19S",
        microcuencas_used_pfafstetter: ["131587", "131588"],
      },
      geom_geojson: '{"type":"Polygon","coordinates":[]}',
    };
    const r = deriveCap3Prefill({ ...emptyInput, areaEstudio: area });
    expect(r.state.dgFields.lb_pfafstetter).toBe("131587, 131588");
  });
});

describe("Cap. 4 (Participación Ciudadana) derive", () => {
  it("seeds the legal framework and warns about manual data", () => {
    const r = deriveCap4Prefill(emptyInput);
    expect(r.state.dgFields.ppc_marcoLegal).toContain("D.S. N° 028-2008-EM");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("seeds AISD list when centros poblados are provided", () => {
    const r = deriveCap4Prefill({
      ...emptyInput,
      centrosPoblados: [
        { nombre: "Chipispaya", distrito: "Héroes Albarracín", departamento: "Tacna" },
        { nombre: "Putina", distrito: "Héroes Albarracín", departamento: "Tacna" },
      ],
    });
    expect(r.state.dgFields.ppc_aisdLista).toContain("Chipispaya");
    expect(r.state.dgFields.ppc_aisdLista).toContain("Putina");
  });
});

describe("Cap. 5 (Impactos) derive", () => {
  it("seeds the Conesa methodology label and aspect lists", () => {
    const r = deriveCap5Prefill(emptyInput);
    expect(r.state.dgFields.imp_metodoNombre).toContain("Conesa");
    expect(r.state.dgFields.imp_aspectosFisicos).toMatch(/aire/i);
    expect(r.state.dgFields.imp_aspectosBiologicos).toMatch(/flora|fauna/i);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("Cap. 6 (PMA) derive", () => {
  it("seeds objective text and ECA references aligned with approved DIAs", () => {
    const r = deriveCap6Prefill(emptyInput);
    // V2 schema: pma_objGenerales + ECA references
    expect(r.state.dgFields.pma_objGenerales).toMatch(/prevenci[oó]n.*mitigaci[oó]n/i);
    expect(r.state.dgFields.pma_pvaAire_normativa).toMatch(/D\.S\.\s*N°?\s*003-2017/);
    expect(r.state.dgFields.pma_pvaRuido_normativa).toMatch(/085-2003/);
    expect(r.state.dgFields.pma_pvaAguaSup_normativa).toMatch(/004-2017/);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it("seeds responsable from cliente.razon_social", () => {
    const r = deriveCap6Prefill(emptyInput);
    expect(r.state.dgFields.pma_responsable).toContain("Minera Ejemplo");
  });
});

describe("Cap. 7 (Empresa Consultora) derive", () => {
  it("returns an empty state and warns about manual fill", () => {
    const r = deriveCap7Prefill(emptyInput);
    expect(Object.keys(r.state.dgFields)).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toMatch(/consultora/i);
  });
});
