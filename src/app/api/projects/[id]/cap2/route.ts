import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCap2Document } from "@/lib/cap2/document";
import { fromExportV7 } from "@/lib/cap2/state";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", detail: authError?.message },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo" }, { status: 400 });
  }

  // The client posts the editor state in v7 export shape so this route is
  // also reusable as a JSON-import → docx endpoint without changes.
  let state;
  try {
    state = fromExportV7(body);
  } catch (err) {
    return NextResponse.json(
      { error: "Estado Cap. 2 inválido", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("nombre_proyecto")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado", detail: projectError?.message },
      { status: 404 },
    );
  }

  const projectName = (project as { nombre_proyecto: string }).nombre_proyecto;
  const docBuffer = await buildCap2Document(state, projectName);
  const sanitized = projectName.replace(/[^a-zA-Z0-9à-ü\s]/g, "").replace(/\s+/g, "_").slice(0, 60) || "proyecto";
  const filename = `Cap2_Descripcion_${sanitized}.docx`;

  return new NextResponse(new Uint8Array(docBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": docBuffer.length.toString(),
    },
  });
}
