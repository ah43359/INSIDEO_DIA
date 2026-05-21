import { buildChapterDocumentBuffer } from "@/lib/dia/framework/document";
import type { ChapterState } from "@/lib/dia/framework/state";
import {
  buildLineaBase,
  buildLbFisico,
  buildLbBiologico,
  buildLbSocial,
  type BaselineKind,
} from "./sections";

const BASELINE_META: Record<BaselineKind, { label: string; build: (s: ChapterState) => ReturnType<typeof buildLineaBase> }> = {
  fisico: { label: "Línea Base Física", build: buildLbFisico },
  biologico: { label: "Línea Base Biológica", build: buildLbBiologico },
  social: { label: "Línea Base Socio-cultural", build: buildLbSocial },
};

/**
 * Build the Cap 3 document. With no `baseline`, returns the combined Línea Base.
 * With a `baseline`, returns just that medio as an independent annex document.
 */
export async function buildCap3Document(
  state: ChapterState,
  projectName: string,
  baseline?: BaselineKind,
): Promise<Buffer> {
  const meta = baseline ? BASELINE_META[baseline] : null;
  return buildChapterDocumentBuffer({
    body: meta ? meta.build(state) : buildLineaBase(state),
    projectName,
    headerLabel: "Cap. 3",
    footerLabel: meta ? `${meta.label} – Página` : "Capítulo 3 – Página",
  });
}
