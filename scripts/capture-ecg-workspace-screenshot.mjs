import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const API_URL = "http://127.0.0.1:3002/api";
const FRONTEND_URL = "http://127.0.0.1:8081";

mkdirSync("test-results/screenshots", { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: FRONTEND_URL });
const page = await context.newPage();

const loginResponse = await context.request.post(`${API_URL}/auth/login`, {
  data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
});
const loginPayload = await loginResponse.json();
await page.route("**/api/auth/refresh", async (route) => {
  await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
});

await page.goto("/ecg-workspace", { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(5_000);
await page.screenshot({ fullPage: true, path: "test-results/screenshots/ecg-workspace-restored-full.png" });

const cases = await context.request.get(`${API_URL}/cases?page=1&pageSize=1`, {
  headers: { authorization: `Bearer ${loginPayload.accessToken}` },
});
const payload = await cases.json();
const caseId = payload?.cases?.[0]?.id;
if (caseId) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(8_000);
  await page.screenshot({ fullPage: true, path: "test-results/screenshots/ecg-workspace-case-loaded.png" });
}

await browser.close();
console.log("Screenshots saved to test-results/screenshots/");
