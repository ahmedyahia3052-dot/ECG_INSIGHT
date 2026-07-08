import fs from "node:fs";

import { readPersistedJson } from "../artifacts/ecg-insight/lib/presentation/persisted-layout-storage";
import { UI_COMPLEXITY_BUDGET, UI_NAMING_CONVENTIONS } from "../artifacts/ecg-insight/ui-architecture/naming-conventions";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const registrySource = fs.readFileSync("artifacts/ecg-insight/design-system/themes/registry.ts", "utf8");
assert(registrySource.includes("hospitalTheme"), "Theme registry must define hospital theme.");
assert(registrySource.includes("lightTheme"), "Theme registry must define light theme.");
assert(registrySource.includes("darkTheme"), "Theme registry must define dark theme.");

assert(UI_NAMING_CONVENTIONS.pages.includes("Route"), "Naming conventions must document page routes.");
assert(UI_COMPLEXITY_BUDGET.maxPresentationComponentLines > 0, "Complexity budget must be defined.");

const persisted = readPersistedJson("sprint75-test-key", { leftSize: 240 }, []);
assert(persisted.leftSize === 240, "Persisted layout reader must merge fallback values.");

console.log("Sprint 75 UI architecture unit tests: PASS");
