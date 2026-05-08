// Client-side localStorage helpers for DIA chapter drafts.
//
// Each chapter persists under `dia:cap${id}:${projectId}`. The status check
// returns whether a draft exists and a rough completeness signal so the
// chapter index can render "vacío / borrador / completo".

import type { ChapterId } from "./manifest";
import type { ChapterFields, ChapterState } from "./state";

export function chapterStorageKey(chapterId: ChapterId, projectId: string): string {
  return `dia:cap${chapterId}:${projectId}`;
}

export function loadChapterState<S extends { introFields: ChapterFields; dgFields: ChapterFields; content: ChapterFields }>(
  chapterId: ChapterId,
  projectId: string,
  fallback: S,
): S {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(chapterStorageKey(chapterId, projectId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<S>;
    return {
      ...fallback,
      ...parsed,
      introFields: { ...fallback.introFields, ...(parsed.introFields ?? {}) },
      dgFields: { ...fallback.dgFields, ...(parsed.dgFields ?? {}) },
      content: { ...fallback.content, ...(parsed.content ?? {}) },
    };
  } catch {
    return fallback;
  }
}

export function saveChapterState(
  chapterId: ChapterId,
  projectId: string,
  state: ChapterState | object,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chapterStorageKey(chapterId, projectId), JSON.stringify(state));
  } catch {
    // Storage quota / permissions errors are non-fatal.
  }
}

export interface ChapterDraftStatus {
  hasDraft: boolean;
  filledFieldCount: number;
}

export function readChapterDraftStatus(
  chapterId: ChapterId,
  projectId: string,
): ChapterDraftStatus {
  if (typeof window === "undefined") return { hasDraft: false, filledFieldCount: 0 };
  try {
    const raw = window.localStorage.getItem(chapterStorageKey(chapterId, projectId));
    if (!raw) return { hasDraft: false, filledFieldCount: 0 };
    const parsed = JSON.parse(raw) as {
      introFields?: ChapterFields;
      dgFields?: ChapterFields;
      content?: ChapterFields;
    };
    const fields = [
      ...Object.values(parsed.introFields ?? {}),
      ...Object.values(parsed.dgFields ?? {}),
      ...Object.values(parsed.content ?? {}),
    ];
    const filled = fields.filter((v) => typeof v === "string" && v.trim().length > 0).length;
    return { hasDraft: true, filledFieldCount: filled };
  } catch {
    return { hasDraft: false, filledFieldCount: 0 };
  }
}
