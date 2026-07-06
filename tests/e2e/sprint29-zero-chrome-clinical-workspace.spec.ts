import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByTestId("sprint29-zero-chrome-workstation-ready").or(page.getByTestId("sprint26-hospital-workstation-ready")),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 29 Zero-Chrome Clinical Workspace @sprint29", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("zero-chrome toolbar with smart groups and mode switcher", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint29-zero-chrome-toolbar").or(page.getByTestId("sprint26-compact-ribbon"))).toBeVisible();
    await expect(page.getByTestId("sprint29-toolbar-group-file")).toBeVisible();
    await expect(page.getByTestId("sprint29-view-mode-switcher").or(page.getByTestId("sprint26-view-mode-switcher"))).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint29-zero-chrome-toolbar.png" });
  });

  test("floating palette and enterprise layout engine", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint29-enterprise-layout-engine")).toBeVisible();
    await page.getByTestId("sprint29-floating-palette-peek").click();
    await expect(page.getByTestId("sprint29-floating-tool-palette")).toBeVisible();
    await expect(page.getByTestId("sprint29-enterprise-status-bar").or(page.getByTestId("sprint28-enterprise-status-bar"))).toBeVisible();
  });

  test("diagnostic mode maximizes viewer", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.keyboard.press("F11");
    await expect(page.getByTestId("sprint29-diagnostic-header")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-image-canvas").first()).toBeVisible();
    await page.getByTestId("sprint29-exit-diagnostic").click();
    await expect(page.getByTestId("sprint29-zero-chrome-toolbar").or(page.getByTestId("sprint26-compact-ribbon"))).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint29-diagnostic-mode.png" });
  });
});
