"use client";

// Cap 6 — Plan de Manejo Ambiental.
//
// Thin wrapper over the shared ChapterEditor. Cap 6 has nested 6.x.x
// sections; the initial open IDs match what the planner usually wants to
// see first (vigilancia + contingencias). Future per-chapter UI (cierre
// timeline, plan de vigilancia campaign editor) hooks in via the slots.

import ChapterEditor from "@/components/dia/ChapterEditor";
import { DG_FIELDS, SECTIONS } from "@/lib/dia/cap6/fields";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface Cap6EditorProps {
  projectId: string;
  projectName: string;
  chapterTitle: string;
  prefill: ChapterState;
  warnings: readonly string[];
}

export default function Cap6Editor({
  projectId,
  projectName,
  chapterTitle,
  prefill,
  warnings,
}: Cap6EditorProps) {
  return (
    <ChapterEditor
      chapterId={6}
      chapterTitle={chapterTitle}
      projectId={projectId}
      projectName={projectName}
      prefill={prefill}
      warnings={warnings}
      sections={SECTIONS}
      dgGroups={DG_FIELDS}
      initialActiveId="6.0.0"
      initiallyOpenIds={["6.0", "6.2", "6.3"]}
    />
  );
}
