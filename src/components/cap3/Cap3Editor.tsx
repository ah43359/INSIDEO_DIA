"use client";

// Cap 3 — Línea Base.
//
// Wraps the shared ChapterEditor. The actual section/field structure lives
// in `lib/dia/cap3/fields.ts`. Per `BASELINE-SPEC.md`, Cap 3 will eventually
// fan out into three independent baseline documents (Físico / Biológico /
// Socio-cultural); when that lands, the split logic lives here (e.g. a
// baseline selector in `sidebarTopExtras`) instead of leaking into the
// shared editor.

import ChapterEditor from "@/components/dia/ChapterEditor";
import { DG_FIELDS, SECTIONS } from "@/lib/dia/cap3/fields";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface Cap3EditorProps {
  projectId: string;
  projectName: string;
  chapterTitle: string;
  prefill: ChapterState;
  warnings: readonly string[];
}

export default function Cap3Editor({
  projectId,
  projectName,
  chapterTitle,
  prefill,
  warnings,
}: Cap3EditorProps) {
  return (
    <ChapterEditor
      chapterId={3}
      chapterTitle={chapterTitle}
      projectId={projectId}
      projectName={projectName}
      prefill={prefill}
      warnings={warnings}
      sections={SECTIONS}
      dgGroups={DG_FIELDS}
      initialActiveId="3.1"
      initiallyOpenIds={["3.0", "3.2", "3.3", "3.4"]}
    />
  );
}
