# Capítulo 3 — Baseline Data-Source Spec

> Per RM 108-2018-MEM/DM Anexo I §3. This spec catalogues every Cap 3 sub-section,
> the data source that fills it, and the implementation status. **The DIA's Cap 3
> ships as three independent baseline documents** — one per medio — generated
> and reviewed in isolation; they reach the regulator as separate annexes.

## Document grouping

| Baseline document | Sections included | DG group keys |
|---|---|---|
| **LB Físico**         | 3.1 Alcance · 3.2 (3.2.1 → 3.2.9) · 3.5 Arqueología · 3.6 Cartografía | `lb_alcance`, `lb_meteo`, `lb_aire`, `lb_ruido`, `lb_geologia`, `lb_geomorfologia`, `lb_hidrologia`, `lb_hidrogeologia`, `lb_suelos`, `lb_calidad_agua`, `lb_arqueologia`, `lb_cartografia` |
| **LB Biológico**      | 3.3 (3.3.1 Flora · 3.3.2 Fauna · 3.3.3 Ecosistemas) | `lb_flora`, `lb_fauna`, `lb_ecosistemas` |
| **LB Socio-cultural** | 3.4 (3.4.1 Demografía · 3.4.2 Indicadores · 3.4.3 Uso del territorio) | `lb_demografia`, `lb_indicadores`, `lb_uso_territorio` |

The cross-cutting **methodology paragraph (3.1)** and the **arqueología (3.5)** and
**cartografía (3.6)** sections live in **LB Físico only** — that document carries the
regulatory framing for the whole baseline study.

## Source classes (legend)

- **WEBAPP** — user-entered data in insideo-dia (measurements, inventories, narrative text fields).
- **SECONDARY** — public reference layers / external datasets (INEI, SENAMHI, MINAM, ANA, INGEMMET, SERNANP, IGN, INGEMMET, SUNARP).
- **BOILERPLATE** — boilerplate prose from the Cap 3 corpus (`dia_corpus_examples` rows with `chapter_num=3`), retrieved via the existing `match_dia_corpus()` RPC.
- **MIXED** — a paragraph that interleaves at least two of the above.

## Status (legend)

- **Ready** — every data source named in the row exists today and is reachable from the document builder.
- **Partial** — the data path exists but is incomplete (e.g. a ref layer is ingested but auto-prefill from `derive.ts` is still missing, or the corpus is empty pending deliverable B).
- **Gap** — no data path exists yet. Tracked in the gap list at the bottom.

---

## LB Físico — section table

| Section | Title | Class | Origin | Status | Notes |
|---|---|---|---|---|---|
| 3.0 | Línea Base (parent intro) | BOILERPLATE | Cap 3 corpus, retrieved with `section_filter=NULL` and chapter-wide semantic match | Partial | Parent intros are synthesized bottom-up in `rag/synthesize.ts` Phase 2 once children exist. |
| 3.1 | Alcance y metodología | MIXED | `lb_alcance` DG fields (`lb_temporadaCampo`, `lb_metodologiaGeneral`, `lb_fuentesSecundarias`) + Cap 3 corpus with `section_filter='3.1'` | Ready (fields + corpus once deliverable B runs) | Methodology language is mostly templated — corpus retrieval gives realistic phrasing for "una temporada (seca / húmeda)", site characterization, fuentes secundarias enumeration. |
| 3.2 | Medio físico (parent intro) | BOILERPLATE | Cap 3 corpus, `section_filter='3.2'` | Partial | Bottom-up parent intro after 3.2.1–3.2.9 are filled. |
| 3.2.1 | Meteorología, clima y zonas de vida | SECONDARY + WEBAPP | SENAMHI climate stations (gap) + Holdridge map (gap) + `lb_meteo` fields (`lb_estacionesMeteo`, `lb_zonasVida`, `lb_tempPromedioC`, `lb_precipMmAno`, `lb_humedadPct`, `lb_vientosResumen`) | Gap (P2) | User types SENAMHI station ids manually today; gap = ingest SENAMHI metadata + climate normals as a ref layer and auto-fill. |
| 3.2.2 | Calidad del aire | WEBAPP | `project_station_measurements` joined on `project_sampling_stations` where `kind='aire'`, filtered by `campaign='linea_base'`. ECA from `eca_thresholds[kind='aire']` (DS 003-2017-MINAM). RPC: `get_measurements_for_project(p_project_id, 'linea_base')`. DG fields: `lb_aireProtocolo`, `lb_aireParametros`, `lb_aireResultados`. | Ready | Resultados narrative still typed manually; results-vs-ECA table can be auto-rendered from `eca_compliance` JSONB. |
| 3.2.3 | Calidad de ruido ambiental | WEBAPP | Same as 3.2.2 but `kind='ruido'`. ECA from `eca_thresholds[kind='ruido']` (DS 085-2003-PCM, zones zpe/zr/zc/zi, diurno/nocturno). DG fields: `lb_ruidoProtocolo`, `lb_ruidoEstaciones`, `lb_ruidoResultados`. | Ready | Same as above. |
| 3.2.4 | Geología | SECONDARY + WEBAPP | INGEMMET layer (gap — no `ref_geologia` yet) + `lb_geologia` fields (`lb_geologiaRegional`, `lb_geologiaLocal`, `lb_potencialDAR`) | Gap (P3) | Without `ref_geologia` the user types regional formation names manually. Map files (`Mapa_Geologico.pdf`) already arrive via component_inventario annexes. |
| 3.2.5 | Geomorfología | SECONDARY + WEBAPP | DEM-derived contours (partial — `ref_contours` via migration 0032; slope derivation is on-demand only) + `lb_geomorfologia` fields (`lb_geoformas`, `lb_pendientes`, `lb_riesgosGeo`) | Partial | Slope rasters built ad-hoc by `skills/reference-layers/scripts/build_ign_dem.py`. Auto-fill of `lb_pendientes` from area_estudio + contours is feasible but not wired. |
| 3.2.6 | Hidrología | SECONDARY + WEBAPP | `ref_microcuencas` (ANA Pfafstetter, migration 0017+) + `ref_rivers` (migration 0002) + project's `area_estudio.inputs_snapshot.microcuencas_used_pfafstetter` array. `derive.ts` already auto-populates `lb_pfafstetter`. DG fields: `lb_cuenca`, `lb_pfafstetter`, `lb_redHidricaResumen`. | Ready | The only auto-prefill currently active in `cap3/derive.ts`. Cuenca and red hídrica narrative still typed manually; trivial to enrich. |
| 3.2.7 | Hidrogeología | BOILERPLATE + WEBAPP | Cap 3 corpus, `section_filter='3.2.7'` + `lb_hidrogeologia` fields (`lb_acuiferos`, `lb_nivelFreatico`, `lb_manantiales`) | Partial (corpus needed) | No public hydrogeology ref layer in Peru with national coverage — boilerplate phrasing from approved DIAs is the realistic floor. |
| 3.2.8 | Suelos | WEBAPP | `project_station_measurements` where station `kind='suelos'`, ECA from `eca_thresholds[kind='suelos']` (DS 011-2017-MINAM, zones agr/res/ind). DG fields: `lb_clasificacionSuelos` (Soil Taxonomy / FAO — typed), `lb_capacidadUso` (CUMT — typed), `lb_calidadSuelos` (results vs ECA). | Partial | Quality measurements + ECA compliance: Ready. Classification and CUMT: still typed; no national soil-taxonomy ref layer wired. |
| 3.2.9 | Calidad del agua | WEBAPP | `project_station_measurements` where `kind='agua_superficial'` or `kind='agua_subterranea'`. ECA from `eca_thresholds` (DS 004-2017-MINAM, categories cat3r / cat3b / cat1a1 / cat1a2 / cat4lago / cat4rio). DG fields: `lb_aguaSupParametros`, `lb_aguaSupResultados`, `lb_aguaSubParametros`, `lb_aguaSubResultados`. | Ready | ECA compliance auto-scored per parameter by `insert_station_measurement()` RPC; narrative summary typed manually. |
| 3.5 | Arqueología y patrimonio cultural | MIXED | `lb_arqueologia` fields (`lb_estudioArqueo`, `lb_ciras`, `lb_anexoArqueo`) + Cap 3 corpus, `section_filter='3.5'` for boilerplate around CIRA-approval phrasing | Partial (corpus needed) | Arqueológica = always a third-party CIRA report (Ministerio de Cultura); the DIA only references it. Corpus phrasing for "se cuenta con CIRA N° XXX..." comes from approved DIAs. |
| 3.6 | Cartografía | MIXED | `lb_cartografia` fields (`lb_planosListado`, `lb_anexoPlanos`) + Cap 3 corpus, `section_filter='3.6'` for listing template | Partial (corpus needed) | The corpus carries the canonical plano roster (ubicación, geológico, hidrológico, cobertura vegetal, áreas de influencia, etc.) at scales 1:25 000 / 1:10 000. |

---

## LB Biológico — section table

| Section | Title | Class | Origin | Status | Notes |
|---|---|---|---|---|---|
| 3.3 | Medio biológico (parent intro) | BOILERPLATE | Cap 3 corpus, `section_filter='3.3'` | Partial | Bottom-up parent intro after 3.3.1–3.3.3 are filled. |
| 3.3.1 | Flora | MIXED | `lb_flora` fields (`lb_formacionesVeg`, `lb_especiesFlora`, `lb_metodoFlora`). Field flora-inventory upload form is a **Gap (P1)**. | Gap | Today the species list is a free-text field; we want a structured inventory table tied to sampling stations (kind='biologica_flora'?) and an Excel/CSV importer. |
| 3.3.2 | Fauna | MIXED | `lb_fauna` fields (`lb_aves`, `lb_mamiferos`, `lb_reptilesAnfibios`, `lb_metodoFauna`). Field fauna-inventory upload form is a **Gap (P1)**. | Gap | Same structural gap as flora — no fauna table or importer. |
| 3.3.3 | Ecosistemas | MIXED | SERNANP ANP ref layer (gap — no `ref_anp` yet) + `lb_ecosistemas` fields (`lb_ecosistemasIdentificados`, `lb_ecosistemasFragiles`, `lb_anpRelacion`) | Gap (ANP) | `lb_anpRelacion` is typed; once `ref_anp` lands, `derive.ts` can compute distance + relation automatically. |

---

## LB Socio-cultural — section table

| Section | Title | Class | Origin | Status | Notes |
|---|---|---|---|---|---|
| 3.4 | Medio socioeconómico-cultural (parent intro) | BOILERPLATE | Cap 3 corpus, `section_filter='3.4'` | Partial | Bottom-up parent intro. |
| 3.4.1 | Demografía | SECONDARY + WEBAPP | `ref_centros_poblados` (INEI/IGN, ingested via `ingest_centros_poblados.py`) joined to project AID/AII polygons via spatial query. Plus `lb_demografia` fields (`lb_poblacionAID`, `lb_poblacionAII`, `lb_centrosPoblados`). INEI population columns on `ref_centros_poblados` are a **Gap (P3)**. | Partial | Today users list centros poblados manually. With INEI columns on the ref table, `derive.ts` can prefill counts. |
| 3.4.2 | Indicadores socioeconómicos | SECONDARY + WEBAPP | INEI 2017 census aggregates per distrito (gap — no `ref_distritos_inei` yet) + `lb_indicadores` fields (`lb_actividadesEconomicas`, `lb_servicios`, `lb_idh`) | Gap (P3) | IDH from PNUD; ingestion is a one-time CSV-to-table task. |
| 3.4.3 | Uso del territorio | MIXED | `ref_comunidades_campesinas` (migration 0038, SUNARP) + `ref_concesiones_mineras` (migration 0027) + project AOI + `lb_uso_territorio` fields (`lb_usoActual`, `lb_tenenciaTierra`) | Partial | Comunidades / concesiones overlap can be computed at AOI time; `lb_tenenciaTierra` is part-typed today. |

---

## Boilerplate strategy

The boilerplate paragraphs for Cap 3 come from `dia_corpus_examples` rows with
`chapter_num = 3`, retrieved at synthesis time via the `match_dia_corpus()` RPC
defined in migration 0028.

Per baseline document, the synthesis API calls retrieve different slices:

| Baseline | `match_dia_corpus()` call (per section) |
|---|---|
| LB Físico | k=6 with `section_filter` ∈ {`'3.1'`, `'3.2'`, `'3.5'`, `'3.6'`}; default `'3.2.x'` per leaf for finer relevance |
| LB Biológico | k=6 with `section_filter='3.3'` (or `'3.3.1'`/`'3.3.2'`/`'3.3.3'` per leaf) |
| LB Socio-cultural | k=6 with `section_filter='3.4'` (or `'3.4.x'` per leaf) |

The corpus is populated by the new parser (deliverable B). Today the table is
**empty for `chapter_num=3`**.

### How the parser tags `section_path`

The MINEM SEAL upload form labels (`chapter_label` in the manifest) are noisy —
consultants drop files into whichever slot is convenient. The parser therefore:

1. Filters PDFs by **filename pattern** (regex over `nombredoc`), not by chapter_label.
2. Extracts text with PyMuPDF.
3. Chunks at heading boundaries (`^3\.\d+(\.\d+)?\s` and ALL-CAPS short lines).
4. Tags each chunk with a `section_path` matching our Cap 3 schema via a content-keyword router:
   - "geolog", "litolog", "estratigraf" → `3.2.4`
   - "geomorf", "pendiente", "ladera" → `3.2.5`
   - "hidrolog", "cuenca", "caudal", "pfafstetter" → `3.2.6`
   - "hidrogeolog", "acuífero", "manantial", "freátic" → `3.2.7`
   - "suelo", "taxonom", "CUMT", "fertilid" → `3.2.8`
   - "calidad de aire", "PM10", "PM2.5", "DIGESA" → `3.2.2`
   - "ruido", "LAeq", "decibel" → `3.2.3`
   - "meteorolog", "climatolog", "precipita", "temperatura", "viento", "Holdridge" → `3.2.1`
   - "agua superficial" or specific category → `3.2.9` (sub-prefix `super` / `subterr`)
   - "flora", "vegetac", "formaciones vegetales", "especies" + biotic keywords → `3.3.1`
   - "fauna", "ave", "mamífer", "anfibio", "reptil" → `3.3.2`
   - "ecosistema", "ANP", "área natural protegida" → `3.3.3`
   - "demografía", "poblaci", "INEI", "centros poblados" → `3.4.1`
   - "actividad económica", "servicios básicos", "IDH" → `3.4.2`
   - "uso del territorio", "tenencia", "concesión", "comunidad campesina" → `3.4.3`
   - "arqueológ", "CIRA", "patrimonio cultural" → `3.5`
   - "cartografía", "planos", "mapa de" (with `3.6` co-occurrence) → `3.6`
   - Fallback: `3` (chapter-wide) — still useful for parent intros.

A chunk gets the **most specific** match (longest `section_path`). Ties go to
whichever keyword appeared first.

---

## Secondary-source mapping

| Source | Table(s) / RPC | Ingestion script | Used by | Status |
|---|---|---|---|---|
| ANA Pfafstetter microcuencas | `ref_microcuencas` (+ `match_microcuencas` RPC) | `skills/reference-layers/scripts/ingest_microcuencas.py` | LB Físico (3.2.6) | Ingested |
| ANA hydro network | `ref_rivers` | `ingest_rivers.py` | LB Físico (3.2.6) | Ingested |
| INEI / IGN centros poblados | `ref_centros_poblados` | `ingest_centros_poblados.py` | LB Socio-cultural (3.4.1) | Ingested (no demographics columns yet) |
| Political boundaries (dep/prov/dist) | `ref_departamentos`, `ref_provincias`, `ref_distritos` | embedded in `0024_political_boundaries_and_roads.sql` | All baselines | Ingested |
| Roads (MTC / OSM) | `ref_roads`, `ref_vias_mtc` (0039) | `ingest_vias_mtc.py` | LB Físico (context maps) | Ingested |
| Comunidades campesinas | `ref_comunidades_campesinas` (0038) | `ingest_comunidades_campesinas.py` | LB Socio-cultural (3.4.3) | Ingested |
| Concesiones mineras | `ref_concesiones_mineras` (0027) | `ingest_concesiones_mineras.py` | LB Socio-cultural (3.4.3) | Ingested |
| Contornos / curvas de nivel | `ref_contours` (0032) | `ingest_contours.py` | LB Físico (3.2.5) | Ingested |
| SENAMHI climate stations | (gap) | (gap) | LB Físico (3.2.1) | **Gap P2** |
| SERNANP ANP / ACR / ZA | (gap) | (gap) | LB Biológico (3.3.3) | **Gap P2** |
| INGEMMET geology | (gap) | (gap) | LB Físico (3.2.4) | **Gap P3** |
| INEI 2017 distrito aggregates (IDH, NBI, servicios) | (gap) | (gap) | LB Socio-cultural (3.4.2) | **Gap P3** |

---

## Web app data mapping

For monitoring data, the bridge is always `project_sampling_stations.kind`:

| DG section | `kind` filter | ECA decree | RPC |
|---|---|---|---|
| 3.2.2 Calidad del aire | `aire` | DS 003-2017-MINAM | `get_measurements_for_project(project_id, 'linea_base')` |
| 3.2.3 Calidad de ruido | `ruido` | DS 085-2003-PCM | same |
| 3.2.8 Suelos (calidad) | `suelos` | DS 011-2017-MINAM | same |
| 3.2.9 Agua superficial | `agua_superficial` | DS 004-2017-MINAM | same |
| 3.2.9 Agua subterránea | `agua_subterranea` | DS 004-2017-MINAM | same |
| (future) Sedimentos | `sedimentos` | DS 011-2017-MINAM (ref) | same |
| (future) Vibraciones | `vibraciones` | NTP 27006 / ISO 4866 | same |

ECA compliance is auto-scored by the `insert_station_measurement()` RPC at insertion
time; the `eca_compliance` JSONB column carries `{param: {compliant, threshold, value}}`
for every parameter recorded.

---

## Prioritized gap list

| ID | Priority | Blocks | What |
|---|---|---|---|
| G1 | **P1** | LB Biológico (3.3.1) | Flora inventory upload form + table (`project_flora_inventory`?), with importer for Excel exports from biologists. |
| G2 | **P1** | LB Biológico (3.3.2) | Fauna inventory upload form + table (same structure as flora). |
| G3 | **P1** | All three baselines (output) | Split `cap3/document.ts` and `cap3/sections.ts` into three builders (`buildLbFisico`, `buildLbBiologico`, `buildLbSocial`) and expose 3 export buttons in `ChapterEditor.tsx`. |
| G4 | **P2** | LB Físico (3.2.1) | Ingest SENAMHI climate stations + normales mensuales as a ref layer; auto-fill `lb_estacionesMeteo`, `lb_tempPromedioC`, `lb_precipMmAno`, `lb_humedadPct`. |
| G5 | **P2** | LB Biológico (3.3.3) | Ingest SERNANP ANP / ACR / ZA polygons as `ref_anp`; auto-fill `lb_anpRelacion` from spatial distance. |
| G6 | **P2** | LB Físico (3.2.6) | Cross-check / expand `derive.ts` to additionally prefill `lb_cuenca` (display name) from `ref_microcuencas`. (`lb_pfafstetter` is already prefilled.) |
| G7 | **P3** | LB Socio-cultural (3.4.1) | Add INEI population columns to `ref_centros_poblados` (or an associated `ref_centros_poblados_inei` table) and prefill `lb_centrosPoblados`. |
| G8 | **P3** | LB Físico (3.2.4) | Ingest INGEMMET 1:100k geology polygons as `ref_geologia`; surface a per-AOI summary RPC. |
| G9 | **P3** | LB Socio-cultural (3.4.2) | Ingest INEI 2017 distrito-level aggregates (NBI, IDH, servicios básicos coverage) for auto-fill. |

---

## Next steps (out of this spec)

1. **Run deliverable B** (`pdf_to_corpus.py`) end-to-end to populate `dia_corpus_examples` with `chapter_num=3` rows tagged across `3.1`, `3.2.x`, `3.3.x`, `3.4.x`, `3.5`, `3.6`.
2. **Enable Cap 3 RAG**: add `3` to `RAG_ENABLED_CHAPTERS` in `frontend/insideo-dia/src/components/dia/ChapterEditor.tsx`; add Cap 3 branches in `frontend/insideo-dia/src/lib/dia/rag/prompts.ts::buildSystemPrompt(3)` — one prompt per baseline document since the writing voice differs (físico is technical-quantitative, biológico is ecological-taxonomic, socio is participatory-administrative).
3. **G3 (split builders)**: refactor `cap3/document.ts` to accept a `baseline: 'fisico' | 'biologico' | 'social'` parameter; expose three export entry points.
4. Close gaps in priority order; each closure should also wire `derive.ts` to consume the new ref data.

---

## Self-check (verification)

A reader of this spec can:

- For any leaf section in `frontend/insideo-dia/src/lib/dia/cap3/fields.ts`, find exactly one row in this document.
- For every `Ready` row, identify the exact table + filter + RPC that delivers the data.
- For every `Gap` row, find a `G#` entry below with a priority and the baseline document it blocks.
- Compute, in 10 seconds, which baseline doc owns any given section id.
