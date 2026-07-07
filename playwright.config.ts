import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8081";
const isCI = !!process.env["CI"];

export default defineConfig({
  expect: { timeout: 30_000 },
  forbidOnly: isCI,
  fullyParallel: false,
  globalSetup: "./tests/e2e/global-setup.mjs",
  globalTeardown: "./tests/e2e/global-teardown.mjs",
  globalTimeout: isCI ? 45 * 60 * 1000 : 90 * 60 * 1000,
  outputDir: "test-results/playwright-artifacts",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
    ["json", { outputFile: "test-results/playwright-report.json" }],
  ],
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}{ext}",
  retries: 0,
  // Copilot E2E shares one API instance; parallel workers cause stream timeouts.
  workers: 1,
  testDir: "tests/e2e",
  timeout: 120_000,
  use: {
    actionTimeout: 45_000,
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    storageState: undefined,
  },
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: /.*mobile-responsive.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { height: 900, width: 1440 } },
    },
    {
      name: "mobile-iphone",
      testMatch: /.*mobile.*\.spec\.ts/,
      use: { ...devices["iPhone 14 Pro"], browserName: "chromium" },
    },
    {
      name: "tablet-ipad",
      testMatch: /.*mobile.*\.spec\.ts/,
      use: { ...devices["iPad Pro 11"], browserName: "chromium" },
    },
  ],
});
