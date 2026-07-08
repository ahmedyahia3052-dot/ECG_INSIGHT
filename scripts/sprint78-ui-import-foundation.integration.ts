import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const presentationRoot = path.resolve("artifacts/ecg-insight/presentation");

const requiredDirs = [
  "design-system",
  "theme",
  "tokens",
  "layouts",
  "components/medical",
  "components/viewer",
  "components/monitor",
  "components/assistant",
  "components/dashboard",
  "components/shared",
  "managers",
  "accessibility",
];

for (const dir of requiredDirs) {
  assert.ok(fs.existsSync(path.join(presentationRoot, dir)), `Missing presentation/${dir}`);
}

const version = fs.readFileSync(path.join(presentationRoot, "version.ts"), "utf8");
assert.match(version, /sprint78-v1/);

const registry = fs.readFileSync(path.join(presentationRoot, "design-system/registry.ts"), "utf8");
assert.match(registry, /designSystemRegistry/);
assert.match(registry, /assertDesignSystemRegistry/);

const boltMapping = fs.readFileSync(path.join(presentationRoot, "design-system/bolt-mapping.ts"), "utf8");
assert.match(boltMapping, /BOLT_TO_ECG_COMPONENT_MAP/);
assert.match(boltMapping, /Button/);
assert.match(boltMapping, /PrimaryButton/);
assert.match(boltMapping, /Sidebar/);
assert.match(boltMapping, /Modal/);

const componentRegistry = fs.readFileSync(path.join(presentationRoot, "design-system/component-registry.ts"), "utf8");
assert.match(componentRegistry, /componentRegistry/);

const medicalRegistry = fs.readFileSync(path.join(presentationRoot, "components/medical/registry.ts"), "utf8");
assert.match(medicalRegistry, /medicalComponentRegistry/);

const themeIndex = fs.readFileSync(path.join(presentationRoot, "theme/index.ts"), "utf8");
assert.match(themeIndex, /lightTheme/);
assert.match(themeIndex, /darkTheme/);
assert.match(themeIndex, /ThemeEngineProvider/);

const breakpoints = fs.readFileSync(path.join(presentationRoot, "layouts/responsive-breakpoints.ts"), "utf8");
assert.match(breakpoints, /3840/);
assert.match(breakpoints, /1920/);

const lazySource = fs.readFileSync(path.join(presentationRoot, "lazy.ts"), "utf8");
assert.match(lazySource, /lazy\(/);
assert.match(lazySource, /EcgMonitorViewerFoundation/);
assert.match(lazySource, /EcgLiveMonitorShell/);

const managersSource = fs.readFileSync(path.join(presentationRoot, "managers/index.tsx"), "utf8");
for (const manager of ["NavigationManager", "ModalManager", "DialogManager", "ToastManager", "DrawerManager", "CommandPaletteManager", "UiFoundationProvider"]) {
  assert.match(managersSource, new RegExp(manager));
}

const tokenIndex = fs.readFileSync(path.join(presentationRoot, "tokens/index.ts"), "utf8");
for (const token of ["colors", "typography", "spacing", "elevation", "animation", "icons"]) {
  assert.match(tokenIndex, new RegExp(token));
}

const presentationIndex = fs.readFileSync(path.join(presentationRoot, "index.ts"), "utf8");
assert.match(presentationIndex, /design-system/);
assert.match(presentationIndex, /lazy/);

console.log("sprint78-ui-import-foundation.integration.ts: all checks passed");
