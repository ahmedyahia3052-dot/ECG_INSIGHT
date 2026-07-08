import { validateEmkpPlatform, buildEmkpPlatform, EMKP_DISEASES, EMKP_CLINICAL_RULES, EMKP_LEAD_KNOWLEDGE, EMKP_TERMINOLOGY } from "../enterprise/emkp/src/index";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  console.log("emkp-validation.test.ts — ECG Medical Knowledge Platform");

  const result = validateEmkpPlatform();
  if (result.warnings.length) {
    console.log(`  warnings (${result.warnings.length}):`);
    for (const w of result.warnings.slice(0, 5)) console.log(`    - ${w}`);
    if (result.warnings.length > 5) console.log(`    ... and ${result.warnings.length - 5} more`);
  }

  assert(result.ok, `Validation failed:\n${result.errors.join("\n")}`);
  assert(result.stats.diseases >= 46, `Expected ≥46 diseases, got ${result.stats.diseases}`);
  assert(result.stats.rules >= 46, `Expected ≥46 rules, got ${result.stats.rules}`);
  assert(result.stats.leads === 12, `Expected 12 leads, got ${result.stats.leads}`);
  assert(result.stats.terminology >= 40, `Expected ≥40 terminology entries, got ${result.stats.terminology}`);
  assert(result.stats.differentialTrees >= 6, `Expected ≥6 differential trees, got ${result.stats.differentialTrees}`);
  assert(result.stats.guidelines >= 8, `Expected ≥8 guidelines, got ${result.stats.guidelines}`);

  const platform = buildEmkpPlatform();
  assert(platform.version === "1.0.0", "Platform version must be 1.0.0");
  assert(platform.diseases.length === EMKP_DISEASES.length, "Platform disease count mismatch");

  const requiredCodes = ["NSR", "AF", "STEMI", "VT", "WPW", "BRUGADA", "AVNRT", "ARVC", "AIVR"];
  for (const code of requiredCodes) {
    assert(EMKP_DISEASES.some((d) => d.code === code), `Missing required diagnosis: ${code}`);
    assert(EMKP_CLINICAL_RULES.some((r) => r.diagnosisCode === code), `Missing required rule for: ${code}`);
  }

  for (const lead of ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]) {
    assert(EMKP_LEAD_KNOWLEDGE.some((l) => l.lead === lead), `Missing lead knowledge: ${lead}`);
  }

  assert(EMKP_TERMINOLOGY.some((t) => t.term === "STEMI"), "Terminology must include STEMI");
  assert(EMKP_TERMINOLOGY.some((t) => t.abbreviations.includes("AF")), "Terminology must include AF abbreviation");

  console.log("  stats:", result.stats);
  console.log("emkp-validation.test.ts: all tests passed");
}

main();
