// Thin OpenAI embeddings wrapper used by the corpus indexer and the
// runtime synthesis API.

import OpenAI from "openai";

const MODEL = "text-embedding-3-small";
const DIM = 1536;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY no está definido. Configúralo en .env.local o en las variables de entorno antes de indexar/sintetizar.",
    );
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.slice(0, 30_000); // text-embedding-3-small ~8192 tokens; chars≈4×tokens
  const r = await client().embeddings.create({ model: MODEL, input: trimmed });
  const v = r.data[0]?.embedding;
  if (!v || v.length !== DIM) {
    throw new Error(`Embedding inesperado: dim ${v?.length ?? 0}, esperado ${DIM}`);
  }
  return v;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const trimmed = texts.map((t) => t.slice(0, 30_000));
  const r = await client().embeddings.create({ model: MODEL, input: trimmed });
  return r.data.map((d) => d.embedding);
}

export const EMBEDDING_MODEL = MODEL;
export const EMBEDDING_DIM = DIM;
