// Generic chapter-manifest types shared across all DIA chapters.
//
// Each chapter under src/lib/dia/cap{N}/ contributes:
//   - a manifest (sections + fields)
//   - a derive function (project DB data → prefilled state)
//   - a docx builder (state → Paragraph[])
//
// These types are the contract.

export interface IntroField {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  readonly group: string;
}

export interface DgField {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  readonly multiline?: boolean;
}

export interface SectionNode<T extends string = string> {
  readonly id: string;
  readonly title: string;
  readonly level: number;
  readonly children: readonly SectionNode<T>[];
  readonly isIntro?: boolean;
  readonly structuredType?: T;
}

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const CHAPTER_TITLES: Readonly<Record<ChapterId, string>> = {
  1: "Resumen Ejecutivo",
  2: "Descripción del Proyecto",
  3: "Línea Base",
  4: "Plan de Participación Ciudadana",
  5: "Identificación, Caracterización y Valoración de los Impactos",
  6: "Plan de Manejo Ambiental",
  7: "Empresa Consultora",
};

export function findSection<T extends string>(
  id: string,
  nodes: readonly SectionNode<T>[],
): SectionNode<T> | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children.length) {
      const found = findSection(id, n.children);
      if (found) return found;
    }
  }
  return null;
}

export function collectSectionIds<T extends string>(
  nodes: readonly SectionNode<T>[],
  out: string[] = [],
): string[] {
  for (const n of nodes) {
    out.push(n.id);
    if (n.children.length) collectSectionIds(n.children, out);
  }
  return out;
}
