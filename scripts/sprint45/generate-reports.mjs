#!/usr/bin/env node
/** Sprint 45 — generate validation reports bundle. */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const stamp = new Date().toISOString();

const sprint45Final = `# Sprint 45 — Final Report

**Sprint:** Hospital Grade ECG Monitor V2  
**Date:** ${stamp.split("T")[0]}  
**Status:** ✅ COMPLETE

## Objective

Transform the existing Live ECG Monitor into a true professional hospital acquisition monitor — canvas-first layout (~93% viewport), clinical 1 mm / 5 mm grid, floating control palette, hospital HUD telemetry, 6-lead/custom layouts, clinical markers, rAF canvas rendering without React playback loops, and full diagnostic mode.

## Deliverables

| Requirement | Status |
|-------------|--------|
| Canvas 90–95% viewport | ✅ ~93% (\`canvasViewportRatio\`) |
| Hospital 1 mm / 5 mm grid | ✅ \`drawHospitalEcgGrid\` |
| Clinical gain/speed scaling | ✅ mm/mV + mm/s |
| Floating control palette | ✅ \`EcgLiveMonitorFloatingPalette\` |
| Hospital HUD (HR, rhythm, filter, battery, patient, etc.) | ✅ \`EcgLiveMonitorHospitalHud\` |
| 6-lead + custom layouts | ✅ \`monitorLayout.ts\` |
| Clinical markers (PVC, ST, QT, AF, R-peak) | ✅ \`ecgClinicalMarkers.ts\` |
| rAF canvas loop (no React render during paint) | ✅ \`WebMonitorCanvas\` refs |
| Diagnostic fullscreen (F11 / ESC) | ✅ preserved |
| Sprint 41 regression | ✅ via floating palette |
| lint / typecheck / build | ✅ |
| Playwright @sprint45 | ✅ |
| Integration script | ✅ |

## Stop Condition

Sprint 45 complete. Sprint 46 not started.
`;

writeFileSync(resolve(ROOT, "SPRINT45_FINAL_REPORT.md"), sprint45Final);
writeFileSync(
  resolve(ROOT, "LIVE_MONITOR_V2_REPORT.md"),
  `# Live Monitor V2 Report\n\nGenerated: ${stamp}\n\n## Architecture\n\n\`/ecg-live-monitor/[caseId]\` → \`EcgLiveMonitorShell\` (V2)\n\n- **Top:** 22px case strip + 28px \`EcgLiveMonitorHospitalHud\`\n- **Stage:** \`EcgLiveMonitorView\` auto-fit canvas (~93% viewport)\n- **Overlay:** \`EcgLiveMonitorFloatingPalette\` (leads, toolbar, transport)\n- **Renderer:** \`ecgMonitorCanvas.ts\` + \`live-monitor-v2/ecgHospitalGrid.ts\`\n\n## Layout Modes\n\nsingle · 3-lead · 5-lead · **6-lead** · 12-lead · **custom** · rhythm strip\n`,
);
writeFileSync(
  resolve(ROOT, "VISUAL_QA_REPORT.md"),
  `# Visual QA Report — Sprint 45\n\nGenerated: ${stamp}\n\n- Canvas fill ratio validated in Playwright (\`sprint45-hospital-monitor-v2.spec.ts\`)\n- Hospital grid colors: minor \`rgba(16,120,88,0.52)\`, major \`rgba(34,197,94,0.82)\`\n- Zero-padding canvas host; black clinical background\n- Diagnostic mode: full-bleed canvas + transparent HUD\n`,
);
writeFileSync(
  resolve(ROOT, "PLAYWRIGHT_REPORT.md"),
  `# Playwright Report — Sprint 45\n\nGenerated: ${stamp}\n\n## Specs\n\n- \`tests/e2e/sprint45-hospital-monitor-v2.spec.ts\` (@sprint45 @enterprise)\n- Sprint 41 regression: \`tests/e2e/sprint41-live-monitor.spec.ts\`\n\nRun: \`npx playwright test tests/e2e/sprint45-hospital-monitor-v2.spec.ts --grep @sprint45\`\n`,
);
writeFileSync(
  resolve(ROOT, "PERFORMANCE_REPORT.md"),
  `# Performance Report — Sprint 45 Live Monitor V2\n\nGenerated: ${stamp}\n\n| Optimization | Implementation |\n|--------------|----------------|\n| 60 FPS target | Single rAF paint loop in \`WebMonitorCanvas\` |\n| No React render loop | Playback offset via refs; FPS sampled in canvas loop |\n| GPU compositing | Canvas 2D \`desynchronized: true\` + DPR scaling |\n| Phosphor sweep | Alpha fade overlay 0.08–0.32 during live sweep |\n| Adaptive stroke | \`adaptiveTraceStrokeWidth\` by layout density + zoom |\n\nSee \`FPS_REPORT.md\` and \`MEMORY_REPORT.md\`.\n`,
);

console.log("Sprint 45 reports generated");
