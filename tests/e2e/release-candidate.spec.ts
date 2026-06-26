import { expect, test } from "@playwright/test";
import { apiLogin, API_URL, uiLogin } from "./utils/qa";

test.describe("Sprint 37 release candidate validation", () => {
  test("release candidate dashboard API returns launch score and workflow checks", async ({ request }) => {
    const session = await apiLogin(request, "owner");
    const response = await request.get(`${API_URL}/release-candidate/dashboard`, {
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.release.releaseReadinessScore).toBeGreaterThanOrEqual(0);
    expect(body.release.validationSummary.total).toBeGreaterThan(0);
    expect(body.release.checks.some((check: { category: string }) => check.category === "Workflow A")).toBeTruthy();
    expect(body.release.performance).toBeTruthy();
    expect(body.release.bugBash).toBeTruthy();
  });

  test("release candidate UI renders final release dashboard", async ({ page }) => {
    await uiLogin(page, "owner");
    await page.goto("/release-candidate");
    await expect(page.getByText("Final Release Dashboard")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("End-to-End Workflow Validation")).toBeVisible();
    await expect(page.getByText("Performance and Load")).toBeVisible();
  });
});
