// Capítulo 1 (Resumen Ejecutivo) standalone .docx builder.

import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import type { ChapterState } from "@/lib/dia/framework/state";
import { buildResumenEjecutivo } from "./sections";

export async function buildCap1Document(
  state: ChapterState,
  projectName: string,
): Promise<Buffer> {
  return buildChapterDocumentBuffer({
    body: buildResumenEjecutivo(state),
    projectName,
    headerLabel: "Cap. 1",
    footerLabel: "Capítulo 1 – Página",
  });
}
