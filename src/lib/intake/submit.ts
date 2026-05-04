/**
 * Persist a parsed-and-validated RFI + its components to Supabase.
 * Mirrors submit_rfi.py but uses @supabase/ssr (the user's authenticated session)
 * so RLS still applies — same single-tenant model.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RfiDict } from "./parse-xlsx";
import type { ComponentFeature } from "./parse-components";
import type { CrossValidationReport } from "./validate";

const CATEGORY_KEYS = [
  "A_exploracion_directa",
  "B_infraestructura_lineal",
  "C_auxiliares",
  "D_gestion_aguas",
  "E_residuos_y_materiales",
  "F_energia_y_combustibles",
] as const;

const BUCKET = "rfi-artifacts";

export interface SubmitResult {
  cliente_id: string;
  project_id: string;
  submission_id: string;
  inventario_rows: number;
  geom_rows: number;
  rfi_xlsx_path: string | null;
  components_file_path: string | null;
}

export async function submitRfi(
  supabase: SupabaseClient,
  rfi: RfiDict,
  features: ComponentFeature[],
  report: CrossValidationReport,
  artifacts: {
    rfiXlsx?: { name: string; bytes: ArrayBuffer };
    componentsFile?: { name: string; bytes: ArrayBuffer };
  },
): Promise<SubmitResult> {
  const cliente = rfi.cliente as Record<string, unknown>;
  const proyecto = rfi.proyecto as Record<string, unknown>;

  // 1. Upsert cliente by RUC
  const { data: clienteRow, error: clienteErr } = await supabase
    .from("clientes")
    .upsert(
      {
        razon_social: cliente.razon_social,
        ruc: cliente.ruc,
        domicilio: cliente.domicilio ?? null,
        representante: cliente.representante,
        dni_representante: cliente.dni_representante ?? null,
        cargo: cliente.cargo ?? null,
        telefono: cliente.telefono ?? null,
        correo: cliente.correo ?? null,
      },
      { onConflict: "ruc" },
    )
    .select("id")
    .single();
  if (clienteErr || !clienteRow) {
    throw new Error(`Upsert cliente: ${clienteErr?.message ?? "no row returned"}`);
  }
  const cliente_id = clienteRow.id as string;

  // 2. Upsert project on (cliente_id, nombre_proyecto)
  const { data: projectRow, error: projectErr } = await supabase
    .from("projects")
    .upsert(
      {
        cliente_id,
        nombre_proyecto: proyecto.nombre_proyecto,
        codigo_cm: proyecto.codigo_cm ?? null,
        region: proyecto.region,
        provincia: proyecto.provincia,
        distrito: proyecto.distrito,
        area_total_ha: proyecto.area_total_ha ?? null,
        zona_utm: proyecto.zona_utm,
        datum: proyecto.datum ?? "WGS 84",
        commodity: proyecto.commodity ?? null,
        metodo_exploracion: proyecto.metodo_exploracion ?? null,
        proyecto_brownfield: proyecto.proyecto_brownfield ?? false,
        iga_previo: proyecto.iga_previo_si_existe ?? null,
        concesiones: proyecto.concesiones ?? null,
        recursos: rfi.requerimientos_recursos ?? null,
        residuos: rfi.residuos ?? null,
        mano_obra: rfi.mano_obra ?? null,
        cronograma: rfi.cronograma ?? null,
      },
      { onConflict: "cliente_id,nombre_proyecto" },
    )
    .select("id")
    .single();
  if (projectErr || !projectRow) {
    throw new Error(`Upsert project: ${projectErr?.message ?? "no row returned"}`);
  }
  const project_id = projectRow.id as string;

  // 3. Replace componente_inventario rows
  const { error: delInvErr } = await supabase
    .from("componente_inventario")
    .delete()
    .eq("project_id", project_id);
  if (delInvErr) throw new Error(`Delete inventario: ${delInvErr.message}`);

  type InvRow = {
    project_id: string;
    categoria: string;
    componente: string;
    cantidad: number;
    attrs: Record<string, unknown> | null;
  };
  const invRows: InvRow[] = [];
  for (const cat of CATEGORY_KEYS) {
    const block = (rfi.componentes_proyecto?.[cat as keyof typeof rfi.componentes_proyecto] ??
      {}) as Record<string, Record<string, unknown>>;
    for (const [comp, attrs] of Object.entries(block)) {
      const cantidad = Number((attrs ?? {}).cantidad ?? 0);
      const rest = { ...attrs };
      delete (rest as Record<string, unknown>).cantidad;
      invRows.push({
        project_id,
        categoria: cat,
        componente: comp,
        cantidad: Number.isFinite(cantidad) ? Math.trunc(cantidad) : 0,
        attrs: Object.keys(rest).length > 0 ? rest : null,
      });
    }
  }
  const otros = (rfi.componentes_proyecto?.G_otros ?? []) as Array<{
    nombre: string;
    cantidad: number;
    descripcion?: string;
  }>;
  for (const o of otros) {
    invRows.push({
      project_id,
      categoria: "G_otros",
      componente: o.nombre,
      cantidad: o.cantidad,
      attrs: { descripcion: o.descripcion ?? "" },
    });
  }
  if (invRows.length > 0) {
    const { error: insInvErr } = await supabase
      .from("componente_inventario")
      .insert(invRows);
    if (insInvErr) throw new Error(`Insert inventario: ${insInvErr.message}`);
  }

  // 4. Replace components_geom rows
  const { error: delGeomErr } = await supabase
    .from("components_geom")
    .delete()
    .eq("project_id", project_id);
  if (delGeomErr) throw new Error(`Delete components_geom: ${delGeomErr.message}`);

  if (features.length > 0) {
    // PostGIS geometry columns don't accept GeoJSON via PostgREST insert directly,
    // so call an RPC that takes WKT and ST_GeomFromText's it.
    const geomRows = features.map((f) => ({
      project_id,
      nombre: f.nombre,
      tipo: f.tipo,
      categoria: f.categoria,
      area_m2: f.area_m2,
      longitud_tunel_m: f.longitud_tunel_m,
      geom_geojson: JSON.stringify(f.geometry),
    }));
    const { error: rpcErr } = await supabase.rpc("insert_components_geom", {
      rows: geomRows,
    });
    if (rpcErr) throw new Error(`Insert components_geom: ${rpcErr.message}`);
  }

  // 5. Upload originals to storage (best-effort — failures don't block the row writes)
  const slug = String(proyecto.nombre_proyecto).replace(/\s+/g, "_");
  const ruc = String(cliente.ruc);
  let rfi_xlsx_path: string | null = null;
  let components_file_path: string | null = null;

  if (artifacts.rfiXlsx) {
    const path = `${ruc}/${slug}/${artifacts.rfiXlsx.name}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, artifacts.rfiXlsx.bytes, { upsert: true });
    if (!upErr) rfi_xlsx_path = path;
  }
  if (artifacts.componentsFile) {
    const path = `${ruc}/${slug}/${artifacts.componentsFile.name}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, artifacts.componentsFile.bytes, { upsert: true });
    if (!upErr) components_file_path = path;
  }

  // 6. Append rfi_submissions audit row
  const { data: subRow, error: subErr } = await supabase
    .from("rfi_submissions")
    .insert({
      project_id,
      raw_rfi: rfi as unknown as Record<string, unknown>,
      rfi_xlsx_path,
      components_file_path,
      validation_report: null,
      warnings: report.warnings,
      errors: [],
      declared_platforms: report.declared_platforms,
      actual_platforms: report.actual_platforms,
      declared_area_ha: report.declared_area_ha,
      computed_area_ha: report.computed_area_ha,
      schema_ok: true,
      components_ingested: features.length > 0,
    })
    .select("id")
    .single();
  if (subErr || !subRow) {
    throw new Error(`Insert submission: ${subErr?.message ?? "no row returned"}`);
  }

  return {
    cliente_id,
    project_id,
    submission_id: subRow.id as string,
    inventario_rows: invRows.length,
    geom_rows: features.length,
    rfi_xlsx_path,
    components_file_path,
  };
}
