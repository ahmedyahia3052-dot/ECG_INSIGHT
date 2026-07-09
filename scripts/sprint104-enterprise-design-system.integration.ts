import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DS = path.join(ROOT, "artifacts/ecg-insight/design-system");

function read(rel: string) {
  return fs.readFileSync(path.join(DS, rel), "utf8");
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next);
    return /\.(tsx|ts)$/.test(entry.name) ? [next] : [];
  });
}

const componentFiles = walk(path.join(DS, "components"));
const forbiddenInlineColor = /#[0-9A-Fa-f]{3,8}/;
const allowedTokenFiles = new Set([
  path.join(DS, "tokens", "colors.ts"),
  path.join(DS, "theme", "variants.ts"),
]);

for (const file of componentFiles) {
  const content = read(path.relative(DS, file));
  if (forbiddenInlineColor.test(content) && !allowedTokenFiles.has(file)) {
    throw new Error(`Component file must not hardcode hex colors: ${path.relative(DS, file)}`);
  }
  if (content.includes("StyleSheet.create") && content.includes("padding: 13")) {
    throw new Error(`Non-token spacing detected in ${path.relative(DS, file)}`);
  }
}

const index = read("index.ts");
if (!index.includes('export * from "./components"')) {
  throw new Error("Design system root must export components.");
}

const provider = read("providers/DesignSystemProvider.tsx");
if (!provider.includes("ThemeEngineProvider")) {
  throw new Error("DesignSystemProvider must wrap ThemeEngineProvider.");
}

const tokensHook = read("hooks/useDesignTokens.ts");
if (!tokensHook.includes("createDesignTokens")) {
  throw new Error("useDesignTokens must expose createDesignTokens.");
}

const motion = read("motion/presets.ts");
for (const preset of ["hover", "drawer", "dialog", "sidebar", "workspace"]) {
  if (!motion.includes(preset)) {
    throw new Error(`Missing motion preset: ${preset}`);
  }
}

const breakpoints = read("tokens/breakpoints.ts");
for (const bp of ["mobile", "tablet", "laptop", "desktop", "ultraWide"]) {
  if (!breakpoints.includes(bp)) {
    throw new Error(`Missing breakpoint token: ${bp}`);
  }
}

console.log("Sprint 104 Enterprise Design System integration checks: PASS");
