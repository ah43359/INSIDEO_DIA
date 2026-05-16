import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/with-auth";
import { buildPdtDocument, type PdtData } from "@/lib/pdt/document";
import type { PdtStation } from "@/lib/pdt/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface StationRow {
  id: string;
  kind: string;
  station_code: string;
  rationale: string | null;
  geom_geojson: string;
}

interface RequestBody {
  mapImageDataUrl?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  const auth = await requireUser();
  if (!auth.authenticated) return auth.response;
  const { supabase } = auth.value;

  // Parse optional body (map screenshot)
  let mapImageDataUrl: string | null = null;
  try {
    const body = (await request.json()) as RequestBody;
    mapImageDataUrl = body.mapImageDataUrl ?? null;
  } catch {
    // body is optional
  }

  // Load project + client
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, clientes(razon_social, domicilio)")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    if (projectError) console.error("[api/pdt] project lookup failed", projectError);
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  // Load sampling stations
  const { data: stationRows } = await supabase.rpc("get_sampling_stations_for_project", {
    p_project_id: id,
  });

  const stations: PdtStation[] = ((stationRows ?? []) as StationRow[])
    .filter((s) => s.geom_geojson)
    .map((s) => {
      let lon = 0;
      let lat = 0;
      try {
        const geom = JSON.parse(s.geom_geojson) as { type: string; coordinates: [number, number] };
        if (geom.type === "Point") {
          [lon, lat] = geom.coordinates;
        }
      } catch {
        // skip malformed
      }
      return {
        station_code: s.station_code,
        kind: s.kind,
        lon,
        lat,
        referencia: s.rationale,
      };
    })
    .filter((s) => s.lon !== 0 || s.lat !== 0);

  // Resolve nested client object (Supabase join returns object or array)
  const clientRaw = (project as unknown as { clientes: { razon_social: string; domicilio: string | null } | null }).clientes;
  const clientRazonSocial = clientRaw?.razon_social ?? "—";
  const clientDomicilio = clientRaw?.domicilio ?? null;

  type ProjectRow = { nombre_proyecto: string; codigo_cm: string | null };
  const proj = project as unknown as ProjectRow;

  const pdtData: PdtData = {
    projectName: proj.nombre_proyecto,
    clientRazonSocial,
    clientDomicilio,
    projectNumber: proj.codigo_cm ?? null,
    stations,
    mapImageDataUrl,
  };

  const docBuffer = await buildPdtDocument(pdtData);
  const filename = `PdT_${proj.nombre_proyecto.replace(/\s+/g, "_")}.docx`;

  return new NextResponse(new Uint8Array(docBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": docBuffer.length.toString(),
    },
  });
}
