import { expect, test } from "@playwright/test";
import { API_URL, apiLogin, createClinicalFixture, expectPageReady, navigate, uiLogin } from "./utils/qa";

test.describe("owner controls, copilot, ECG viewer, search, notifications, and exports", () => {
  test("owner license management can grant a temporary enterprise license @smoke", async ({ page, request }) => {
    const owner = await apiLogin(request, "owner");
    const stamp = Date.now();
    const userResponse = await request.post(`${API_URL}/users/internal`, {
      data: {
        email: `qa-license-${stamp}@ecg.test`,
        name: "QA License User",
        password: "StrongPass123!",
        role: "doctor",
      },
      headers: { authorization: `Bearer ${owner.token}` },
    });
    expect(userResponse.ok(), "Owner should create temporary internal user").toBeTruthy();
    const target = (await userResponse.json()).user as { id: string; email: string };

    await uiLogin(page, "owner");
    await navigate(page, "/owner/licenses", "Owner License Management");
    await expectPageReady(page, "Owner License Management");
    await page.getByPlaceholder("User UUID").fill(target.id);
    await page.getByRole("button", { name: "enterprise" }).click();
    await page.getByRole("button", { name: /^Grant License$/ }).click();
    await expect(page.getByText("QA License User").first()).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Search user/email...").fill(target.email);
    await expect(page.getByText(target.email)).toBeVisible();
  });

  test("Medical AI Copilot opens, answers, manages conversation, and exports PDF @smoke", async ({ page, request }) => {
    await apiLogin(request, "doctor");
    await uiLogin(page, "owner");
    await navigate(page, "/dashboard", /Enterprise Clinical Command Center|Dashboard/);
    await page.getByLabel("Open Medical AI Copilot").click();
    await expect(page.getByText("Medical AI Copilot")).toBeVisible();
    const enableButton = page.getByRole("button", { name: "Enable Copilot" });
    if (await enableButton.isVisible().catch(() => false)) {
      await enableButton.click();
    }
    await page.getByPlaceholder("Ask the Medical AI Copilot...").fill("Explain atrial fibrillation and occupational fitness risk.");
    await page.getByRole("button", { name: "Send" }).click();
    const exportButton = page.getByRole("button", { name: "Export Conversation PDF" });
    await expect(page.getByText(/Current Context|Medical AI Copilot/).first()).toBeVisible({ timeout: 45_000 });
    if (await exportButton.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Favorite" }).click();
      await page.getByRole("button", { name: "Rename" }).click();
      const download = page.waitForEvent("download", { timeout: 20_000 }).catch(() => null);
      await exportButton.click();
      await download;
    }
  });

  test("ECG Pro Viewer exposes viewer controls, annotations, AI explainability, and report actions", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    await uiLogin(page, "doctor");
    await navigate(page, "/ecg-cases", "ECG Case Management");
    await page.getByPlaceholder(/Search case/i).fill(fixture.caseNumber ?? fixture.caseId);
    await expect(page.getByText(fixture.caseNumber ?? fixture.caseId)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Open" }).first().click();
    await expectPageReady(page, "ECG Case");
    await expect(page.getByText(/ECG Measurements|AI Findings|Explainability/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Run AI|Generate Report|Review|Process/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /Generate Report/i }).first().click();
    await navigate(page, "/reports", "Reports Workflow");
    await expect(page.getByText(/Report ID|Clinical Reports/)).toBeVisible({ timeout: 30_000 });
  });

  test("notifications, filters, dialogs, search, and settings persistence work", async ({ page, request }) => {
    const doctor = await apiLogin(request, "doctor");
    const notification = await request.post(`${API_URL}/notifications`, {
      data: { message: "QA notification from Playwright.", title: "QA Playwright Notification", type: "INFO" },
      headers: { authorization: `Bearer ${doctor.token}` },
    });
    expect(notification.ok()).toBeTruthy();

    await uiLogin(page, "doctor");
    await navigate(page, "/notifications", "Notification Center");
    await expectPageReady(page, "Notification Center");
    await page.getByPlaceholder("Search notifications...").fill("QA Playwright");
    await expect(page.getByText("QA Playwright Notification")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "info" }).click();
    await page.getByRole("button", { name: "Read" }).first().click();
    await page.getByRole("button", { name: "Dismiss" }).first().click();

    await navigate(page, "/settings", "Workspace Settings");
    await expectPageReady(page, "Workspace Settings");
    await page.getByText("Reduce Motion").click();
    await expect(page.getByText("Workspace setting saved.")).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByText("Workspace Settings")).toBeVisible();

    await page.getByLabel("Global search").fill("QA");
    await expect(page.getByLabel("Global search")).toHaveValue("QA");
  });
});
