// Parse a .docx file into a flat list of (sectionPath, content) sections.
//
// Word docs from approved DIAs use auto-numbering — section numbers like
// "6.2.1" don't appear in the heading text. We derive section numbers
// from heading-style nesting:
//
//   Ttulo1 / Heading1  → chapter root (the doc title — skip body, not indexed)
//   Ttulo2 / Heading2  → 6.1, 6.2, ...
//   Ttulo3 / Heading3  → 6.x.1, 6.x.2, ...
//   Ttulo4 / Heading4  → 6.x.y.a, 6.x.y.b, ...   (letters at this depth match approved format)
//   Ttulo5 / Heading5  → 6.x.y.a.1, ...
//   Ttulo6 / Heading6  → 6.x.y.a.1.1, ...
//
// Body paragraphs that follow a heading accumulate into that heading's
// section content until the next heading at any level.

import { readFile } from "node:fs/promises";

interface DocxParagraph {
  style: string;
  text: string;
}

async function readDocumentXml(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const JSZip = (await import("jszip")).default;
  const z = await JSZip.loadAsync(buf);
  const docFile = z.file("word/document.xml");
  if (!docFile) throw new Error(`No word/document.xml in ${filePath}`);
  return docFile.async("string");
}

function extractParagraphs(xml: string): DocxParagraph[] {
  const out: DocxParagraph[] = [];
  const paragraphRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = paragraphRe.exec(xml)) !== null) {
    const inner = m[1];
    const styleMatch = inner.match(/<w:pStyle\s+w:val="([^"]+)"/);
    const style = styleMatch?.[1] ?? "";
    const textRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let t: RegExpExecArray | null;
    let text = "";
    while ((t = textRe.exec(inner)) !== null) {
      text += t[1]
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'");
    }
    // Defensive: some docs have run structures that confuse the simple regex
    // (e.g. text-runs split around tabs / bookmarks / revisions). Strip any
    // residual XML-looking fragments before returning.
    text = sanitizeText(text);
    if (text.trim() || style) out.push({ style, text });
  }
  return out;
}

function sanitizeText(s: string): string {
  // Drop any residual XML fragments (well-formed angle-bracket content), then
  // collapse whitespace.
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const HEADING_STYLE_RE = /^(?:Ttulo|Heading|Titulo|Title)([1-6])$/;
const SKIP_STYLE_RE = /^(TDC|TOC|Tabladeilustraciones|TableofFigures|TtulodeTDC|Cuadrottulo|AAEpgrafe)/;
const BULLET_STYLE_RE = /Vietas|Listpara|Listparag|ListPara|ListParagraph|Prrafodelista|ParrafodeLista/;

export interface DocSection {
  /** Numeric/letter prefix derived from heading nesting, e.g. "6.2.1.a". */
  sectionNumber: string;
  /** "6.2.1.a Niveles de presión sonora" (number + heading text). */
  sectionPath: string;
  /** Word style level (1..6). 2 = 6.X, 3 = 6.X.Y, etc. */
  level: number;
  /** Body paragraphs that followed this heading. */
  content: string;
  /** Original Word style name. */
  sourceStyle: string;
}

const LETTER_DEPTH = 4; // 4th-level subsection uses letters (a, b, c, …) per approved DIA format
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function suffixForCounter(depth: number, counter: number): string {
  if (depth === LETTER_DEPTH) {
    if (counter <= 0 || counter > LETTERS.length) return String(counter);
    return LETTERS[counter - 1];
  }
  return String(counter);
}

export async function parseDocxToSections(
  filePath: string,
  chapterNum: number,
): Promise<DocSection[]> {
  const xml = await readDocumentXml(filePath);
  const paragraphs = extractParagraphs(xml);

  // Counters per style depth. counters[d] = current count at depth d (1..6).
  const counters: number[] = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused
  let sawChapterTitle = false;

  const sections: DocSection[] = [];
  let current: DocSection | null = null;

  function flushCurrent(): void {
    if (current && current.content.trim().length > 0) sections.push(current);
    current = null;
  }

  for (const p of paragraphs) {
    if (SKIP_STYLE_RE.test(p.style)) continue;

    const m = p.style.match(HEADING_STYLE_RE);
    if (m) {
      const styleLevel = parseInt(m[1], 10); // 1..6
      const headingText = p.text.trim();

      flushCurrent();

      if (styleLevel === 1) {
        // First Ttulo1 = chapter title — mark body entered, don't index it.
        if (!sawChapterTitle) {
          sawChapterTitle = true;
          for (let d = 1; d <= 6; d++) counters[d] = 0;
          continue;
        }
        // Subsequent Ttulo1 = new top-level section.
        counters[1] += 1;
        for (let d = 2; d <= 6; d++) counters[d] = 0;
      } else {
        // Ttulo2 → depth 1, Ttulo3 → depth 2, ..., Ttulo6 → depth 5
        const depth = styleLevel - 1;
        counters[depth] += 1;
        for (let d = depth + 1; d <= 6; d++) counters[d] = 0;
      }

      if (!sawChapterTitle) continue;

      let lastDepthWithValue = 0;
      for (let d = 1; d <= 6; d++) {
        if (counters[d] > 0) lastDepthWithValue = d;
      }
      const parts: string[] = [String(chapterNum)];
      for (let d = 1; d <= lastDepthWithValue; d++) {
        const c = counters[d];
        parts.push(c <= 0 ? "1" : suffixForCounter(d, c));
      }
      const sectionNumber = parts.join(".");

      current = {
        sectionNumber,
        sectionPath: headingText ? `${sectionNumber} ${headingText}` : sectionNumber,
        level: styleLevel,
        content: "",
        sourceStyle: p.style,
      };
      continue;
    }

    // Body paragraph
    if (!sawChapterTitle || !current) continue;
    const text = p.text.trim();
    if (!text) continue;
    const isBullet = BULLET_STYLE_RE.test(p.style);
    current.content += isBullet ? `- ${text}\n` : `${text}\n`;
  }

  flushCurrent();
  return sections;
}

/** Heuristic project metadata from the filename. */
export function metadataFromFilename(filename: string): {
  projectName: string | null;
  instrumentType: "DIA" | "MDIA" | null;
} {
  const isMDIA = /\bMDIA\b/i.test(filename);
  const instrumentType: "DIA" | "MDIA" | null = isMDIA
    ? "MDIA"
    : /\bDIA\b/i.test(filename)
      ? "DIA"
      : null;
  const m = filename.match(/(?:MDIA|DIA)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ][\w-]+(?:\s+[\w-]+)?)/);
  const projectName = m?.[1]?.replace(/[_(].*$/, "").trim() ?? null;
  return { projectName, instrumentType };
}
