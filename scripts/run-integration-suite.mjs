import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { integrationScripts } from "./integration/pipeline.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");

for (const script of integrationScripts) {
  console.log(`\n[integration-suite] Running ${script}...\n`);
  const result = spawnSync("npx", ["tsx", script], {
    cwd: repoRoot,
    env: process.env,
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`[integration-suite] ${script} failed with exit code ${result.status ?? "unknown"}.`);
    process.exit(result.status ?? 1);
  }
}

const cleanup = spawnSync("npx", ["tsx", "scripts/finish-integration-run.ts"], {
  cwd: repoRoot,
  env: process.env,
  shell: true,
  stdio: "inherit",
});

process.exit(cleanup.status === 0 ? 0 : cleanup.status ?? 1);
