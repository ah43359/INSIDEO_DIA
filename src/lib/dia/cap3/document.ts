import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import type { ChapterState } from "@/lib/dia/framework/state";
import { buildLineaBase } from "./sections";

export async function buildCap3Document(
  state: ChapterState,
  projectName: string,
): Promise<Buffer> {
  return buildChapterDocumentBuffer({
    body: buildLineaBase(state),
    projectName,
    headerLabel: "Cap. 3",
    footerLabel: "Capítulo 3 – Página",
  });
}
