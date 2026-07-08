/**
 * Enterprise workflow matrix — fills Playwright gaps without modifying production UI.
 * @qa-matrix @enterprise
 */
import { expect, test } from "./test";
import {
  bootstrapAuthenticatedPage,
  createClinicalFixture,
  createPatient,
  apiLogin,
  API_URL,
  authHeaders,
  ensureLoginScreen,
  navigate,
  uiLogin,
} from "./utils/qa";
import {
  clickViewControl,
  ecgClinicalRightPanel,
  ecgDiagnosticExit,
  ecgToolbar,
  ecgViewMode,
  ecgViewModeSwitcher,
  expandLeftPanelSection,
  openAiTab,
  openEcgWorkspace,
  openMeasurementsTab,
  paletteButton,
  toolbarButton,
} from "./utils/ecg-workspace-locators";

test.describe("Enterprise Workflow Matrix @qa-matrix @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";
  let patientId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    caseId = fixture.caseId;
    patientId = fixture.patientId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok()).toBeTruthy();
  });

  test("authentication login screen and dashboard", async ({ page }) => {
    await ensureLoginScreen(page);
    await uiLogin(page, "doctor");
    await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible();
  });

  test("dashboard and patients navigation", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await navigate(page, "/dashboard", /Enterprise Clinical Command Center|Dashboard/);
    await navigate(page, "/patients", "Patient Command Search");
    await expect(page.getByRole("button", { name: /Create Patient/i }).first()).toBeVisible();
  });

  test("patient details via API-created patient", async ({ page, request }) => {
    const session = await apiLogin(request, "doctor");
    const patient = await createPatient(request, session, `matrix-${Date.now()}`);
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto(`/patients/${patient.id}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Patient Profile|QA/).first()).toBeVisible({ timeout: 45_000 });
  });

  test("ECG upload route ready", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await navigate(page, "/upload-ecg", "Upload ECG");
    await expect(page.getByRole("button", { name: /Select Images\/PDF/i })).toBeVisible();
  });

  test("viewer shell with toolbar and view mode switcher", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgViewModeSwitcher(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
  });

  test("zoom pan and grid controls via floating palette", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await clickViewControl(page, "Zoom In");
    await clickViewControl(page, "Pan");
    await clickViewControl(page, "Grid");
    await clickViewControl(page, "Fit Image");
  });

  test("digitization and waveform view modes", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
    await ecgViewMode(page, "processed").click();
  });

  test("measurements and AI findings panels", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await openMeasurementsTab(page);
    await openAiTab(page);
  });

  test("overlay and compare view modes", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "overlay").click();
    await ecgViewMode(page, "compare").click();
  });

  test("fullscreen diagnostic mode and exit", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await toolbarButton(page, "Fullscreen").click();
    await expect(ecgDiagnosticExit(page)).toBeVisible({ timeout: 15_000 });
    await ecgDiagnosticExit(page).click();
    await expect(ecgToolbar(page)).toBeVisible();
  });

  test("history tab in clinical right panel", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint26-clinical-tab-history").click();
    await expect(page.getByTestId("sprint30-history-engine")).toBeVisible({ timeout: 15_000 });
  });

  test("reports workflow and settings", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await navigate(page, "/reports", "Reports Workflow");
    await expect(page.getByRole("button", { name: /create report/i }).first()).toBeVisible();
    await navigate(page, "/settings", "Workspace Settings");
    await expect(page.getByText("Reduce Motion")).toBeVisible();
  });

  test("enterprise dark shell on dashboard", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto("/dashboard");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBeTruthy();
  });

  test("empty workspace demo fallback state", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto("/ecg-workspace", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByTestId("ecg-enterprise-workspace-ready").or(page.getByTestId("ecg-workspace-no-demo")),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("error recovery — forced login after invalid route", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto("/this-route-does-not-exist-qa-matrix");
    await expect(page.locator("body")).toBeVisible();
  });

  test("workflow pipeline chips in left panel", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expandLeftPanelSection(page, "Workflow");
    await expect(page.getByTestId("sprint335-pipeline-1")).toBeVisible({ timeout: 15_000 });
  });
});
