"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeIneiDistrict } from "@/lib/inei/scraper";

// GET — return stored social baseline for the project (no scraping)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_social_baseline_for_project", {
    p_project_id: id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data?.[0] ?? null });
}

// POST — resolve ubigeo, scrape INEI, upsert results
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Resolve ubigeo
  const { data: ubigeoData, error: ubigeoError } = await supabase.rpc(
    "resolve_district_ubigeo",
    { p_project_id: id },
  );
  if (ubigeoError) {
    return NextResponse.json({ error: ubigeoError.message }, { status: 500 });
  }

  const ubigeo = ubigeoData as string | null;
  if (!ubigeo) {
    // Fall back to project text fields so scraping can still proceed
    // with district name even if ubigeo lookup fails.
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("distrito, provincia, region")
      .eq("id", id)
      .single();
    if (pErr || !project) {
      return NextResponse.json(
        { error: "No se pudo resolver el ubigeo del distrito" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error: `Distrito "${project.distrito}" no encontrado en ref_distritos. Verificar que la capa de distritos esté ingestada.`,
      },
      { status: 422 },
    );
  }

  // 2. Fetch project metadata to label the cache row
  const { data: project } = await supabase
    .from("projects")
    .select("distrito, provincia, region")
    .eq("id", id)
    .single();

  // 3. Scrape INEI
  const { data: scraped, sourcesHit, errors } = await scrapeIneiDistrict(ubigeo);

  // 4. Upsert cache row (even if all sources failed — stores the ubigeo for future use)
  const { error: upsertError } = await supabase
    .from("inei_district_data")
    .upsert(
      {
        ubigeo,
        nombre:       project?.distrito ?? null,
        provincia:    project?.provincia ?? null,
        departamento: project?.region ?? null,
        data_year:    scraped.data_year,
        fetched_at:   scraped.fetched_at,
        demografia:   scraped.demografia,
        educacion:    scraped.educacion,
        salud:        scraped.salud,
        vivienda:     scraped.vivienda,
        economia:     scraped.economia,
        indices:      scraped.indices,
        fuentes:      scraped.fuentes,
      },
      { onConflict: "ubigeo" },
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // 5. Link project → ubigeo
  const { error: linkError } = await supabase
    .from("project_social_baseline")
    .upsert(
      { project_id: id, ubigeo, updated_at: new Date().toISOString() },
      { onConflict: "project_id" },
    );

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // 6. Return merged result
  const { data: merged } = await supabase.rpc(
    "get_social_baseline_for_project",
    { p_project_id: id },
  );

  return NextResponse.json({
    data: merged?.[0] ?? null,
    sourcesHit,
    scrapeErrors: errors,
  });
}
