"use client";

// Cap 7 — Empresa Consultora.
//
// Thin wrapper over the shared ChapterEditor. Cap 7 lists profesionales,
// inscripción SENACE, anexos — mostly admin. Future per-chapter UI
// (profesionales table upload, CV pdf attach) hooks in via the slots.

import ChapterEditor from "@/components/dia/ChapterEditor";
import { DG_FIELDS, SECTIONS } from "@/lib/dia/cap7/fields";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface Cap7EditorProps {
  projectId: string;
  projectName: string;
  chapterTitle: string;
  prefill: ChapterState;
  warnings: readonly string[];
}

export default function Cap7Editor({
  projectId,
  projectName,
  chapterTitle,
  prefill,
  warnings,
}: Cap7EditorProps) {
  return (
    <ChapterEditor
      chapterId={7}
      chapterTitle={chapterTitle}
      projectId={projectId}
      projectName={projectName}
      prefill={prefill}
      warnings={warnings}
      sections={SECTIONS}
      dgGroups={DG_FIELDS}
      initialActiveId="7.1"
      initiallyOpenIds={["7.0"]}
    />
  );
}
