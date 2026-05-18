// Structural smoke test for the Cap 3 baseline methodology contract.
// Run: node scripts/smoke-baseline-playbook.mjs
//
// Checks:
//   1. All 18 leaf sections in playbook §2 map to a recipe in RECIPES.
//   2. renderRecipeForPrompt returns non-null for every leaf.
//   3. buildSystemPrompt(3, '3.2.2') contains the universal pattern + the
//      3.2.2 recipe markers.
//   4. The cap3 suffix is absent when chapterNum != 3.

import { RECIPES, renderRecipeForPrompt, isSectionRequiredAtTier } from "../src/lib/dia/rag/baselinePlaybook.ts";
import { buildSystemPrompt } from "../src/lib/dia/rag/prompts.ts";

const EXPECTED_LEAVES = [
  "3.1",
  "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5", "3.2.6", "3.2.7", "3.2.8", "3.2.9",
  "3.3.1", "3.3.2", "3.3.3",
  "3.4.1", "3.4.2", "3.4.3",
  "3.5", "3.6",
];

let failures = 0;
const fail = (msg) => { console.error("FAIL:", msg); failures++; };
const ok = (msg) => console.log("ok  :", msg);

// 1. Coverage
for (const path of EXPECTED_LEAVES) {
  if (!RECIPES[path]) fail(`Missing recipe for ${path}`);
  else ok(`Recipe present for ${path}`);
}

// 2. Render non-null
for (const path of EXPECTED_LEAVES) {
  const rendered = renderRecipeForPrompt(path);
  if (!rendered || rendered.length < 100) fail(`Rendered recipe too short for ${path}`);
}
ok("All recipes render with content");

// 3. buildSystemPrompt injection for chapter 3
const promptAire = buildSystemPrompt(3, "3.2.2");
if (!promptAire.includes("PATRÓN NARRATIVO UNIVERSAL")) fail("3.2.2 prompt missing universal pattern");
if (!promptAire.includes("3.2.2 — Calidad del aire")) fail("3.2.2 prompt missing section header");
if (!promptAire.includes("D.S. N° 003-2017-MINAM")) fail("3.2.2 prompt missing ECA Aire citation");
if (!promptAire.includes("D.S. N° 010-2019-MINAM")) fail("3.2.2 prompt missing aire protocol citation");
if (promptAire.includes("DS 074-2001-PCM") && !promptAire.includes("derogados")) {
  fail("3.2.2 prompt references DS 074-2001-PCM outside the deprecation rule");
}
ok("3.2.2 system prompt injection looks correct");

const promptAgua = buildSystemPrompt(3, "3.2.9");
if (!promptAgua.includes("D.S. N° 004-2017-MINAM")) fail("3.2.9 prompt missing ECA Agua citation");
if (!promptAgua.includes("Categoría")) fail("3.2.9 prompt missing categoría requirement");
ok("3.2.9 system prompt injection looks correct");

const promptFlora = buildSystemPrompt(3, "3.3.1");
if (!promptFlora.includes("D.S. N° 043-2006-AG")) fail("3.3.1 prompt missing flora amenazada citation");
if (!promptFlora.includes("SERFOR")) fail("3.3.1 prompt missing SERFOR autorización");
ok("3.3.1 system prompt injection looks correct");

const promptDemo = buildSystemPrompt(3, "3.4.1");
if (!promptDemo.includes("INEI")) fail("3.4.1 prompt missing INEI citation");
if (!promptDemo.includes("BDPI")) fail("3.4.1 prompt missing BDPI citation");
ok("3.4.1 system prompt injection looks correct");

// 4. No cap3 suffix for other chapters
const promptCap2 = buildSystemPrompt(2);
if (promptCap2.includes("PATRÓN NARRATIVO UNIVERSAL")) fail("Cap 2 prompt leaked Cap 3 contract");
const promptCap3NoSection = buildSystemPrompt(3);
if (!promptCap3NoSection.includes("PATRÓN NARRATIVO UNIVERSAL")) fail("Cap 3 prompt without sectionPath should still have universal pattern");
if (promptCap3NoSection.includes("CONTRATO METODOLÓGICO")) fail("Cap 3 prompt without sectionPath should not have per-section recipe");
ok("Cap 2 prompt is unchanged by Cap 3 contract");
ok("Cap 3 without sectionPath has universal pattern only");

// 5. Tier gating
if (!isSectionRequiredAtTier("3.2.2", "dia")) fail("3.2.2 should be required at DIA tier");
if (isSectionRequiredAtTier("3.2.7", "dia")) fail("3.2.7 Hidrogeología should NOT be required at DIA tier (it's eia_d minimum)");
if (!isSectionRequiredAtTier("3.2.7", "eia_d")) fail("3.2.7 should be required at EIA-d tier");
ok("Tier gating works for 3.2.2 (DIA) and 3.2.7 (EIA-d only)");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
} else {
  console.log("\nAll structural smoke checks passed.");
}
