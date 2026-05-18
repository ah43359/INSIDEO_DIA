"use client";

// Cap 1 — Resumen Ejecutivo / Datos del Titular.
//
// Thin chapter-specific wrapper over the shared ChapterEditor. Use the
// `headerExtras` / `sidebarTopExtras` / `sidebarBottomExtras` slots to add
// Cap 1-specific UI (e.g. titular vs proyecto picker, cross-chapter
// resumen preview).

import ChapterEditor from "@/components/dia/ChapterEditor";
import { DG_FIELDS, SECTIONS } from "@/lib/dia/cap1/fields";
import type { ChapterState } from "@/lib/dia/framework/state";

export interface Cap1EditorProps {
  projectId: string;
  projectName: string;
  chapterTitle: string;
  prefill: ChapterState;
  warnings: readonly string[];
}

export default function Cap1Editor({
  projectId,
  projectName,
  chapterTitle,
  prefill,
  warnings,
}: Cap1EditorProps) {
  return (
    <ChapterEditor
      chapterId={1}
      chapterTitle={chapterTitle}
      projectId={projectId}
      projectName={projectName}
      prefill={prefill}
      warnings={warnings}
      sections={SECTIONS}
      dgGroups={DG_FIELDS}
      initialActiveId="1.1"
      initiallyOpenIds={["1.0"]}
    />
  );
}
