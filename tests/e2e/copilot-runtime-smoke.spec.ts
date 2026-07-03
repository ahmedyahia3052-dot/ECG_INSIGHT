import { expect, test } from "@playwright/test";
import { API_URL, attachStrictRuntimeDiagnostics, clickCopilotStreamingAction, disableCopilotVoiceMode, exportCopilotConversation, uploadCopilotAttachment } from "./utils/qa";
import { installCopilotVoiceMocks } from "./utils/voice-mocks";

test.describe("Copilot runtime hardening", () => {
  test.describe.configure({ timeout: 180_000 });

  test("chat, upload, refresh, navigation, export, and share never reach ErrorBoundary @smoke", async ({ page }) => {
    const runtime = attachStrictRuntimeDiagnostics(page);
    await installCopilotVoiceMocks(page, ["runtime smoke voice transcript"]);
    await page.addInitScript(() => {
      window.localStorage.setItem("ecg-insight:copilot-workspace-state", "{malformed-json");
    });

    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    expect(loginResponse.ok(), `Doctor login should succeed: ${await loginResponse.text()}`).toBeTruthy();
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });

    async function expectNoErrorBoundary() {
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
    }

    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    for (const retiredWorkflow of ["Interpret ECG", "Generate Impression", "Patient Summary", "Differential Diagnosis", "Follow-up Plan", "Generate Report"]) {
      await expect(page.getByRole("button", { name: retiredWorkflow })).toHaveCount(0);
    }
    await expectNoErrorBoundary();

    await page.getByRole("button", { name: "New Chat" }).click();
    await expectNoErrorBoundary();

    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    async function sendAndWaitForAssistant(prompt: string, expectedText?: RegExp | string) {
      await composer.fill(prompt);
      await clickCopilotStreamingAction(page, "Send");
      await expect(page.getByText("Assistant").first()).toBeVisible({ timeout: 45_000 });
      if (expectedText) await expect(page.getByText(expectedText).first()).toBeVisible({ timeout: 45_000 });
      await expect(page).toHaveURL(/\/copilot\/[^/]+$/);
      await expectNoErrorBoundary();
    }

    await sendAndWaitForAssistant("hi", /Hello|Good (morning|afternoon|evening)|Welcome back/i);
    await page.getByRole("button", { name: "New Chat" }).click();
    await sendAndWaitForAssistant("What is hypertension?", /hypertension/i);
    await page.getByRole("button", { name: "New Chat" }).click();
    await sendAndWaitForAssistant("I have chest pain and sweating", /chest pain|vitals|ECG|troponin|presentation|urgent|emergency|immediate/i);
    await page.getByRole("button", { name: "New Chat" }).click();

    await page.getByRole("button", { name: "Voice" }).last().click();
    await expect(composer).toHaveValue(/runtime smoke voice transcript/i, { timeout: 10_000 });
    await disableCopilotVoiceMode(page);
    await composer.fill("");

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("Troponin 0.42 potassium 5.7 ECG irregular rhythm"),
      buttonName: "Upload Files",
      mimeType: "text/plain",
      name: "runtime-labs.txt",
    });

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("ECG rhythm strip PR interval QRS QTc ST depression"),
      buttonName: "Upload ECG",
      mimeType: "application/pdf",
      name: "runtime-ecg.pdf",
    });

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"),
      buttonName: "Upload Image",
      mimeType: "image/png",
      name: "runtime-image.png",
    });

    await sendAndWaitForAssistant("Runtime smoke test: summarize uploaded ECG, image, and labs.", /reviewed the material|runtime-labs\.txt/i);
    await sendAndWaitForAssistant("Using the files I uploaded earlier, what should I re-check?", /reviewed|runtime-labs\.txt|correlate/i);
    await sendAndWaitForAssistant("How is hypertension diagnosed?");

    await page.getByRole("button", { name: "Play answer" }).first().click();
    await expect(page.getByText(/Speaking|Voice paused/).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Stop voice" }).first().click({ force: true });

    const conversationUrl = page.url();
    await page.reload();
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Assistant").first()).toBeVisible({ timeout: 45_000 });
    await expectNoErrorBoundary();

    await page.getByRole("button", { name: "New Chat" }).click();
    await expect(page).toHaveURL(/\/copilot$/);
    await page.goto(conversationUrl);
    await expect(page).toHaveURL(/\/copilot\/[^/]+$/);
    await expect(page.getByText("Assistant").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled({ timeout: 30_000 });
    await expectNoErrorBoundary();

    await exportCopilotConversation(page, "pdf");
    await expectNoErrorBoundary();

    await exportCopilotConversation(page, "txt");
    await expectNoErrorBoundary();

    await page.getByRole("button", { name: "Share" }).last().click();
    await expect(page.getByText(/Share sheet opened|Conversation deep link and text copied|Conversation text downloaded/)).toBeVisible({ timeout: 20_000 });
    await expectNoErrorBoundary();

    runtime.assertClean();
  });
});
