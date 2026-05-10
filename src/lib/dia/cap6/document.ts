import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import type { ChapterState } from "@/lib/dia/framework/state";
import { buildPma } from "./sections";

export async function buildCap6Document(
  state: ChapterState,
  projectName: string,
): Promise<Buffer> {
  return buildChapterDocumentBuffer({
    body: buildPma(state),
    projectName,
    headerLabel: "Cap. 6",
    footerLabel: "Capítulo 6 – Página",
  });
}
