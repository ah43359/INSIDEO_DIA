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
    .select("budget")
    .eq("project_id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data?.budget ?? null);
}

export async function PATCH(
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
