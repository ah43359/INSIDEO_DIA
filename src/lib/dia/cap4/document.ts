import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import type { ChapterState } from "@/lib/dia/framework/state";
import { buildParticipacion } from "./sections";

export async function buildCap4Document(
  state: ChapterState,
  projectName: string,
): Promise<Buffer> {
  return buildChapterDocumentBuffer({
    body: buildParticipacion(state),
    projectName,
    headerLabel: "Cap. 4",
    footerLabel: "Capítulo 4 – Página",
  });
}
