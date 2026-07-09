import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DS = path.join(ROOT, "artifacts/ecg-insight/design-system");

function read(rel: string) {
  return fs.readFileSync(path.join(DS, rel), "utf8");
}

function assertIncludes(rel: string, needles: string[]) {
  const content = read(rel);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${rel} missing Sprint 104 marker: ${needle}`);
    }
  }
}

const requiredPaths = [
  "tokens/colors.ts",
  "tokens/spacing.ts",
  "tokens/radii.ts",
  "tokens/shadows.ts",
  "tokens/opacity.ts",
  "tokens/animation.ts",
  "tokens/zIndex.ts",
  "tokens/breakpoints.ts",
  "typography/scale.ts",
  "icons/registry.ts",
  "motion/presets.ts",
  "status/medical-status.ts",
  "theme/variants.ts",
  "providers/DesignSystemProvider.tsx",
  "hooks/useDesignTokens.ts",
  "hooks/useBreakpoint.ts",
  "hooks/useReducedMotion.ts",
  "primitives/Box.tsx",
  "components/buttons/index.tsx",
  "components/cards/index.tsx",
  "components/badges/index.tsx",
  "layouts/index.tsx",
  "index.ts",
];

for (const rel of requiredPaths) {
  if (!fs.existsSync(path.join(DS, rel))) {
    throw new Error(`Missing Sprint 104 design-system file: ${rel}`);
  }
}

assertIncludes("tokens/colors.ts", ["medicalColors", "surfaceColors", "grayScale"]);
assertIncludes("tokens/spacing.ts", ["spacingScale", "64"]);
assertIncludes("typography/scale.ts", ["display", "monitor", "ecgLabel", "vitalLabel"]);
assertIncludes("icons/registry.ts", ["dashboard", "liveMonitor", "analytics"]);
assertIncludes("status/medical-status.ts", ["aiProcessing", "aiComplete", "emergency"]);
assertIncludes("theme/variants.ts", ["developerTheme", "accessibilityTheme", "organizationBrandingTheme"]);
assertIncludes("components/buttons/index.tsx", ["PrimaryButton", "DangerButton", "LoadingButton"]);
assertIncludes("components/cards/index.tsx", ["MedicalCard", "MonitorCard", "EcgCard"]);
assertIncludes("components/badges/index.tsx", ["MedicalStatusBadge", "AiConfidenceBadge"]);
assertIncludes("layouts/index.tsx", ["WorkspaceLayout", "ViewerLayout", "MonitorLayout"]);
assertIncludes("index.ts", ["DESIGN_SYSTEM_VERSION"]);

console.log("Sprint 104 Enterprise Design System unit tests: PASS");
