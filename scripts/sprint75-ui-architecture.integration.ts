import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 75 marker: ${needle}`);
    }
  }
}

assertContains("artifacts/ecg-insight/design-system/theme-engine/ThemeEngineProvider.tsx", [
  "ThemeEngineProvider",
  "useThemeEngine",
  "hospitalMode",
]);

assertContains("artifacts/ecg-insight/design-system/tokens/clinical-tokens.ts", [
  "ECG_WORKSTATION_VISUAL",
  "LIVE_MONITOR_LAYOUT",
]);

assertContains("artifacts/ecg-insight/presentation/index.ts", [
  "./design-system",
  "./theme",
  "./tokens",
  "./components",
  "PRESENTATION_FOUNDATION_VERSION",
]);

assertContains("artifacts/ecg-insight/features/index.ts", [
  "./workspace",
  "./viewer",
  "./monitor",
]);

assertContains("artifacts/ecg-insight/lib/presentation/persisted-layout-storage.ts", [
  "readPersistedJson",
  "usePersistedJsonLayout",
]);

assertContains("artifacts/ecg-insight/app/_layout.tsx", [
  "ThemeEngineProvider",
]);

assertContains("SPRINT75_UI_ARCHITECTURE_REPORT.md", [
  "UI Architecture Report",
  "presentation",
  "design-system",
  "Theme Engine",
  "Bolt",
]);

console.log("Sprint 75 UI architecture integration markers: PASS");
