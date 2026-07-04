import { expect, test } from "./test";
import { API_URL, createClinicalFixture, users } from "./utils/qa";

async function loginDoctorPage(page: import("@playwright/test").Page) {
  const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: users.doctor.email, password: users.doctor.password, rememberMe: true },
  });
  expect(loginResponse.ok()).toBeTruthy();
}

test.describe("Sprint 13 ECG Monitor Workspace @sprint13", () => {
  test("ecg monitor workspace renders viewer foundation with toolbar and dockable panels", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    await loginDoctorPage(page);
    await page.goto(`/ecg-monitor/${fixture.caseId}`);
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("sprint13-ecg-viewer-toolbar")).toBeVisible();
    await expect(page.getByText("ECG Pro Viewer & Monitor Workspace")).toBeVisible();
    await expect(page.getByText("Patient Information")).toBeVisible();
    await expect(page.getByText("Study Information")).toBeVisible();
    await expect(page.getByText("AI Findings")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-measurements-panel")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-viewer-timeline")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-viewer-status")).toBeVisible();
  });

  test("viewer toolbar controls adjust zoom and grid without crash", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    await loginDoctorPage(page);
    await page.goto(`/ecg-monitor/${fixture.caseId}`);
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Zoom In" }).click();
    await page.getByRole("button", { name: "Fit Width" }).click();
    await page.getByRole("button", { name: "Rotate" }).click();
    await page.getByRole("button", { name: /Grid On|Grid Off/ }).click();
    await expect(page.getByTestId("sprint13-ecg-viewer-status").getByText("Grid OFF")).toBeVisible();
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("ecg case detail exposes ECG Monitor entry point", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    await loginDoctorPage(page);
    await page.goto(`/ecg-cases/${fixture.caseId}`);
    await expect(page.getByRole("button", { name: "ECG Monitor" })).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "ECG Monitor" }).click();
    await expect(page).toHaveURL(new RegExp(`/ecg-monitor/${fixture.caseId}$`));
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
  });

  test("measurement workspace panel and tools are available in Phase 2", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    await loginDoctorPage(page);
    await page.goto(`/ecg-monitor/${fixture.caseId}`);
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("sprint13-ecg-measurements-panel")).toBeVisible();
    await page.getByRole("button", { name: "Measure" }).click();
    await page.getByRole("button", { name: "Caliper" }).click();
    await page.getByRole("button", { name: "Horizontal" }).click();
    await expect(page.getByTestId("sprint13-ecg-measurement-overlay")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-viewer-status").getByText(/Tool caliper/)).toBeVisible();
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });
});
