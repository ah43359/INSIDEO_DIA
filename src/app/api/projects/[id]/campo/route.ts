import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/with-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireUser();
  if (!auth.authenticated) return auth.response;
  const { supabase } = auth.value;

  const { data, error } = await supabase
    .from("campo_planificacion")
    .select("*")
    .eq("project_id", id)
    .single();

  // PGRST116 = row not found — that's fine, return null
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireUser();
  if (!auth.authenticated) return auth.response;
  const { supabase } = auth.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (await request.json()) as Record<string, any>;

  const { error } = await supabase.from("campo_planificacion").upsert(
    {
      project_id: id,
      laboratorios: body.laboratorios ?? [],
      biologicos: body.biologicos ?? [],
      inspectores: body.inspectores ?? [],
      sociales: body.sociales ?? [],
      logistica_email: body.logistica_email ?? null,
      notas_generales: body.notas_generales ?? null,
      hse_personal: body.hse_personal ?? [],
      hse_vehiculos: body.hse_vehiculos ?? [],
      hse_env: body.hse_env ?? {},
      vehiculos_requeridos: body.vehiculos_requeridos ?? 0,
      budget: body.budget ?? { presupuesto: 0, moneda: "PEN", gastos: [] },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
