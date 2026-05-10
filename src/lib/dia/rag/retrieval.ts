// Retrieves top-k corpus passages for a section query via the
// match_dia_corpus Supabase RPC.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CorpusMatch {
  id: string;
  source_filename: string;
  project_name: string | null;
  instrument_type: string | null;
  section_path: string;
  content: string;
  similarity: number;
}

export async function retrieveCorpusPassages(
  supabase: SupabaseClient,
  args: {
    queryEmbedding: number[];
    chapterNum: number;
    sectionFilter?: string | null;
    matchCount?: number;
  },
): Promise<CorpusMatch[]> {
  const { queryEmbedding, chapterNum, sectionFilter = null, matchCount = 3 } = args;
  const { data, error } = await supabase.rpc("match_dia_corpus", {
    query_embedding: queryEmbedding,
    p_chapter_num: chapterNum,
    p_section_filter: sectionFilter,
    p_match_count: matchCount,
  });
  if (error) throw new Error(`match_dia_corpus falló: ${error.message}`);
  return (data ?? []) as CorpusMatch[];
}
