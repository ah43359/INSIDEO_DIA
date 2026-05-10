import { describe, expect, it } from "vitest";
import { isCap6V1, migrateCap6V1ToV2 } from "./migration";

describe("Cap. 6 v1 → v2 migration", () => {
  it("detects v1 by presence of pma_aireMedidas / pma_objetivo etc.", () => {
    expect(isCap6V1({ dgFields: { pma_aireMedidas: "x" } })).toBe(true);
    expect(isCap6V1({ dgFields: { pma_objetivo: "x" } })).toBe(true);
    expect(isCap6V1({ dgFields: { pma_objGenerales: "x" } })).toBe(false);
    expect(isCap6V1({ dgFields: {} })).toBe(false);
  });

  it("returns the same state when not v1", () => {
    const v2 = {
      introFields: {},
      dgFields: { pma_objGenerales: "ya v2" },
      content: {},
    };
    const result = migrateCap6V1ToV2(v2);
    expect(result).toBe(v2);
  });

  it("maps direct v1 keys to v2 (objetivo → objGenerales)", () => {
    const v1 = {
      introFields: {},
      dgFields: {
        pma_objetivo: "Establecer las medidas...",
        pma_responsable: "Empresa X",
      },
      content: {},
    };
    const r = migrateCap6V1ToV2(v1);
    expect(r.dgFields.pma_objGenerales).toBe("Establecer las medidas...");
    expect(r.dgFields.pma_responsable).toBe("Empresa X");
    // Old key dropped
    expect(r.dgFields.pma_objetivo).toBeUndefined();
  });

  it("moves v1 medidas fields into v2 etapa-keyed content (all 3 etapas seeded)", () => {
    const v1 = {
      introFields: {},
      dgFields: {
        pma_aireMedidas: "Riego diario de accesos",
        pma_ruidoMedidas: "Uso de silenciadores",
      },
      content: {},
    };
    const r = migrateCap6V1ToV2(v1);
    // Aire (suffix b) and ruido (suffix a) seeded for all 3 etapas
    for (const etapa of ["6.2.1", "6.2.2", "6.2.3"]) {
      expect(r.content[`${etapa}.a`]).toContain("Uso de silenciadores");
      expect(r.content[`${etapa}.b`]).toContain("Riego diario de accesos");
    }
  });

  it("moves v1 plan-level fields into the right v2 section content", () => {
    const v1 = {
      introFields: {},
      dgFields: {
        pma_residuosMinimizacion: "Reducir, reusar, reciclar",
        pma_contingenciasObjetivo: "Atender emergencias",
        pma_cierreProgresivo: "Rehabilitar plataformas",
      },
      content: {},
    };
    const r = migrateCap6V1ToV2(v1);
    expect(r.content["6.4.5"]).toBe("Reducir, reusar, reciclar");
    expect(r.content["6.5.1"]).toBe("Atender emergencias");
    expect(r.content["6.7.1"]).toBe("Rehabilitar plataformas");
  });

  it("appends to existing content rather than overwriting", () => {
    const v1 = {
      introFields: {},
      dgFields: {
        pma_residuosMinimizacion: "v1 minimization",
      },
      content: {
        "6.4.5": "previously written content",
      },
    };
    const r = migrateCap6V1ToV2(v1);
    expect(r.content["6.4.5"]).toContain("previously written");
    expect(r.content["6.4.5"]).toContain("v1 minimization");
  });
});
