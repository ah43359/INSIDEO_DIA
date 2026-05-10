// DIA chapter registry.
//
// Lists all 7 chapters defined by RM 108-2018-MEM/DM Anexo I (Categoría I)
// with their implementation status. The dynamic route at
// /projects/[id]/dia/[chapter] reads this to decide whether to render a
// real editor or a "no implementado aún" placeholder.

import type { ChapterId } from "./framework/manifest";
import { CHAPTER_TITLES } from "./framework/manifest";

export type ChapterStatus = "editable" | "planned";

export interface ChapterRegistryEntry {
  id: ChapterId;
  shortTitle: string;
  status: ChapterStatus;
  /** Long header title shown on the chapter page. */
  longTitle: string;
}

export const DIA_CHAPTERS: readonly ChapterRegistryEntry[] = [
  {
    id: 1,
    shortTitle: CHAPTER_TITLES[1],
    status: "editable",
    longTitle: "Capítulo 1 — Resumen Ejecutivo",
  },
  {
    id: 2,
    shortTitle: CHAPTER_TITLES[2],
    status: "editable",
    longTitle: "Capítulo 2 — Descripción del Proyecto",
  },
  { id: 3, shortTitle: CHAPTER_TITLES[3], status: "editable", longTitle: "Capítulo 3 — Línea Base" },
  {
    id: 4,
    shortTitle: CHAPTER_TITLES[4],
    status: "editable",
    longTitle: "Capítulo 4 — Plan de Participación Ciudadana",
  },
  {
    id: 5,
    shortTitle: CHAPTER_TITLES[5],
    status: "editable",
    longTitle: "Capítulo 5 — Identificación, Caracterización y Valoración de los Impactos",
  },
  {
    id: 6,
    shortTitle: CHAPTER_TITLES[6],
    status: "editable",
    longTitle: "Capítulo 6 — Plan de Manejo Ambiental",
  },
  { id: 7, shortTitle: CHAPTER_TITLES[7], status: "editable", longTitle: "Capítulo 7 — Empresa Consultora" },
];

export function findChapter(id: number): ChapterRegistryEntry | null {
  return DIA_CHAPTERS.find((c) => c.id === id) ?? null;
}

export function isValidChapterId(value: number): value is ChapterId {
  return value >= 1 && value <= 7 && Number.isInteger(value);
}
