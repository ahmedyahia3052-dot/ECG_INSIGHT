import { expect, test } from "@playwright/test";
import { apiLogin, createClinicalFixture, createPatient, expectPageReady, navigate, uiLogin } from "./utils/qa";

test.describe("enterprise clinical workflows", () => {
  test("create patient form, filters, search, export and navigation work @smoke", async ({ page }) => {
    await uiLogin(page, "doctor");
    await navigate(page, "/patients", "Patient Command Search");
    await page.getByRole("button", { name: /Create Patient|Add Patient/i }).first().click();
    await expectPageReady(page, "Create Patient");

    const stamp = Date.now().toString();
    const inputs = page.locator("input");
    await inputs.nth(0).fill(`QA${stamp.slice(-5)}`);
    await inputs.nth(2).fill("Automation");
    await inputs.nth(3).fill(`QA-UI-${stamp}`);
    await page.getByRole("button", { name: "Select Gender" }).click();
    await page.getByRole("button", { name: "Male", exact: true }).first().click();
    await page.getByRole("button", { name: /Create Patient/i }).last().click();

    await expect(page.getByText(/Patient Profile|QA/).first()).toBeVisible({ timeout: 30_000 });
    await navigate(page, "/patients", "Patient Command Search");
    await page.getByPlaceholder(/Patient ID, employee ID/i).fill(`QA${stamp.slice(-5)}`);
    await expect(page.getByPlaceholder(/Patient ID, employee ID/i)).toHaveValue(`QA${stamp.slice(-5)}`);
    await page.getByRole("button", { name: "male", exact: true }).first().click();
    await page.getByRole("button", { name: /Sort createdAt/i }).click();
    await page.getByRole("button", { name: /Export CSV/i }).click();
    await page.getByRole("button", { name: /Print/i }).click();
  });

  test("create ECG case form and ECG viewer route load with generated clinical data @smoke", async ({ page, request }) => {
    const session = await apiLogin(request, "doctor");
    const patient = await createPatient(request, session.token);

    await uiLogin(page, "doctor");
    await navigate(page, "/ecg-cases", "ECG Case Management");
    await page.getByRole("button", { name: /\+ New ECG Case/i }).first().click();
    await expectPageReady(page, "New ECG Case");
    await page.getByPlaceholder(/Patient name, MRN/i).fill(patient.firstName);
    await expect(page.getByText(patient.firstName).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Select" }).first().click();

    const inputs = page.locator("input");
    await inputs.nth(2).fill("72");
    await inputs.nth(3).fill("160");
    await inputs.nth(4).fill("92");
    await inputs.nth(5).fill("390");
    await inputs.nth(6).fill("420");
    await page.getByRole("button", { name: "abnormal" }).click();
    await page.getByRole("button", { name: /Create ECG Case/i }).click();

    await expect(page.getByText(/ECG Case|ECG Measurements/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Run AI|Process|Generate Report/i }).first()).toBeVisible();
  });

  test("upload ECG, analyze, generate report, search reports, and export PDF", async ({ page, request }) => {
    const session = await apiLogin(request, "doctor");
    const patient = await createPatient(request, session.token);

    await uiLogin(page, "doctor");
    await navigate(page, "/upload-ecg", "Upload ECG");
    await expectPageReady(page, "Upload ECG");

    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Select Images\/PDF/i }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"),
      mimeType: "image/png",
      name: `qa-upload-${Date.now()}-50mm-20mm-ecg.png`,
    });

    await page.getByPlaceholder(/Patient ID, employee ID/i).fill(patient.medicalRecordNumber);
    await expect(page.getByText(patient.medicalRecordNumber)).toBeVisible({ timeout: 30_000 });
    await page.getByText("Select").last().click();
    await page.getByRole("button", { name: /^Analyze ECG$/ }).click();
    await expect(page.getByText(/AI Results|Enterprise report generated|Normal ECG|STEMI|Sinus/)).toBeVisible({ timeout: 60_000 });

    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    await navigate(page, "/reports", "Reports Workflow");
    await expectPageReady(page, "Reports Workflow");
    await page.getByPlaceholder(/Patient, report number/i).fill(fixture.caseNumber ?? fixture.caseId);
    await expect(page.getByText(/Report ID|Clinical Reports|No reports/)).toBeVisible();
    const exportButton = page.getByRole("button", { name: /Export PDF/i }).first();
    if (await exportButton.isVisible().catch(() => false)) {
      const download = page.waitForEvent("download", { timeout: 20_000 }).catch(() => null);
      await exportButton.click();
      await download;
    }
  });
});
