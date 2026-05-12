import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/with-auth";
import { buildCap1Document } from "@/lib/dia/cap1/document";
import { buildCap2Document } from "@/lib/dia/cap2/document";
import { buildCap3Document } from "@/lib/dia/cap3/document";
import { buildCap4Document } from "@/lib/dia/cap4/document";
import { buildCap5Document } from "@/lib/dia/cap5/document";
import { buildCap6Document } from "@/lib/dia/cap6/document";
import { buildCap7Document } from "@/lib/dia/cap7/document";
import { fromExportV7 as fromCap2ExportV7 } from "@/lib/dia/cap2/state";
import { fromChapterExportV7 } from "@/lib/dia/framework/state";
import { findChapter, isValidChapterId } from "@/lib/dia/chapters";

interface RouteParams {
  params: Promise<{ id: string; chapter: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id, chapter } = await params;
  const chapterNum = Number.parseInt(chapter, 10);
  if (!Number.isFinite(chapterNum) || !isValidChapterId(chapterNum)) {
    return NextResponse.json({ error: "Capítulo inválido" }, { status: 400 });
  }
  const entry = findChapter(chapterNum);
  if (!entry || entry.status !== "editable") {
    return NextResponse.json({ error: "Capítulo no disponible" }, { status: 404 });
  }

  const auth = await requireUser();
  if (!auth.authenticated) return auth.response;
  const { supabase } = auth.value;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo" }, { status: 400 });
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

  let buffer: Buffer;
  try {
    if (entry.id === 2) {
      const cap2State = fromCap2ExportV7(body);
      buffer = await buildCap2Document(cap2State, projectName);
    } else {
      const state = fromChapterExportV7(body);
      switch (entry.id) {
        case 1:
          buffer = await buildCap1Document(state, projectName);
          break;
        case 3:
          buffer = await buildCap3Document(state, projectName);
          break;
        case 4:
          buffer = await buildCap4Document(state, projectName);
          break;
        case 5:
          buffer = await buildCap5Document(state, projectName);
          break;
        case 6:
          buffer = await buildCap6Document(state, projectName);
          break;
        case 7:
          buffer = await buildCap7Document(state, projectName);
          break;
        default:
          return NextResponse.json({ error: "Capítulo no disponible" }, { status: 404 });
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Estado de capítulo inválido", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const sanitizedProject = projectName
    .replace(/[^a-zA-Z0-9à-ü\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60) || "proyecto";
  const filename = `Cap${entry.id}_${entry.shortTitle.replace(/\s+/g, "_")}_${sanitizedProject}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
