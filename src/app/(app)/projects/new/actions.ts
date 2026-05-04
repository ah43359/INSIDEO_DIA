"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseRfiXlsx } from "@/lib/intake/parse-xlsx";
import { parseComponents } from "@/lib/intake/parse-components";
import { validateRfi, crossValidate } from "@/lib/intake/validate";
import { submitRfi } from "@/lib/intake/submit";

function errorRedirect(msg: string): never {
  redirect(`/projects/new?error=${encodeURIComponent(msg)}`);
}

export async function importRfi(formData: FormData): Promise<void> {
  const rfiFile = formData.get("rfi") as File | null;
  const componentsFile = formData.get("components") as File | null;

  if (!rfiFile || rfiFile.size === 0) {
    errorRedirect("Adjunta el archivo RFI .xlsx.");
  }
  if (!componentsFile || componentsFile.size === 0) {
    errorRedirect("Adjunta el archivo de componentes (.csv o .geojson).");
  }

  // 1. Parse RFI .xlsx
  let rfi;
  try {
    rfi = await parseRfiXlsx(await rfiFile.arrayBuffer());
  } catch (e) {
    errorRedirect(`No se pudo leer el RFI: ${(e as Error).message}`);
  }

  // 2. Validate against schema
  const validation = validateRfi(rfi);
  if (!validation.ok) {
    errorRedirect(
      `RFI inválido — ${validation.errors.slice(0, 3).join(" | ")}`,
    );
  }

  // 3. Parse components file using declared zona_utm
  const declaredZonaUtm = Number(
    (rfi.proyecto as { zona_utm?: number }).zona_utm ?? 18,
  );
  const componentsBytes = await componentsFile.arrayBuffer();
  let features;
  try {
    features = await parseComponents(componentsBytes, {
      filename: componentsFile.name,
      declaredZonaUtm,
    });
  } catch (e) {
    errorRedirect(`Componentes: ${(e as Error).message}`);
  }
  if (features.length === 0) {
    errorRedirect("El archivo de componentes está vacío.");
  }

  // 4. Cross-validate
  const report = crossValidate(rfi, features);

  // 5. Submit to Supabase
  const supabase = await createClient();
  let result;
  try {
    const rfiBytes = await rfiFile.arrayBuffer();
    result = await submitRfi(supabase, rfi, features, report, {
      rfiXlsx: { name: rfiFile.name, bytes: rfiBytes },
      componentsFile: {
        name: componentsFile.name,
        bytes: componentsBytes,
      },
    });
  } catch (e) {
    errorRedirect(`Guardado en Supabase: ${(e as Error).message}`);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${result.project_id}`);
  redirect(`/projects/${result.project_id}?imported=1`);
}
