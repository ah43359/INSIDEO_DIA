import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/with-auth";
import { buildCampoPlanDocument, type CampoPlanData } from "@/lib/campo/document";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireUser();
  if (!auth.authenticated) return auth.response;
  const { supabase } = auth.value;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("nombre_proyecto")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const { data: plan } = await supabase
    .from("campo_planificacion")
    .select("*")
    .eq("project_id", id)
    .single();

  type P = { nombre_proyecto: string };
  const projectName = (project as unknown as P).nombre_proyecto;

  const planData: CampoPlanData = {
    projectName,
    laboratorios: (plan as { laboratorios: CampoPlanData["laboratorios"] } | null)?.laboratorios ?? [],
    biologicos: (plan as { biologicos: CampoPlanData["biologicos"] } | null)?.biologicos ?? [],
    inspectores: (plan as { inspectores: CampoPlanData["inspectores"] } | null)?.inspectores ?? [],
    sociales: (plan as { sociales: CampoPlanData["sociales"] } | null)?.sociales ?? [],
    notas_generales: (plan as { notas_generales: string | null } | null)?.notas_generales ?? null,
  };

  const docBuffer = await buildCampoPlanDocument(planData);
  const filename = `PlanCampo_${projectName.replace(/\s+/g, "_")}.docx`;

  return new NextResponse(new Uint8Array(docBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": docBuffer.length.toString(),
    },
  });
}
