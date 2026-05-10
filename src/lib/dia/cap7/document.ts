import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import type { ChapterState } from "@/lib/dia/framework/state";
import { buildEmpresaConsultora } from "./sections";

export async function buildCap7Document(
  state: ChapterState,
  projectName: string,
): Promise<Buffer> {
  return buildChapterDocumentBuffer({
    body: buildEmpresaConsultora(state),
    projectName,
    headerLabel: "Cap. 7",
    footerLabel: "Capítulo 7 – Página",
  });
}
