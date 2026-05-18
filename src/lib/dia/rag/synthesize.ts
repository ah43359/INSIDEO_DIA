// Per-section RAG synthesis orchestrator for DIA chapters.
//
// Flow per leaf section
// ---------------------
//   1. Build a query string from the section title + user-entered fields
//      + project metadata.
//   2. Embed it with OpenAI text-embedding-3-small.
//   3. Retrieve top-6 similar passages from public.dia_corpus_examples
//      (filtered by chapter and section_path prefix).
//   4. Send a Claude messages API call with prompt caching on the system
//      prompt. Returns the synthesized section body.
//
// Sections are processed sequentially in tree order. Each call receives
// the last ROLLING_CONTEXT_SIZE generated sections so the prose flows
// coherently from one section to the next.
//
// A second export — synthesizeParentSections — runs after all leaves are
// done. It generates 1-3 intro paragraphs for each parent (non-leaf)
// node, using the children's prose + RAG examples as context.

import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";
import { retrieveCorpusPassages, type CorpusMatch } from "./retrieval";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildParentUserPrompt,
  citationsFromMatches,
  type ProjectFacts,
  type PriorSection,
  type SourceCitation,
} from "./prompts";

// Model served by local Ollama. Override with OLLAMA_MODEL env var.
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:8b";
// num_ctx sets the context window Ollama allocates. Default is 2048, which is
// too small for our prompts (system + 6 RAG examples + prior context ≈ 6-8k tokens).
const OLLAMA_NUM_CTX = 12288;
const MAX_OUTPUT_TOKENS = 2000;
const MATCH_COUNT = 6;
const ROLLING_CONTEXT_SIZE = 3;

export interface SynthesisInput {
  chapterNum: number;
  project: ProjectFacts;
  /** Sections to synthesize, supplied in tree order. */
  sections: ReadonlyArray<{
    sectionId: string;
    sectionTitle: string;
    userFields: Record<string, string>;
  }>;
}

export interface ParentSectionTarget {
  sectionId: string;
  sectionTitle: string;
  /** Direct children that have generated content, in tree order. */
  childSections: ReadonlyArray<{ sectionId: string; sectionTitle: string; content: string }>;
}

export interface SectionSynthesis {
  sectionId: string;
  content: string;
  citations: SourceCitation[];
  passagesRetrieved: number;
}

export interface SynthesisResult {
  results: SectionSynthesis[];
  errors: Array<{ sectionId: string; message: string }>;
}

/** Call Ollama's native /api/chat endpoint so we can set num_ctx explicitly.
 *  The OpenAI-compatible endpoint uses a default of 2048 tokens which is too
 *  small for our RAG prompts (system + 6 examples + prior context). */
async function callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
  const baseURL = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1")
    .replace(/\/v1\/?$/, ""); // accept both http://host:11434 and http://host:11434/v1

  const res = await fetch(`${baseURL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      options: { num_ctx: OLLAMA_NUM_CTX },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json() as { message?: { content?: string } };
  return data.message?.content?.trim() ?? "";
}

/** Translate "6.2.1.a" → corpus filter prefix like "6.2.1" so retrieval
 *  finds passages from the same parent etapa even if no exact match exists. */
function sectionFilterFor(sectionId: string): string {
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
  priorContext: readonly PriorSection[],
): Promise<SectionSynthesis> {
  // 1. Embed query
  const queryText =
    `Sección ${section.sectionId} ${section.sectionTitle}.\n` +
    Object.entries(section.userFields)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}: ${v.trim()}`)
      .join("\n");
  const embedding = await embedText(queryText);

  // 2. Retrieve — 6 examples for richer template coverage
  const matches: CorpusMatch[] = await retrieveCorpusPassages(supabase, {
    queryEmbedding: embedding,
    chapterNum: input.chapterNum,
    sectionFilter: sectionFilterFor(section.sectionId),
    matchCount: MATCH_COUNT,
  });

  // 3. Build prompt with rolling context window
  const userPrompt = buildUserPrompt({
    sectionPath: section.sectionId,
    sectionTitle: section.sectionTitle,
    project: input.project,
    userFields: section.userFields,
    retrieved: matches,
    priorContext,
  });

  // 4. Synthesize via local Ollama
  const text = await callOllama(
    buildSystemPrompt(input.chapterNum, section.sectionId),
    userPrompt,
  );

  return {
    sectionId: section.sectionId,
    content: text,
    citations: citationsFromMatches(matches),
    passagesRetrieved: matches.length,
  };
}

/** Phase 1: synthesize leaf sections sequentially with a rolling context
 *  window so each section can reference what was written before it. */
export async function synthesizeSections(
  supabase: SupabaseClient,
  input: SynthesisInput,
  onProgress?: (sectionId: string, result?: SectionSynthesis) => void,
): Promise<SynthesisResult> {
  const results: SectionSynthesis[] = [];
  const errors: Array<{ sectionId: string; message: string }> = [];
  const recentContext: PriorSection[] = [];

  for (const section of input.sections) {
    try {
      const result = await synthesizeOne(
        supabase,
        input,
        section,
        recentContext.slice(-ROLLING_CONTEXT_SIZE),
      );
      results.push(result);
      onProgress?.(result.sectionId, result);
      // Only successful generations feed the context window
      recentContext.push({
        sectionId: result.sectionId,
        sectionTitle: section.sectionTitle,
        content: result.content,
      });
      if (recentContext.length > ROLLING_CONTEXT_SIZE) recentContext.shift();
    } catch (err) {
      errors.push({
        sectionId: section.sectionId,
        message: err instanceof Error ? err.message : String(err),
      });
      onProgress?.(section.sectionId);
    }
  }

  return { results, errors };
}

/** Phase 2: generate intro paragraphs for parent (non-leaf) sections
 *  bottom-up, so grandparent intros can reference parent intros already
 *  written. Each parent also retrieves RAG examples for style guidance. */
export async function synthesizeParentSections(
  supabase: SupabaseClient,
  chapterNum: number,
  project: ProjectFacts,
  parents: ReadonlyArray<ParentSectionTarget>,
  onProgress?: (sectionId: string, result?: SectionSynthesis) => void,
): Promise<SynthesisResult> {
  const results: SectionSynthesis[] = [];
  const errors: Array<{ sectionId: string; message: string }> = [];

  for (const target of parents) {
    try {
      // Embed the parent section title to find intro-style examples
      const embedding = await embedText(
        `Introducción sección ${target.sectionId} ${target.sectionTitle}`,
      );
      const matches: CorpusMatch[] = await retrieveCorpusPassages(supabase, {
        queryEmbedding: embedding,
        chapterNum,
        sectionFilter: sectionFilterFor(target.sectionId),
        matchCount: MATCH_COUNT,
      });

      const userPrompt = buildParentUserPrompt({
        sectionPath: target.sectionId,
        sectionTitle: target.sectionTitle,
        project,
        childSections: target.childSections,
        retrieved: matches,
      });

      const text = await callOllama(
        buildSystemPrompt(chapterNum, target.sectionId),
        userPrompt,
      );

      const parentResult: SectionSynthesis = {
        sectionId: target.sectionId,
        content: text,
        citations: citationsFromMatches(matches),
        passagesRetrieved: matches.length,
      };
      results.push(parentResult);
      onProgress?.(target.sectionId, parentResult);
    } catch (err) {
      errors.push({
        sectionId: target.sectionId,
        message: err instanceof Error ? err.message : String(err),
      });
      onProgress?.(target.sectionId);
    }
  }

  return { results, errors };
}
