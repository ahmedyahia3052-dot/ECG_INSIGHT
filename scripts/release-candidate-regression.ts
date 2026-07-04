import fs from "node:fs";
import {
  INTEGRATION_ENTRYPOINT,
  NPM_TEST_INTEGRATION_COMMAND,
  integrationScripts,
  releaseDocs,
  releaseE2eSpecs,
  releaseLoadScript,
} from "./integration/pipeline.mjs";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

for (const artifact of [INTEGRATION_ENTRYPOINT, releaseLoadScript, ...releaseE2eSpecs, ...releaseDocs]) {
  assert(fs.existsSync(artifact), `Missing release candidate artifact: ${artifact}`);
}

const packageJson = fs.readFileSync("package.json", "utf8");
assert(packageJson.includes(NPM_TEST_INTEGRATION_COMMAND), "package.json test script must execute the integration suite entrypoint.");
assert(!packageJson.includes("sprint37-release-candidate.integration.ts"), "package.json must not reference individual integration scripts.");

const suiteSource = fs.readFileSync(INTEGRATION_ENTRYPOINT, "utf8");
assert(suiteSource.includes('from "./integration/pipeline.mjs"'), "Integration entrypoint must import the canonical script registry.");
for (const script of integrationScripts) {
  assert(suiteSource.includes(`"${script}"`), `Integration entrypoint missing script registration: ${script}`);
}

console.log(`Release candidate pipeline validation passed (${integrationScripts.length} integration scripts via ${INTEGRATION_ENTRYPOINT}).`);
