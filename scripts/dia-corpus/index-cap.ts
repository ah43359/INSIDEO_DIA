// One-shot CLI: parse approved DIA .docx files in a folder, embed each
// section, and upsert into Supabase `dia_corpus_examples`.
//
// Usage
// -----
//   cd E:/Architecture
//   set OPENAI_API_KEY=sk-...
//   set SUPABASE_URL=https://oallvyberanbniakljoq.supabase.co
//   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   npx tsx scripts/dia-corpus/index-cap.ts \
//     --folder "E:/Architecture/DIA Examples/Cap6" \
//     --chapter 6
//
// Idempotent: a content_hash (sha256) is stored per (source_filename,
// section_path). On re-run, sections whose hash hasn't changed are
// skipped (no embedding cost).

import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings.js";
import { metadataFromFilename, parseDocxToSections, type DocSection } from "./parse-docx.js";

interface CliArgs {
  folder: string;
  chapter: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  if (typeof args.folder !== "string") {
    throw new Error("Falta --folder. Ej: --folder \"E:/Architecture/DIA Examples/Cap6\"");
  }
  const chapter = Number(args.chapter);
  if (!Number.isFinite(chapter)) {
    throw new Error("Falta --chapter. Ej: --chapter 6");
  }
  return {
    folder: args.folder,
    chapter,
    dryRun: args.dryRun === true,
  };
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

async function listDocxFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder);
  const docx: string[] = [];
  for (const e of entries) {
    const p = join(folder, e);
    const st = await stat(p);
    if (st.isFile() && /\.docx$/i.test(e) && !e.startsWith("~$")) {
      docx.push(p);
    }
  }
  return docx;
}

interface UpsertRow {
  chapter_num: number;
  source_filename: string;
  project_name: string | null;
  instrument_type: string | null;
  section_path: string;
  section_level: number;
  parent_section_path: string | null;
  content: string;
  word_count: number;
  embedding: number[];
  content_hash: string;
}

function parentPath(sectionNumber: string): string | null {
  const parts = sectionNumber.split(".");
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join(".");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!args.dryRun) {
    if (!url || !key) {
      throw new Error(
        "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Defínelos antes de ejecutar (sin --dry-run).",
      );
    }
  }

  const sb = !args.dryRun
    ? createClient(url!, key!, { auth: { persistSession: false } })
    : null;

  const files = await listDocxFiles(args.folder);
  console.log(`📂 ${files.length} .docx en ${args.folder}`);

  let totalIndexed = 0;
  let totalSkipped = 0;
  for (const filePath of files) {
    const filename = basename(filePath);
    const { projectName, instrumentType } = metadataFromFilename(filename);
    console.log(
      `\n→ ${filename}  (project=${projectName ?? "?"}  type=${instrumentType ?? "?"})`,
    );
    const sections: DocSection[] = await parseDocxToSections(filePath, args.chapter);
    console.log(`  ${sections.length} secciones detectadas`);

    if (args.dryRun) {
      for (const s of sections.slice(0, 30)) {
        console.log(
          `    [L${s.level}] ${s.sectionPath.padEnd(60).slice(0, 60)} (${s.content.split("\n").length} líneas)`,
        );
      }
      if (sections.length > 30) console.log(`    … +${sections.length - 30} más`);
      continue;
    }

    // Filter sections with very short content (likely heading-only or noise)
    const usable = sections.filter((s) => s.content.trim().split(/\s+/).length >= 10);
    if (usable.length < sections.length) {
      console.log(`  ${sections.length - usable.length} secciones cortas omitidas`);
    }

    // Existing hashes for this file (to skip unchanged)
    const { data: existingRows, error: existingErr } = await sb!
      .from("dia_corpus_examples")
      .select("section_path, content_hash")
      .eq("source_filename", filename);
    if (existingErr) throw existingErr;
    const existing = new Map<string, string>(
      (existingRows ?? []).map((r) => [r.section_path as string, r.content_hash as string]),
    );

    const rows: UpsertRow[] = [];
    for (const s of usable) {
      const hash = sha256(s.content);
      if (existing.get(s.sectionPath) === hash) {
        totalSkipped += 1;
        continue;
      }
      const embedding = await embedText(`${s.sectionPath}\n\n${s.content}`);
      rows.push({
        chapter_num: args.chapter,
        source_filename: filename,
        project_name: projectName,
        instrument_type: instrumentType,
        section_path: s.sectionPath,
        section_level: s.level,
        parent_section_path: parentPath(s.sectionNumber),
        content: s.content.trim(),
        word_count: s.content.trim().split(/\s+/).length,
        embedding,
        content_hash: hash,
      });
      console.log(`    ✓ ${s.sectionPath.slice(0, 70)}`);
    }

    if (rows.length === 0) {
      console.log(`  Nada nuevo para indexar.`);
      continue;
    }

    const { error: upsertErr } = await sb!
      .from("dia_corpus_examples")
      .upsert(rows, { onConflict: "source_filename,section_path" });
    if (upsertErr) throw upsertErr;
    totalIndexed += rows.length;
    console.log(`  ${rows.length} secciones upserted`);
  }

  console.log(`\n✅ Total: ${totalIndexed} indexadas, ${totalSkipped} sin cambios`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message ?? err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
