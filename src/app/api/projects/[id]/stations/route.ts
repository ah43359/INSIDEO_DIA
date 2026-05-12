import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/with-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireUser();
  if (!auth.authenticated) return auth.response;
  const { supabase } = auth.value;

  const body = await request.json();
  const {
    station_id,
    custom_name,
    coord_este,
    coord_norte,
    utm_zone,
    datum,
    altitud_m,
    target_receptor_nombre,
  } = body ?? {};

  if (!station_id) {
    return NextResponse.json({ error: "station_id requerido" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (custom_name !== undefined) patch.custom_name = custom_name;
  if (coord_este !== undefined) patch.coord_este = coord_este;
  if (coord_norte !== undefined) patch.coord_norte = coord_norte;
  if (utm_zone !== undefined) patch.utm_zone = utm_zone;
  if (datum !== undefined) patch.datum = datum;
  if (altitud_m !== undefined) patch.altitud_m = altitud_m;
  if (target_receptor_nombre !== undefined) patch.target_receptor_nombre = target_receptor_nombre;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { error } = await supabase
    .from("project_sampling_stations")
    .update(patch)
    .eq("id", station_id)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}