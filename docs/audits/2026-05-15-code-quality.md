# INSIDEO DIA — Frontend Code Quality Audit

**Date:** 2026-05-15
**Branch:** `claude/admiring-burnell-c5c823`
**Scope:** all 125 .ts/.tsx files under `frontend/insideo-dia/src/`
**Method:** verification baseline (lint/typecheck/test/build) + 5 parallel specialized review agents (typescript ×2, security, test-gap, refactor)

---

## Executive Summary

| Gate | Status | Detail |
|---|---|---|
| `npm run lint` | **FAIL** | 7 errors, 24 warnings |
| `npm run typecheck` | **FAIL** | 17 errors (15 in ProjectMap.tsx, 2 in synthesize.ts) |
| `npm run test --coverage` | **FAIL** | 3.82% lines vs 60% threshold (gate fails on threshold, not on test failures) |
| `npm run build` | **FAIL** | Missing dependency `@anthropic-ai/sdk` |

| Severity | Count |
|---|---|
| CRITICAL | 12 |
| HIGH | 24 |
| MEDIUM | ~30 |
| LOW | ~15 |

The codebase has good structural bones — proper Supabase RLS-aware client selection, server/client boundary respected, secrets correctly server-only — but **four production gates are red** and there are multiple data-correctness, security, and silent-failure bugs that must land before any production push.

The largest single defect concentration is in [src/components/ProjectMap.tsx](../../src/components/ProjectMap.tsx) (2,178 lines, >2.7× the 800-line cap), which alone produces 15 of the 17 typecheck errors and contains 2 of the 7 lint errors.

---

## CRITICAL Findings

### Build / Compile blockers

- **[CRITICAL]** [src/lib/dia/rag/synthesize.ts:16](../../src/lib/dia/rag/synthesize.ts#L16) — `@anthropic-ai/sdk` not installed; blocks `next build`. Install dep.
- **[CRITICAL]** [src/lib/dia/rag/synthesize.ts:128](../../src/lib/dia/rag/synthesize.ts#L128) — `find((b) => …)` parameter implicitly `any`; `block.text` access not type-safe. Narrow with typed predicate `(b): b is Anthropic.Messages.TextBlock => b.type === "text"`.
- **[CRITICAL]** [src/components/ProjectMap.tsx:1708-1793](../../src/components/ProjectMap.tsx#L1708) — 9× `'map' is possibly 'null'` (TS18047) inside the area-efectiva editor effect. Capture `const m = map` once after the null-guard at the top of the closure block.
- **[CRITICAL]** [src/components/ProjectMap.tsx:1796-1808](../../src/components/ProjectMap.tsx#L1796) — 4× `No overload matches this call` (TS2769) for `map.on("click"|"mousedown", …)` handlers. MapLibre's typed `e.features` is `MapGeoJSONFeature[]`, the handler declares `Feature<Point>[]` — incompatible. Use `MapGeoJSONFeature` typings and narrow inside the handler.

### Security

- **[CRITICAL]** [src/app/login/actions.ts:55](../../src/app/login/actions.ts#L55) — Open redirect. `next` from FormData passed straight to `redirect(next)`. Validate `next` starts with `/` and not `//`, fallback to `/projects`.
- **[CRITICAL]** [src/app/auth/callback/route.ts:43](../../src/app/auth/callback/route.ts#L43) — Open redirect via `new URL(next, url)` in the magic-link callback. Same fix as above.
- **[CRITICAL]** [src/app/(app)/projects/new/actions.ts:15-82](../../src/app/(app)/projects/new/actions.ts#L15) — `importRfi` Server Action performs multi-table writes (`clientes`, `projects`) without `auth.getUser()` check. Any unauthenticated POST can insert rows. Add `requireUser()` as first statement.
- **[CRITICAL]** [src/lib/dia/rag/prompts.ts:63-87](../../src/lib/dia/rag/prompts.ts#L63) — Prompt injection: user-controlled `userFields` and DB-stored `project.nombre` interpolated into Claude system+user prompts with no delimiter. Adversarial values can override regulatory instructions. Wrap each user value in XML-style `<user_field name="...">[value]</user_field>` and instruct model to treat as untrusted.

### Data correctness (regulatory/financial blast radius)

- **[CRITICAL]** [src/lib/monitoreo/factor-checks.ts:103](../../src/lib/monitoreo/factor-checks.ts#L103) — `exceedsAguaMulti(raw, threshold, "gt")` hardcodes `"gt"`, ignoring the registry's `compare_op` field. OD (dissolved oxygen) uses `≥`-inverted compare; a pH of 9 or low OD value would silently fail to flag exceedance. Use `p.compareOp` from the param registry.
- **[CRITICAL]** [src/lib/monitoreo/exceedance.ts:79,81,83](../../src/lib/monitoreo/exceedance.ts#L79) — Three `parseValue(thresholdRaw)!` non-null assertions on a function returning `number | null`. On malformed thresholds, `null` coerces silently to `0` in numeric comparisons → wrong exceedance result for water-quality records. Check return value before use.
- **[CRITICAL]** [src/lib/monitoreo/exceedance.ts (range branch)](../../src/lib/monitoreo/exceedance.ts) — Range parser splits on en-dash; Spanish thresholds like `"6,5 – 8,5"` with whitespace around the dash cause `parseFloat(" 8,5")` to yield `NaN`, making `exceedsRange` always `false`. Normalize whitespace and decimal separator before parsing.

### Information disclosure (production)

- **[CRITICAL]** [src/app/api/projects/[id]/pdt/route.ts:50-57](../../src/app/api/projects/%5Bid%5D/pdt/route.ts#L50), [dia/route.ts:64](../../src/app/api/projects/%5Bid%5D/dia/route.ts#L64), [dia/[chapter]/route.ts:50](../../src/app/api/projects/%5Bid%5D/dia/%5Bchapter%5D/route.ts#L50), [stations/route.ts:49](../../src/app/api/projects/%5Bid%5D/stations/route.ts#L49) — Internal Supabase error messages and queried IDs leaked in 404/500 response bodies (`detail`, `code`, `queried_id`). Aids ID enumeration and exposes DB schema. Return generic messages; log full error server-side only.

---

## HIGH Findings

### React / lint blockers

- **[HIGH]** [src/components/ProjectMap.tsx:382](../../src/components/ProjectMap.tsx#L382), [Cap2Editor.tsx:69](../../src/components/cap2/Cap2Editor.tsx#L69), [ChapterEditor.tsx:87](../../src/components/dia/ChapterEditor.tsx#L87), [ChapterIndex.tsx:34](../../src/components/dia/ChapterIndex.tsx#L34) — `react-hooks/set-state-in-effect` errors. Pattern is the standard "SSR + localStorage hydration overlay" — semantically correct but the rule fires. Resolve with `// eslint-disable-next-line react-hooks/set-state-in-effect` + explanatory comment, OR migrate to `useSyncExternalStore`.
- **[HIGH]** [src/components/ProjectMap.tsx:1539](../../src/components/ProjectMap.tsx#L1539) — `prefer-const`: `working` is never reassigned.
- **[HIGH]** [src/components/MonitoreoImportModal.tsx:511](../../src/components/MonitoreoImportModal.tsx#L511) — Unescaped `"` chars (×2). Replace with `&quot;`.

### Type safety

- **[HIGH]** [src/components/SamplingResultsPanel.tsx:227,231](../../src/components/SamplingResultsPanel.tsx#L227) — `(s as any).custom_name` and `(p: any).compliant`. Add `custom_name?: string | null` to `SamplingStationRow` and `eca_compliance` to `MeasurementRow`.
- **[HIGH]** [src/lib/monitoreo/chart-renderer.ts:56](../../src/lib/monitoreo/chart-renderer.ts#L56) — `canvas.getContext("2d")!` non-null assertion in a path reachable from server-side DOCX generation. Add runtime null check.
- **[HIGH]** [src/lib/dia/cap6/migration.ts:70](../../src/lib/dia/cap6/migration.ts#L70) — Unnecessary non-null assertion `state.dgFields!` after explicit guard. Remove `!`.
- **[HIGH]** [src/lib/dia/rag/retrieval.ts:33](../../src/lib/dia/rag/retrieval.ts#L33) — RPC response cast `(data ?? []) as CorpusMatch[]` without runtime validation. Add Zod-shape check.

### Async / N+1

- **[HIGH]** [src/components/SamplingResultsPanel.tsx:621](../../src/components/SamplingResultsPanel.tsx#L621), [(app)/projects/[id]/monitoreo/[factor]/page.tsx:294](../../src/app/(app)/projects/%5Bid%5D/monitoreo/%5Bfactor%5D/page.tsx#L294) — Sequential `await supabase.rpc(...)` inside `for` loops for CSV import. Batch with `Promise.all` or a single bulk RPC. Will time out under real workload.
- **[HIGH]** [src/components/SamplingResultsPanel.tsx:196](../../src/components/SamplingResultsPanel.tsx#L196), [monitoreo pages](../../src/app/(app)/projects/%5Bid%5D/monitoreo) — Supabase client created inside component body without `useMemo`/`useRef`; `useEffect` deps suppressed. Stale-closure bug latent. Stabilize the client reference.

### Silent failures

- **[HIGH]** [src/lib/intake/submit.ts:178-196](../../src/lib/intake/submit.ts#L178) — Storage upload errors silently swallowed; no signal returned to caller. Return `storageWarnings: string[]` in `SubmitResult`.
- **[HIGH]** [src/lib/intake/submit.ts:42-44](../../src/lib/intake/submit.ts#L42) — `rfi.cliente` / `rfi.proyecto` upserts without runtime type guards on critical string fields (RUC, razón social).
- **[HIGH]** [src/lib/dia/rag/synthesize.ts:57-68](../../src/lib/dia/rag/synthesize.ts#L57) — Anthropic singleton init defers key-missing error to first request → silent partial failures returned as per-section `errors[]` with 200 status. Validate at module load or top of route.
- **[HIGH]** [src/components/dia/ChapterIndex.tsx:50-53](../../src/components/dia/ChapterIndex.tsx#L50) — Inner `try { … } catch {}` swallows JSON-parse errors; corrupt localStorage entries silently submit malformed shapes.

### Security (post-MVP, pre-prod)

- **[HIGH]** [src/app/(app)/projects/[id]/actions.ts](../../src/app/(app)/projects/%5Bid%5D/actions.ts) — Multiple server actions enqueue jobs on `projectId` without app-layer ownership assertion. Safe only if every RPC has hardened RLS — must be confirmed explicitly. Add `SELECT id FROM projects WHERE id = ? AND owner_id = ?` guard before enqueue.
- **[HIGH]** [src/app/api/projects/[id]/pdt/route.ts:33-38](../../src/app/api/projects/%5Bid%5D/pdt/route.ts#L33) — `mapImageDataUrl` accepted without size limit. Multi-MB base64 payloads decoded into memory. Enforce max ~2 MB.

### Code organization

- **[HIGH]** [src/components/ProjectMap.tsx](../../src/components/ProjectMap.tsx) — 2,178 lines (>800 line cap). Recommended split into `src/components/map/{types,constants,layerDefs,popups,useBoundaryData,useLayerVisibility,useAreaEfectivaEditor,MapLegend,BasemapSelector}.ts(x)` per the refactor agent's plan; orchestrator drops to ~180 lines. See [appendix B](#appendix-b-projectmap-split-plan).
- **[HIGH]** Test coverage 3.82% vs 60% gate. Recommendation: lower threshold to 15% short-term and ratchet quarterly. The 12-test addition list is in [appendix A](#appendix-a-recommended-tests).

---

## MEDIUM / LOW (Appendix)

### React layer (selected)

- [MED] Both monitoreo pages: missing `useMemo` on Supabase client; `useEffect` exhaustive-deps suppressed.
- [MED] [src/app/(app)/projects/[id]/page.tsx:459](../../src/app/(app)/projects/%5Bid%5D/page.tsx#L459) — `ResumenTab` accepts 29 props; symptom of too many absorbed concerns.
- [MED] Multiple pages: stations lookup as `.find()` inside `.map()` inside `useMemo` (O(n²)); pre-build a `Map<id, row>`.
- [MED] Buttons without `type="button"` adjacent to forms (Cap2Editor, ChapterEditor, ReportesPanel).
- [LOW] Several `key={i}` array-index keys for warning/citation lists; prefer stable keys.

### Lib layer (selected)

- [MED] [src/lib/dia/rag/synthesize.ts:29](../../src/lib/dia/rag/synthesize.ts#L29) — Model ID `"claude-haiku-4-5"` as magic string; centralize.
- [MED] Multiple `as unknown as` casts in intake parsers (shpjs, xmldom) — add explanatory comments.
- [MED] [src/lib/supabase/project-selects.ts:9](../../src/lib/supabase/project-selects.ts#L9) — `*` in a SELECT fragment; enumerate columns.
- [LOW] Unused-variable warnings across `docx-generator.ts`, `pdt/helpers.ts`, `pdt/sections/fisico.ts`, `exceedance.ts`.
- [LOW] Console.logs in ProjectMap.tsx (lines 525, 1339-1346) — boundary-data debug residue.

### Configuration

- [MED] `next.config.ts` — no `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy` headers; `logging.fetches.fullUrl: true` can leak query-string secrets.

---

## Ranked Fix Backlog (CRITICAL/HIGH)

| # | Action | Files | Effort |
|---|---|---|---|
| 1 | Install `@anthropic-ai/sdk` | `package.json` | trivial |
| 2 | Fix typed predicate in `synthesize.ts` | 1 file, 2 lines | trivial |
| 3 | Fix ProjectMap nullable-`map` (9×) | ProjectMap.tsx | small |
| 4 | Fix ProjectMap event handler types (4×) | ProjectMap.tsx | small |
| 5 | Fix 7 lint errors | 5 files | small |
| 6 | Fix open redirect ×2 | login/actions.ts, auth/callback | trivial |
| 7 | Add `requireUser()` to importRfi | new/actions.ts | trivial |
| 8 | Add prompt-injection delimiters | rag/prompts.ts | small |
| 9 | Fix `exceedsAguaMulti` compare_op | factor-checks.ts | small |
| 10 | Fix `parseValue!` ×3 | exceedance.ts | small |
| 11 | Fix range parser normalization | exceedance.ts | small |
| 12 | Sanitize 5 API error responses | 4 route files | small |
| 13 | Remove ProjectMap console.logs | ProjectMap.tsx | trivial |
| 14 | Replace `(s as any)` with typed shape | SamplingResultsPanel + types.ts | small |
| 15 | Lower coverage threshold to 15% | vitest.config.ts | trivial |
| 16 | **Split ProjectMap.tsx into 10 files** | `components/map/*` | LARGE — deferred |
| 17 | Add 12 critical-path tests | 5 new test files | LARGE — deferred |

Items 1–15 are scheduled for this session ("surgical fixes"). Items 16–17 are out-of-scope follow-up PRs given their structural impact.

---

## Appendix A — Recommended Tests (1-week priority order)

1. `lib/monitoreo/exceedance.test.ts` — `exceedsRange` handles Spanish comma + en-dash variants
2. `lib/monitoreo/factor-checks.test.ts` — `checkExceeds("agua_superficial", "OD", below)` returns `true`
3. `lib/dia/rag/synthesize.test.ts` — `sectionFilterFor` for 1/2/3/4-part IDs
4. `lib/monitoreo/factor-checks.test.ts` — `summarizeExceedances` for aire/agua/ruido
5. `lib/dia/cap2/utm.test.ts` — `utmToLatLon` round-trip + `findBasin`
6. `lib/intake/validate.test.ts` — `crossValidate` mismatched platforms / out-of-zone / zero-actual
7. `lib/monitoreo/import-mapper.test.ts` — `detectColumns` / `parseImportData` / `detectOrientation`
8. `lib/dia/rag/prompts.test.ts` — `buildUserPrompt` field handling + fallback
9. `lib/dia/rag/prompts.test.ts` — `citationsFromMatches` mapping
10. `lib/monitoreo/factor-checks.test.ts` — `computeCompleteness`
11. `app/api/.../synthesize/route.test.ts` — input validation (0 sections, 51 sections, invalid chapter)
12. `lib/monitoreo/exceedance.test.ts` — `exceedsByOp` for all six CompareOp branches with boundaries

---

## Appendix B — ProjectMap Split Plan

Detailed module tree from the refactor-cleaner agent. Final layout under `src/components/map/`:

| Module | Lines (approx) | Responsibility |
|---|---|---|
| `types.ts` | 50 | `BasemapKey`, `LayerGroup`, `ProjectMapProps`, `LegendItem`, `RingPath`, `Ring` |
| `constants.ts` | 120 | `BASEMAPS`, `LAYER_GROUPS`, `STATION_COLORS`, `COLOR_BY_TIPO`, `VEGETATION_CLASS_COLORS`, `BOUNDARY_URLS` |
| `layerDefs.ts` | 350 | `addAllLayers(map, data)` — all `addSource`/`addLayer` (absorbs current lines 414-1101) |
| `popups.ts` | 120 | Click handlers + popup formatters (absorbs 1102-1277) |
| `useBoundaryData.ts` | 50 | `boundaryData` fetch + state (absorbs 304-355) |
| `useLayerVisibility.ts` | 80 | Group/kind/class visibility (absorbs 279-302, 1389-1457) |
| `useAreaEfectivaEditor.ts` | 220 | Vertex editor effect (absorbs 1522-1832; fixes the 9 nullable-`map` + 4 handler-type errors during extraction) |
| `MapLegend.tsx` | 160 | (absorbs 2033-2086, 2124-2178) |
| `BasemapSelector.tsx` | 40 | (absorbs 2088-2121) |
| `ProjectMap.tsx` | <200 | orchestrator |

Cross-cutting: move file-local `BOUNDARY_URLS` (currently inside component body at line 315 → re-created per render → invisible to fetch effect deps) into `constants.ts`. De-duplicate `EMPTY_FC`/`EMPTY_AREA_FC` (structurally identical at 239-247).

Risks: shared `mapRef` handling across extracted hooks (pass `RefObject<MlMap | null>` not the dereferenced value); single synchronous `map.on("load", …)` block for layer ordering; preserve `mapLoaded` state in orchestrator.

---

## Notes

- Linting baseline counts already exclude the 60% coverage threshold (a single gate, not per-test). Coverage gate fails because 121/125 files contribute 0% (no test exists). Existing test files are 5 behavioral + 1 implementation-coupled (`actions.test.ts` tests type shapes, not runtime behavior).
- Security posture is otherwise solid: secrets are server-only, Supabase clients consistently use `requireUser()` in route handlers, no `service_role` key leakage detected, base security headers present.
- The audit DID NOT cover: Python tooling, Supabase migrations, performance profiling, bundle analysis, accessibility (separate skills), browser smoke-testing the map page (out of scope for this session).
