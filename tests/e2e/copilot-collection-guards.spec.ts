import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/qa";

test.describe("Copilot collection guard regression", () => {
  test("copilot chat, uploads, and conversation switching never crash @smoke", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (error) => pageErrors.push(`${error.message}\n${error.stack ?? ""}`));

    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    expect(loginResponse.ok(), `Doctor login should succeed: ${await loginResponse.text()}`).toBeTruthy();
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });

    async function expectHealthyCopilot() {
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
      await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible();
    }

    await page.goto("/copilot");
    await expectHealthyCopilot();

    await page.getByRole("button", { name: "New Chat" }).click();
    await expectHealthyCopilot();

    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await composer.fill("hi");
    const streamResponse = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 45_000 });
    await page.getByRole("button", { name: "Send" }).click();
    await streamResponse;
    await expect(page.getByText("Assistant").first()).toBeVisible({ timeout: 45_000 });
    await expect(page).toHaveURL(/\/copilot\/[^/]+$/);
    await expectHealthyCopilot();

    const firstConversationUrl = page.url();

    const imageChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Image" }).last().click();
    await (await imageChooser).setFiles({ buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), mimeType: "image/png", name: "guard-image.png" });
    await expect(page.getByText("guard-image.png").last()).toBeVisible({ timeout: 30_000 });
    await expectHealthyCopilot();

    const fileChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Files" }).last().click();
    await (await fileChooser).setFiles({ buffer: Buffer.from("Troponin 0.42 potassium 5.7"), mimeType: "text/plain", name: "guard-labs.txt" });
    await expect(page.getByText("guard-labs.txt").last()).toBeVisible({ timeout: 30_000 });
    await expectHealthyCopilot();

    await page.getByRole("button", { name: "New Chat" }).click();
    await expect(page).toHaveURL(/\/copilot$/);
    await expectHealthyCopilot();

    await composer.fill("second conversation");
    const secondStream = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 45_000 });
    await page.getByRole("button", { name: "Send" }).click();
    await secondStream;
    await expect(page.getByText("Assistant").first()).toBeVisible({ timeout: 45_000 });
    const secondConversationUrl = page.url();
    await expectHealthyCopilot();

    await page.goto(firstConversationUrl);
    await expect(page.getByText("Assistant").first()).toBeVisible({ timeout: 45_000 });
    await expectHealthyCopilot();

    await page.goto(secondConversationUrl);
    await expect(page.getByText("Assistant").first()).toBeVisible({ timeout: 45_000 });
    await expectHealthyCopilot();

    expect(pageErrors.filter((message) => /reading 'filter'|\.filter is not a function/i.test(message))).toEqual([]);
  });
});
