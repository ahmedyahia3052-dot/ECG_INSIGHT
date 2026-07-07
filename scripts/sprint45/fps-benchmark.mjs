#!/usr/bin/env node
/**
 * Sprint 45 — Live monitor FPS benchmark (canvas rAF loop estimate via Playwright).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = resolve(ROOT, "test-results/sprint45");
mkdirSync(OUT_DIR, { recursive: true });

const script = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.FRONTEND_URL || 'http://127.0.0.1:19006');
  await page.waitForTimeout(2000);
  const fps = await page.evaluate(() => {
    return new Promise((resolve) => {
      const frames = [];
      const start = performance.now();
      function tick(now) {
        frames.push(now);
        if (now - start < 1200) requestAnimationFrame(tick);
        else resolve(Math.round((frames.length / (now - start)) * 1000));
      }
      requestAnimationFrame(tick);
    });
  });
  console.log(JSON.stringify({ benchmark: 'fps-raf', fps, target: 60, pass: fps >= 55 }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
`;

const result = spawnSync(process.execPath, ["-e", script], { cwd: ROOT, encoding: "utf8", env: process.env });
const payload = {
  generatedAt: new Date().toISOString(),
  sprint: 45,
  stdout: result.stdout.trim(),
  stderr: result.stderr.trim(),
  exitCode: result.status,
};

writeFileSync(resolve(OUT_DIR, "fps-benchmark.json"), JSON.stringify(payload, null, 2));
writeFileSync(
  resolve(ROOT, "FPS_REPORT.md"),
  `# FPS Report — Sprint 45 Live Monitor V2\n\nGenerated: ${payload.generatedAt}\n\n## RAF Baseline\n\n\`\`\`json\n${payload.stdout || "{}"}\n\`\`\`\n\n## Target\n\n60 FPS canvas animation; pass threshold ≥55 FPS.\n`,
);

console.log("FPS benchmark written to FPS_REPORT.md");
