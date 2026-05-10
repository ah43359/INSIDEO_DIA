// Capítulo 6 — PMA: docx body builder.
//
// Walks the SECTIONS tree from fields.ts and emits Heading + body paragraphs
// for each node. For leaves with a structuredType, renders the dgFields as
// a labeled key:value list. For leaves without one (free-text), renders
// state.content[sectionId] (which may be user-typed or AI-synthesized).
//
// The structure mirrors approved DIA Cap. 6 documents; the prose comes
// from the user (or RAG synthesis) so this builder is intentionally
// agnostic to the actual content.

import type { Paragraph } from "docx";
import { bodyP, bulletP, sectionHeading } from "@/lib/dia/framework/styles";
import type { ChapterState } from "@/lib/dia/framework/state";
import { DG_FIELDS, SECTIONS, type DgGroupKey, type SectionNode } from "./fields";

export function buildPma(state: ChapterState): Paragraph[] {
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "6.0 Plan de Manejo Ambiental"));
  // Brief intro that always appears
  out.push(
    bodyP(
      "En el presente capítulo se describen las medidas de gestión ambiental y social diseñadas para prevenir, mitigar y controlar los impactos potenciales identificados durante el desarrollo de las actividades del Proyecto, así como los planes específicos asociados (Vigilancia Ambiental, Manejo de Residuos Sólidos, Contingencias, Relaciones Comunitarias, Cierre y Post-Cierre).",
    ),
  );

  // Walk children of 6.0 (i.e. 6.0.0, 6.1, 6.2, ..., 6.9)
  const root = SECTIONS[0];
  for (const node of root.children) {
    appendSection(out, node, state);
  }

  return out;
}

function appendSection(out: Paragraph[], node: SectionNode, state: ChapterState): void {
  // Heading: framework supports level 1, 2, 3.
  // Our tree has levels 1 (6.X), 2 (6.X.Y), 3 (6.X.Y.z). Cap to 3.
  const headingLevel = (Math.min(Math.max(node.level, 1), 3) as 1 | 2 | 3);
  out.push(sectionHeading(headingLevel, node.title));

  // If this node has a structuredType, render its dgFields
  if (node.structuredType) {
    appendStructured(out, node.structuredType, state);
  }

  // If this node has free-text content (user-typed or AI-synthesized), append it.
  // This applies to both leaf sections without structuredType AND sections with
  // structuredType where the user provided extra narrative.
  const freeText = state.content[node.id]?.trim();
  if (freeText) {
    appendFreeText(out, freeText);
  } else if (!node.structuredType && node.children.length === 0) {
    // Leaf with neither structured fields nor content — emit a hint placeholder.
    out.push(bodyP(`[Completar — ver ejemplos aprobados o usar "Generar con IA"]`));
  }

  // Recurse into children
  for (const child of node.children) {
    appendSection(out, child, state);
  }
}

function appendStructured(out: Paragraph[], groupKey: DgGroupKey, state: ChapterState): void {
  const fields = DG_FIELDS[groupKey];
  if (!fields) return;
  for (const f of fields) {
    const value = state.dgFields[f.key]?.trim();
    if (!value) continue;
    if (f.multiline && value.includes("\n")) {
      // Render as label paragraph + bullets per line
      out.push(bodyP(`${f.label}:`));
      for (const line of value.split("\n").filter((l) => l.trim())) {
        out.push(bulletP(line.trim()));
      }
    } else {
      out.push(bodyP(`${f.label}: ${value}`));
    }
  }
}

function appendFreeText(out: Paragraph[], text: string): void {
  // Detect bullet-style content (lines starting with "- " or "• " or "* ")
  // and render those as bullets; otherwise render as paragraphs.
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  let buffer: string[] = [];
  const flushParagraph = (): void => {
    if (buffer.length > 0) {
      out.push(bodyP(buffer.join(" ")));
      buffer = [];
    }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      out.push(bulletP(bulletMatch[1]));
    } else {
      buffer.push(trimmed);
    }
  }
  flushParagraph();
}
