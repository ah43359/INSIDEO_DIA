// POST /api/projects/[id]/dia/[chapter]/synthesize
//
// Body:
//   {
//     sections: { sectionId: string; sectionTitle: string;
//                 userFields: Record<string,string> }[]
//   }
//
// Response:
//   {
//     results: { sectionId, content, citations, passagesRetrieved }[]
//     errors: { sectionId, message }[]
//   }
//
// Loads the project (for ProjectFacts), runs the per-section RAG
// pipeline, returns the synthesized prose. Caller is responsible for
// previewing in a modal and writing accepted content into
// state.content[sectionId].

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findChapter, isValidChapterId } from "@/lib/dia/chapters";
import {
  synthesizeSections,
  type SynthesisInput,
} from "@/lib/dia/rag/synthesize";
import type { ProjectFacts } from "@/lib/dia/rag/prompts";

interface RouteParams {
  params: Promise<{ id: string; chapter: string }>;
}

interface RequestBody {
  sections?: ReadonlyArray<{
    sectionId: string;
    sectionTitle: string;
    userFields?: Record<string, string>;
  }>;
}

export const maxDuration = 120; // seconds — synthesis can be slow with concurrency

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
  if (!entry) return NextResponse.json({ error: "Capítulo no encontrado" }, { status: 404 });

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
  const sections = body.sections ?? [];
  if (sections.length === 0) {
    return NextResponse.json({ error: "No se solicitaron secciones para sintetizar" }, { status: 400 });
  }
  if (sections.length > 50) {
    return NextResponse.json(
      { error: `Demasiadas secciones (${sections.length}). Máximo 50 por request.` },
      { status: 400 },
    );
  }

  // Load project facts for the prompt
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("nombre_proyecto, distrito, provincia, region")
    .eq("id", id)
    .single();
  if (projErr || !project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado", detail: projErr?.message },
      { status: 404 },
    );
  }
  const proj = project as {
    nombre_proyecto: string;
    distrito: string | null;
    provincia: string | null;
    region: string | null;
  };

  const projectFacts: ProjectFacts = {
    nombre: proj.nombre_proyecto,
    distrito: proj.distrito ?? undefined,
    provincia: proj.provincia ?? undefined,
    region: proj.region ?? undefined,
  };

  // Confirm the corpus has any rows for this chapter — fail loudly if not,
  // so the user knows to run the indexer.
  const { count, error: countErr } = await supabase
    .from("dia_corpus_examples")
    .select("id", { count: "exact", head: true })
    .eq("chapter_num", chapterNum);
  if (countErr) {
    return NextResponse.json({ error: "Error consultando corpus", detail: countErr.message }, { status: 500 });
  }
  if (!count || count === 0) {
    return NextResponse.json(
      {
        error: `El corpus para el Capítulo ${chapterNum} está vacío. Ejecuta el indexador (scripts/dia-corpus/index-cap.ts) con DIAs aprobados antes de usar Generar con IA.`,
      },
      { status: 412 },
    );
  }

  const input: SynthesisInput = {
    chapterNum,
    project: projectFacts,
    sections: sections.map((s) => ({
      sectionId: s.sectionId,
      sectionTitle: s.sectionTitle,
      userFields: s.userFields ?? {},
    })),
  };

  try {
    const result = await synthesizeSections(supabase, input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Error en la síntesis", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
