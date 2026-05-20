# DIA Corpus Indexer

Reads approved DIA / MDIA `.docx` documents from a folder, splits them into sections, embeds each section with OpenAI `text-embedding-3-small`, and upserts the results into the Supabase `dia_corpus_examples` table for use by the runtime RAG synthesis (`/api/projects/[id]/dia/<chapter>/synthesize`).

## When to run

- **First time setup**: after applying migration `0028_dia_corpus.sql`.
- **After dropping a new approved DIA** into the corpus folder (e.g. `E:\Architecture\DIA Examples\Cap6\`).
- **After fixing a parsed section** in a source `.docx` (re-run is idempotent — only changed sections are re-embedded).

## Folder convention

```
E:\Architecture\DIA Examples\
  Cap6\               ← Cap. 6 corpus folder
    Cap 6 Plan de Manejo Ambiental - DIA Cerrillos.docx
    Cap 6 Plan de Manejo Ambiental - DIA Sabueso_LevObs_sin cc.docx
    Cap 6 Plan de Manejo Ambiental - MDIA Ccoropuro (LevObs).docx
  Cap3\               ← future: Cap. 3 corpus
    ...
```

The indexer only ingests sections whose number prefix matches `--chapter` (so a Cap. 6 doc only contributes 6.X sections, not its TOC or annexes).

## Filename → metadata heuristic

The indexer extracts `project_name` and `instrument_type` from the filename:

- Filenames containing `MDIA <Project>` → `instrument_type = "MDIA"`, `project_name = "<Project>"`
- Filenames containing `DIA <Project>` → `instrument_type = "DIA"`, `project_name = "<Project>"`
- The first capitalized word after `DIA `/`MDIA ` is used as the project name (anything after `_` or `(` is dropped — handles things like `Sabueso_LevObs_sin cc.docx` → `Sabueso`).

## Required environment variables

```bash
# Windows (cmd.exe / PowerShell)
set OPENAI_API_KEY=sk-...
set SUPABASE_URL=https://mjinbekseqwclpknwzxu.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJ...

# bash / git-bash
export OPENAI_API_KEY=sk-...
export SUPABASE_URL=https://mjinbekseqwclpknwzxu.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Find the service-role key in Supabase dashboard → Project Settings → API → `service_role` key. **Never** commit this; it bypasses RLS.

## Run

From the frontend directory (where `node_modules` lives):

```bash
cd E:/Architecture/frontend/insideo-dia

# Dry run — print detected sections without embedding or writing to DB.
# Use this to sanity-check that section detection works on a new doc.
npx tsx scripts/dia-corpus/index-cap.ts \
  --folder "E:/Architecture/DIA Examples/Cap6" \
  --chapter 6 \
  --dry-run

# Real run — embeds + upserts.
npx tsx scripts/dia-corpus/index-cap.ts \
  --folder "E:/Architecture/DIA Examples/Cap6" \
  --chapter 6
```

`tsx` is a devDependency. If you get `tsx: command not found`, run `npm install` from the same directory first.

## Verification

After a successful run:

```sql
-- In Supabase SQL editor
select source_filename, count(*) as sections
from public.dia_corpus_examples
where chapter_num = 6
group by source_filename;
```

You should see one row per `.docx` file with 20-60 sections each.

Spot-check retrieval:

```sql
-- Embed "ruido durante perforación" externally first (or use the API),
-- then:
select section_path, project_name, similarity
from public.match_dia_corpus(
  '<the embedding as a 1536-element array>'::vector,
  6::smallint,
  '6.2.1',
  3
);
```

Expect 6.2.1.a (Niveles de presión sonora) sections from Cerrillos / Sabueso / Ccoropuro at the top.

## Cost

OpenAI `text-embedding-3-small` is $0.02 per 1M tokens. The 3 example Cap. 6 docs together are ~250k tokens of body text → about **$0.005 per full reindex**. Re-runs with no changes are free (hash-skipped before embedding).

## Adding more chapters

1. Create folder `E:\Architecture\DIA Examples\Cap<N>\` with approved docs.
2. Apply the migration if not already applied (`0028_dia_corpus.sql` covers all chapters via `chapter_num`).
3. Run with `--chapter <N>`.
4. The synthesis API at `/api/projects/[id]/dia/<N>/synthesize` will start retrieving from the new corpus immediately.
