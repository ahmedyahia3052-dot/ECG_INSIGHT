import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertExists(relativePath: string) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing Bolt migration foundation file: ${relativePath}`);
  }
}

function assertContains(relativePath: string, markers: string[]) {
  const source = read(relativePath);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      throw new Error(`${relativePath} missing marker: ${marker}`);
    }
  }
}

function assertNotContains(relativePath: string, markers: string[]) {
  const source = read(relativePath);
  for (const marker of markers) {
    if (source.includes(marker)) {
      throw new Error(`${relativePath} must not contain conflicting marker: ${marker}`);
    }
  }
}

const foundationFiles = [
  "artifacts/ecg-insight/adapters/bolt/bolt-ui.adapter.ts",
  "artifacts/ecg-insight/types/screens/index.ts",
  "artifacts/ecg-insight/migration/bolt-replacement-manifest.ts",
  "artifacts/ecg-insight/containers/DashboardContainer.tsx",
  "artifacts/ecg-insight/containers/EcgCasesContainer.tsx",
  "artifacts/ecg-insight/legacy-ui/screens/DashboardLegacyPresentation.tsx",
  "artifacts/ecg-insight/routes/registry.ts",
];

for (const file of foundationFiles) assertExists(file);

assertContains("artifacts/ecg-insight/app/(protected)/dashboard.tsx", ["DashboardContainer"]);
assertContains("artifacts/ecg-insight/app/(protected)/ecg-cases/index.tsx", ["EcgCasesContainer"]);
assertContains("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx", ['from "@/routes"', "APP_NAV_ITEMS"]);
assertContains("artifacts/ecg-insight/legacy-ui/screens/DashboardLegacyPresentation.tsx", ["Presentation only", "contract"]);
assertContains("artifacts/ecg-insight/adapters/bolt/bolt-ui.adapter.ts", ["toDashboardContract", "toHistoryContract"]);

const packageJson = read("artifacts/ecg-insight/package.json");
if (packageJson.includes("tailwindcss") || packageJson.includes("nativewind")) {
  throw new Error("Conflicting Tailwind/NativeWind dependency detected — Bolt import requires a single design system.");
}

const enterpriseShell = read("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx");
const routeRegistry = read("artifacts/ecg-insight/routes/registry.ts");
if (enterpriseShell.includes('href: "/dashboard"') && !routeRegistry.includes('href: "/dashboard"')) {
  throw new Error("Duplicate navigation: dashboard href must live in routes/registry.ts only.");
}

assertNotContains("artifacts/ecg-insight/legacy-ui/screens/DashboardLegacyPresentation.tsx", [
  "useQuery",
  "useMutation",
  "@/services/",
]);

assertNotContains("artifacts/ecg-insight/legacy-ui/screens/EcgCasesLegacyPresentation.tsx", [
  "useQuery",
  "useMutation",
  "@/services/",
]);

console.log("Bolt UI Migration Foundation integration checks: PASS");
