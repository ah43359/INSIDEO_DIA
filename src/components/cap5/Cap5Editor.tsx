"use client";

// Cap 5 — Identificación y Evaluación de Impactos.
//
// Thin wrapper over the shared ChapterEditor. Future Cap 5-specific UI
// (Conesa matrix builder, impact significance grid) hooks in via the slot
// props.

import ChapterEditor from "@/components/dia/ChapterEditor";
import { DG_FIELDS, SECTIONS } from "@/lib/dia/cap5/fields";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface Cap5EditorProps {
  projectId: string;
  projectName: string;
  chapterTitle: string;
  prefill: ChapterState;
  warnings: readonly string[];
}

export default function Cap5Editor({
  projectId,
  projectName,
  chapterTitle,
  prefill,
  warnings,
}: Cap5EditorProps) {
  return (
    <ChapterEditor
      chapterId={5}
      chapterTitle={chapterTitle}
      projectId={projectId}
      projectName={projectName}
      prefill={prefill}
      warnings={warnings}
      sections={SECTIONS}
      dgGroups={DG_FIELDS}
      initialActiveId="5.1"
      initiallyOpenIds={["5.0"]}
    />
  );
}
