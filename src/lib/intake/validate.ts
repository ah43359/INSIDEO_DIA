import Ajv from "ajv";
import addFormats from "ajv-formats";
import schemaJson from "./rfi_schema.json";
import type { RfiDict } from "./parse-xlsx";
import type { ComponentFeature } from "./parse-components";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// rfi_schema.json declares `componentes_file` as required, but in the web flow
// the components arrive as an upload — not as a path inside the .xlsx. We relax
// that constraint here and validate everything else against the same schema.
// Strip $schema so Ajv doesn't try to fetch the meta-schema URL.
const baseSchema = schemaJson as Record<string, unknown>;
const { $schema: _unused, $id: _unusedId, ...schemaWithoutMeta } = baseSchema;
void _unused;
void _unusedId;
const webSchema = {
  ...schemaWithoutMeta,
  required: ((baseSchema.required as string[] | undefined) ?? []).filter(
    (k) => k !== "componentes_file",
  ),
};
const validate = ajv.compile(webSchema);

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateRfi(rfi: RfiDict): ValidationResult {
  const ok = validate(rfi) as boolean;
  if (ok) return { ok: true, errors: [] };
  const errors = (validate.errors ?? []).map((e) => {
    const path = e.instancePath || "(root)";
    return `${path}: ${e.message ?? "invalid"}`;
  });
  return { ok: false, errors };
}

// Peru lon ranges per UTM zone (rough — used to flag mis-projected components).
const PERU_LON_BY_ZONE: Record<number, [number, number]> = {
  17: [-82.0, -78.0],
  18: [-78.0, -72.0],
  19: [-72.0, -68.0],
};

export interface CrossValidationReport {
  declared_platforms: number;
  actual_platforms: number;
  declared_area_ha: number;
  computed_area_ha: number;
  warnings: string[];
}

export function crossValidate(
  rfi: RfiDict,
  features: ComponentFeature[],
): CrossValidationReport {
  const componentes = (rfi.componentes_proyecto ?? {}) as Record<string, unknown>;
  const A = (componentes.A_exploracion_directa ?? {}) as Record<string, Record<string, unknown>>;
  const plat = (A.plataformas_perforacion ?? {}) as { cantidad?: number };
  const declaredPlat = Number(plat.cantidad ?? 0);
  const actualPlat = features.filter((f) => f.tipo === "plataforma").length;

  const proyecto = (rfi.proyecto ?? {}) as Record<string, unknown>;
  const declaredAreaHa = Number(proyecto.area_total_ha ?? 0);
  const totalAreaM2 = features.reduce((sum, f) => sum + (f.area_m2 || 0), 0);
  let computedAreaHa = totalAreaM2 / 10_000;
  if (computedAreaHa === 0 && actualPlat > 0) {
    // Same fallback the Python ingestor uses: 2500 m² × platforms × 1.2.
    computedAreaHa = (actualPlat * 2500 * 1.2) / 10_000;
  }

  const warnings: string[] = [];

  if (declaredPlat > 0 && actualPlat > 0) {
    const delta = Math.abs(declaredPlat - actualPlat) / declaredPlat;
    if (delta > 0.2) {
      warnings.push(
        `Plataformas declaradas (${declaredPlat}) difieren del archivo (${actualPlat}) en ${(delta * 100).toFixed(0)}% (>20%).`,
      );
    }
  } else if (declaredPlat === 0 && actualPlat > 0) {
    warnings.push(
      `Archivo contiene ${actualPlat} plataformas pero el RFI declara 0.`,
    );
  } else if (declaredPlat > 0 && actualPlat === 0) {
    warnings.push(
      `RFI declara ${declaredPlat} plataformas pero ninguna fue detectada.`,
    );
  }

  if (declaredAreaHa > 0 && computedAreaHa > 0) {
    const delta = Math.abs(declaredAreaHa - computedAreaHa) / declaredAreaHa;
    if (delta > 0.25) {
      warnings.push(
        `Área declarada (${declaredAreaHa.toFixed(2)} ha) difiere de la computada (${computedAreaHa.toFixed(2)} ha) en ${(delta * 100).toFixed(0)}% (>25%).`,
      );
    }
  }

  const zona = Number(proyecto.zona_utm);
  if (Number.isFinite(zona) && PERU_LON_BY_ZONE[zona] && features.length > 0) {
    const [lo, hi] = PERU_LON_BY_ZONE[zona];
    const lons = features.map((f) => f.lon);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    if (!(lo - 0.5 <= minLon && maxLon <= hi + 0.5)) {
      warnings.push(
        `Componentes (lon ${minLon.toFixed(2)}..${maxLon.toFixed(2)}) fuera de la franja típica para zona UTM ${zona}S.`,
      );
    }
  }

  return {
    declared_platforms: declaredPlat,
    actual_platforms: actualPlat,
    declared_area_ha: declaredAreaHa,
    computed_area_ha: computedAreaHa,
    warnings,
  };
}
