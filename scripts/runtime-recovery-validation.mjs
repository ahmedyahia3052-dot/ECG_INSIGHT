import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const API_ORIGIN = "http://127.0.0.1:3002";
const API_URL = `${API_ORIGIN}/api`;
const FRONTEND_URL = "http://127.0.0.1:8081";

const report = {
  apiChecks: {},
  consoleErrors: [],
  frontendChecks: {},
  hotReload: {},
  navigation: {},
  timestamp: new Date().toISOString(),
};

async function apiHealth() {
  const live = await fetch(`${API_ORIGIN}/live`);
  const ready = await fetch(`${API_ORIGIN}/ready`);
  const health = await fetch(`${API_ORIGIN}/health`);
  report.apiChecks = {
    health: { ok: health.ok, status: health.status },
    live: { ok: live.ok, status: live.status },
    ready: { ok: ready.ok, payload: await ready.json(), status: ready.status },
  };
  if (!live.ok || !ready.ok) throw new Error("API health checks failed");
}

async function apiLogin() {
  const response = await fetch(`${API_URL}/auth/login`, {
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password", rememberMe: true }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function fetchCaseId(token) {
  const response = await fetch(`${API_URL}/cases?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Cases fetch failed: ${response.status}`);
  const payload = await response.json();
  const caseId = payload?.items?.[0]?.id ?? payload?.cases?.[0]?.id ?? payload?.data?.[0]?.id;
  if (!caseId) throw new Error("No ECG case available for viewer validation");
  return caseId;
}

async function runBrowserValidation(caseId) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: FRONTEND_URL });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => report.consoleErrors.push(error.message));

  const loginResponse = await context.request.post(`${API_URL}/auth/login`, {
    data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
  });
  if (!loginResponse.ok()) throw new Error(`Browser context login failed: ${loginResponse.status()} ${await loginResponse.text()}`);

  await page.goto("/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
  await page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first().waitFor({ state: "visible", timeout: 45_000 });

  const routes = [
    { key: "dashboard", path: "/dashboard", selector: "text=Enterprise Clinical Command Center" },
    { key: "ecgWorkspace", path: "/ecg-workspace", selector: "text=ECG Pro Clinical Workspace" },
    { key: "ecgViewer", path: `/ecg-monitor/${caseId}`, selector: '[data-testid="sprint13-ecg-viewer-toolbar"]' },
  ];

  for (const route of routes) {
    await page.goto(route.path, { timeout: 60_000, waitUntil: "domcontentloaded" });
    if (route.key === "ecgViewer") {
      await page.getByTestId("sprint13-ecg-monitor-loading").waitFor({ state: "detached", timeout: 45_000 }).catch(() => {});
    }
    await page.waitForTimeout(2_000);
    const bodyText = await page.locator("body").innerText();
    const connectionLost = /connection lost|ERR_CONNECTION_REFUSED|offline mode/i.test(bodyText);
    const blank = bodyText.trim().length < 20;
    let selectorVisible = true;
    try {
      await page.locator(route.selector).first().waitFor({ state: "visible", timeout: 30_000 });
    } catch {
      selectorVisible = false;
    }
    report.navigation[route.key] = {
      blank,
      connectionLost,
      path: route.path,
      selectorVisible,
      title: await page.title(),
      url: page.url(),
    };
  }

  const before = await page.content();
  await page.goto("/dashboard", { timeout: 30_000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);
  const after = await page.content();
  report.hotReload = {
    devServerResponsive: true,
    navigationStable: before.length > 100 && after.length > 100,
  };

  await browser.close();
}

async function main() {
  await apiHealth();
  const login = await apiLogin();
  const caseId = await fetchCaseId(login.accessToken);
  report.caseId = caseId;
  await runBrowserValidation(caseId);
  report.ok =
    report.apiChecks.live.ok
    && report.apiChecks.ready.ok
    && Object.values(report.navigation).every((item) => !item.connectionLost && !item.blank && item.selectorVisible)
    && report.consoleErrors.filter((e) => !/favicon|404.*\.map|devtools/i.test(e)).length === 0;

  writeFileSync("test-results/runtime-recovery-validation.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ caseId, consoleErrors: report.consoleErrors.length, navigation: report.navigation, ok: report.ok }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
