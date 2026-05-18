"use client";

// Cap 4 — Plan de Participación Ciudadana.
//
// Thin wrapper over the shared ChapterEditor. Add PPC-specific UI here:
// taller scheduler, actor-mapping table, convocatoria preview, etc.

import ChapterEditor from "@/components/dia/ChapterEditor";
import { DG_FIELDS, SECTIONS } from "@/lib/dia/cap4/fields";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface Cap4EditorProps {
  projectId: string;
  projectName: string;
  chapterTitle: string;
  prefill: ChapterState;
  warnings: readonly string[];
}

export default function Cap4Editor({
  projectId,
  projectName,
  chapterTitle,
  prefill,
  warnings,
}: Cap4EditorProps) {
  return (
    <ChapterEditor
      chapterId={4}
      chapterTitle={chapterTitle}
      projectId={projectId}
      projectName={projectName}
      prefill={prefill}
      warnings={warnings}
      sections={SECTIONS}
      dgGroups={DG_FIELDS}
      initialActiveId="4.1"
      initiallyOpenIds={["4.0"]}
    />
  );
}
