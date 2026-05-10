// Server-side OpenAI embeddings client used by the synthesis API.
//
// Mirrors scripts/dia-corpus/embeddings.ts but lives under src/ so it
// can be bundled into the Next.js serverless runtime. text-embedding-3-
// small returns 1536-dim vectors, matching the corpus column type.

import OpenAI from "openai";

const MODEL = "text-embedding-3-small";
const DIM = 1536;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY no está configurado en el servidor. Agréguelo en las variables de entorno de Vercel.",
    );
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.slice(0, 30_000);
  const r = await client().embeddings.create({ model: MODEL, input: trimmed });
  const v = r.data[0]?.embedding;
  if (!v || v.length !== DIM) {
    throw new Error(`Embedding inesperado: dim ${v?.length ?? 0}, esperado ${DIM}`);
  }
  return v;
}

export const EMBEDDING_DIM = DIM;
