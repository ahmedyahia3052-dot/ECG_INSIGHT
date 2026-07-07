import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const viewerDir = path.join(root, "artifacts/ecg-insight/components/ecg/viewer");

function read(rel: string) {
  return fs.readFileSync(path.join(viewerDir, rel), "utf8");
}

function assertIncludes(rel: string, needle: string, message: string) {
  const content = read(rel);
  if (!content.includes(needle)) {
    throw new Error(`${message} (missing in ${rel})`);
  }
}

function assertExcludes(rel: string, needle: string, message: string) {
  const content = read(rel);
  if (content.includes(needle)) {
    throw new Error(`${message} (found in ${rel})`);
  }
}

assertIncludes("EcgWorkstationGridShell.tsx", "sprint53-workspace-grid", "Sprint 53 CSS grid shell required");
assertIncludes("EcgWorkspaceLayoutSwitcher.tsx", "sprint53-workspace-layout-switcher", "Layout switcher required");
assertIncludes("useEcgWorkspaceLayoutMode.ts", "classic", "Layout presets required");
assertIncludes("rendering-engine/twelveLeadLayout.ts", "rhythmStrip", "12-lead rhythm strip row required");
assertExcludes("EcgZeroChromeToolbar.tsx", "sprint52-toolbar-live-monitor", "Live monitor must be removed from workspace toolbar");
assertIncludes("ecgImageEngine.ts", "ECG_HERO_FILL_TARGET = 0.94", "Hero fill target must maximize canvas");
assertIncludes("EcgUnifiedClinicalLeftPanel.tsx", "sprint53-left-sidebar-scroll", "Left sidebar scroll region required");

console.log("Sprint 53 ECG workspace enterprise integration: PASS");
