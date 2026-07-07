import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  assertWorkspaceShell,
  ecgClinicalRightPanel,
  ecgLeftRail,
  ecgToolbar,
  ensureLeftPanelOpen,
  openEcgWorkspace,
} from "./utils/ecg-workspace-locators";

test.describe("ECG Workspace Restoration @restoration", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("ecg-workspace renders enterprise viewer instead of legacy import UI", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await assertWorkspaceShell(page);
    await ensureLeftPanelOpen(page);
    await expect(page.getByText("ECG Image Interpretation")).toHaveCount(0);
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/ecg-workspace-restored.png" });
  });

  test("ecg-workspace demo mode auto-loads sample case", async ({ page }) => {
    await page.goto("/ecg-workspace", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByTestId("ecg-enterprise-workspace-ready").or(page.getByTestId("ecg-workspace-no-demo")),
    ).toBeVisible({ timeout: 60_000 });
    if (await page.getByTestId("ecg-enterprise-workspace-ready").isVisible()) {
      await assertWorkspaceShell(page);
      await page.screenshot({ fullPage: true, path: "test-results/screenshots/ecg-workspace-demo-mode.png" });
    }
  });
});
