import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const testFile = path.resolve(root, "../server/src/modules/ecg-interpretation-engine/tests/section-interpreters.test.ts");
const result = spawnSync("npx", ["tsx", testFile], { cwd: path.resolve(root, ".."), encoding: "utf8", shell: true });
if (result.status !== 0) {
  process.stderr.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}
console.log("Sprint 62 interpretation engine module unit tests: PASS");
