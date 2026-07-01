import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8081";
const apiURL = process.env["PLAYWRIGHT_API_URL"] ?? "http://127.0.0.1:3002/api";
const isCI = !!process.env["CI"];

export default defineConfig({
  expect: { timeout: 15_000 },
  forbidOnly: isCI,
  fullyParallel: false,
  globalTimeout: isCI ? 15 * 60 * 1000 : 20 * 60 * 1000,
  outputDir: "test-results/playwright-artifacts",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
  ],
  retries: isCI ? 2 : 0,
  // Copilot E2E shares one API instance; parallel workers cause stream timeouts.
  workers: 1,
  testDir: "tests/e2e",
  timeout: 90_000,
  use: {
    actionTimeout: 20_000,
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:api",
      env: {
        CLIENT_ORIGIN: baseURL,
        EXPO_PUBLIC_API_URL: apiURL,
        NODE_ENV: "development",
        PORT: "3002",
      },
      reuseExistingServer: true,
      timeout: 120_000,
      url: `${apiURL}/health`,
    },
    {
      command: "npm run dev:frontend",
      env: {
        EXPO_NO_DOCTOR: "1",
        EXPO_OFFLINE: "1",
        EXPO_PUBLIC_API_URL: apiURL,
        NODE_ENV: "development",
      },
      reuseExistingServer: true,
      timeout: 180_000,
      url: baseURL,
    },
  ],
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: /.*mobile-responsive.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { height: 900, width: 1440 } },
    },
    {
      name: "mobile-iphone",
      testMatch: /.*mobile.*\.spec\.ts/,
      use: { ...devices["iPhone 14 Pro"] },
    },
    {
      name: "tablet-ipad",
      testMatch: /.*mobile.*\.spec\.ts/,
      use: { ...devices["iPad Pro 11"] },
    },
  ],
});
