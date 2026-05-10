import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import type { ChapterState } from "@/lib/dia/framework/state";
import { buildImpactos } from "./sections";

export async function buildCap5Document(
  state: ChapterState,
  projectName: string,
): Promise<Buffer> {
  return buildChapterDocumentBuffer({
    body: buildImpactos(state),
    projectName,
    headerLabel: "Cap. 5",
    footerLabel: "Capítulo 5 – Página",
  });
}
