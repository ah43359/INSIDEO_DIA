// POST /api/projects/[id]/dia
//
// Body: { chapters: { 1?: ChapterExportV7, 2?: Cap2ExportV7, ... } }
//
// Concatenates per-chapter section paragraphs into a single .docx with the
// shared framework styles (Heading1/2/3, header, footer, bullets).
// Chapters not present in the body emit a "[Capítulo N — pendiente]"
// placeholder so the file structure is stable across iterations.

import { NextResponse, type NextRequest } from "next/server";
import type { Paragraph } from "docx";
import { createClient } from "@/lib/supabase/server";
import { buildResumenEjecutivo } from "@/lib/dia/cap1/sections";
import {
  buildAntecedentes,
  buildCronograma,
  buildDelimitacion,
  buildDescripcion,
  buildInfluencia,
  buildIntro as buildCap2Intro,
  buildLocalizacion,
  buildObjetivos,
} from "@/lib/dia/cap2/sections";
import { fromExportV7 as fromCap2ExportV7 } from "@/lib/dia/cap2/state";
import { fromChapterExportV7 } from "@/lib/dia/framework/state";
import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import { bodyP, sectionHeading } from "@/lib/dia/framework/styles";
import { DIA_CHAPTERS } from "@/lib/dia/chapters";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RequestBody {
  chapters?: Record<string, unknown>;
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

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo" }, { status: 400 });
  }
  const chapters = body.chapters ?? {};

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

  const allParagraphs: Paragraph[] = [];

  for (const entry of DIA_CHAPTERS) {
    const payload = chapters[String(entry.id)];

    if (entry.id === 1 && payload) {
      try {
        const state = fromChapterExportV7(payload);
        allParagraphs.push(...buildResumenEjecutivo(state));
        continue;
      } catch {
        // fall through to placeholder
      }
    }

    if (entry.id === 2 && payload) {
      try {
        const state = fromCap2ExportV7(payload);
        allParagraphs.push(sectionHeading(1, entry.longTitle));
        allParagraphs.push(...buildCap2Intro(state));
        allParagraphs.push(...buildAntecedentes(state));
        allParagraphs.push(...buildObjetivos(state));
        allParagraphs.push(...buildLocalizacion(state));
        allParagraphs.push(...buildDelimitacion(state));
        allParagraphs.push(...buildInfluencia(state));
        allParagraphs.push(...buildCronograma(state));
        allParagraphs.push(...buildDescripcion(state));
        continue;
      } catch {
        // fall through to placeholder
      }
    }

    // Placeholder
    allParagraphs.push(sectionHeading(1, entry.longTitle));
    allParagraphs.push(
      bodyP(
        entry.status === "editable"
          ? `[Capítulo ${entry.id} — sin borrador guardado en este navegador. Edita el capítulo y vuelve a generar.]`
          : `[Capítulo ${entry.id} — pendiente de implementación.]`,
      ),
    );
  }

  const buffer = await buildChapterDocumentBuffer({
    body: allParagraphs,
    projectName,
    headerLabel: "DIA",
    footerLabel: "DIA – Página",
  });

  const sanitized = projectName
    .replace(/[^a-zA-Z0-9à-ü\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60) || "proyecto";
  const filename = `DIA_${sanitized}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
