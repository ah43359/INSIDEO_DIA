// Per-section RAG synthesis orchestrator for Cap. 6.
//
// Flow per section
// ----------------
//   1. Build a query string from the section title + user-entered fields
//      + project metadata.
//   2. Embed it with OpenAI text-embedding-3-small.
//   3. Retrieve top-3 similar passages from public.dia_corpus_examples
//      (filtered by chapter and section_path prefix).
//   4. Send a Claude messages API call with prompt caching on the system
//      prompt. Returns the synthesized section body.
//
// Sections are processed concurrently with a small concurrency limit so
// we don't hammer the OpenAI / Anthropic APIs.

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";
import { retrieveCorpusPassages, type CorpusMatch } from "./retrieval";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  citationsFromMatches,
  type ProjectFacts,
  type SourceCitation,
} from "./prompts";

const ANTHROPIC_MODEL = "claude-haiku-4-5";
const CONCURRENCY = 4;
const MAX_OUTPUT_TOKENS = 1500;

export interface SynthesisInput {
  chapterNum: number;
  project: ProjectFacts;
  /** Sections to synthesize, with their title and user-entered fields. */
  sections: ReadonlyArray<{
    sectionId: string; // e.g. "6.2.1.a"
    sectionTitle: string;
    userFields: Record<string, string>;
  }>;
}

export interface SectionSynthesis {
  sectionId: string;
  content: string;
  citations: SourceCitation[];
  /** Number of retrieved passages used. */
  passagesRetrieved: number;
}

export interface SynthesisResult {
  results: SectionSynthesis[];
  /** Sections that errored out (kept separate so partial success is possible). */
  errors: Array<{ sectionId: string; message: string }>;
}

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no está configurado en el servidor. Agréguelo en las variables de entorno de Vercel.",
    );
  }
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

/** Translate "6.2.1.a" → corpus filter prefix like "6.2.1" so retrieval
 *  finds passages from the same parent etapa even if no exact match exists. */
function sectionFilterFor(sectionId: string): string {
  // For "6.X.Y.z" use "6.X.Y" so we get sibling letter-suffixed sections too.
  // For "6.X.Y" use "6.X". For "6.X" use "6".
  const parts = sectionId.split(".");
  if (parts.length >= 4) return parts.slice(0, 3).join(".");
  if (parts.length >= 3) return parts.slice(0, 2).join(".");
  if (parts.length >= 2) return parts.slice(0, 2).join(".");
  return parts[0] ?? sectionId;
}

async function synthesizeOne(
  supabase: SupabaseClient,
  input: SynthesisInput,
  section: SynthesisInput["sections"][number],
): Promise<SectionSynthesis> {
  // 1. Embed query
  const queryText =
    `Sección ${section.sectionId} ${section.sectionTitle}.\n` +
    Object.entries(section.userFields)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}: ${v.trim()}`)
      .join("\n");
  const embedding = await embedText(queryText);

  // 2. Retrieve
  const matches: CorpusMatch[] = await retrieveCorpusPassages(supabase, {
    queryEmbedding: embedding,
    chapterNum: input.chapterNum,
    sectionFilter: sectionFilterFor(section.sectionId),
    matchCount: 3,
  });

  // 3. Build prompt
  const userPrompt = buildUserPrompt({
    sectionPath: section.sectionId,
    sectionTitle: section.sectionTitle,
    project: input.project,
    userFields: section.userFields,
    retrieved: matches,
  });

  // 4. Synthesize with Claude. System prompt is cached so repeat calls in
  //    the same generation run share the cache hit.
  const response = await anthropic().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  const text = block ? block.text.trim() : "";

  return {
    sectionId: section.sectionId,
    content: text,
    citations: citationsFromMatches(matches),
    passagesRetrieved: matches.length,
  };
}

export async function synthesizeSections(
  supabase: SupabaseClient,
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const results: SectionSynthesis[] = [];
  const errors: Array<{ sectionId: string; message: string }> = [];

  // Simple chunked concurrency
  const queue = [...input.sections];
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      try {
        const r = await synthesizeOne(supabase, input, item);
        results.push(r);
      } catch (err) {
        errors.push({
          sectionId: item.sectionId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Preserve original section order
  const orderIndex = new Map(input.sections.map((s, i) => [s.sectionId, i]));
  results.sort((a, b) => (orderIndex.get(a.sectionId) ?? 0) - (orderIndex.get(b.sectionId) ?? 0));

  return { results, errors };
}
