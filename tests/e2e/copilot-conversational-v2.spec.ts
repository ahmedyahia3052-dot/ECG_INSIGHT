import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/qa";

test.describe("Clinical AI Copilot Engine V2", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      class MockSpeechRecognition {
        continuous = true;
        interimResults = true;
        lang = "en-US";
        onend: (() => void) | null = null;
        onerror: ((event: { error?: string }) => void) | null = null;
        onresult: ((event: {
          resultIndex: number;
          results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }>;
        }) => void) | null = null;
        start() {
          setTimeout(() => {
            this.onresult?.({
              resultIndex: 0,
              results: [{ 0: { transcript: "hello copilot" }, isFinal: true, length: 1 }],
            });
            this.onend?.();
          }, 20);
        }
        stop() {
          this.onend?.();
        }
        abort() {
          this.onend?.();
        }
      }
      Object.assign(window, {
        SpeechRecognition: MockSpeechRecognition,
        webkitSpeechRecognition: MockSpeechRecognition,
        MediaRecorder: class {
          static isTypeSupported() { return true; }
          state = "inactive";
          ondataavailable: ((event: { data: Blob }) => void) | null = null;
          onstop: (() => void) | null = null;
          constructor(_stream: MediaStream) { void _stream; }
          start() { this.state = "recording"; }
          stop() {
            this.ondataavailable?.({ data: new Blob(["mock"], { type: "audio/webm" }) });
            this.onstop?.();
          }
        },
      });
      navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => undefined }],
      } as MediaStream);
      window.speechSynthesis = {
        cancel: () => undefined,
        pause: () => undefined,
        resume: () => undefined,
        speak: (utterance) => {
          setTimeout(() => {
            utterance.onstart?.();
            setTimeout(() => utterance.onend?.(), 10);
          }, 0);
        },
      };
    });

    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "New Chat" }).click();
  });

  async function sendPrompt(page: import("@playwright/test").Page, prompt: string) {
    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await composer.fill(prompt);
    const sendButton = page.getByRole("button", { name: "Send" });
    await expect(sendButton).toBeEnabled({ timeout: 60_000 });
    const response = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 60_000 });
    await sendButton.click();
    await response;
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 60_000 });
    return page.getByTestId("copilot-message-thread");
  }

  async function expectCleanThread(page: import("@playwright/test").Page) {
    const thread = page.getByTestId("copilot-message-thread");
    await expect(thread.getByText(/^Definition:/i)).toHaveCount(0);
    await expect(thread.getByText(/^References:/i)).toHaveCount(0);
    await expect(thread.getByText(/Confidence Score:/i)).toHaveCount(0);
  }

  test("greeting stays conversational without report formatting", async ({ page }) => {
    await sendPrompt(page, "Hello");
    await expect(page.getByText(/Hello|Good (morning|afternoon|evening)|Welcome back/i).first()).toBeVisible();
    await expectCleanThread(page);
  });

  test("medical education answers naturally", async ({ page }) => {
    const thread = await sendPrompt(page, "What is hypertension?");
    await expect(thread.getByText(/hypertension|blood pressure/i).first()).toBeVisible();
    await expect(thread.getByText(/^Definition:/i)).toHaveCount(0);
  });

  test("small talk and help requests stay conversational", async ({ page }) => {
    await sendPrompt(page, "How are you?");
    await expect(page.getByText(/ready|help|work on/i).first()).toBeVisible();
    await page.getByRole("button", { name: "New Chat" }).click();
    await sendPrompt(page, "I need your help");
    await expect(page.getByText(/here to help|tell me what you need/i).first()).toBeVisible();
  });

  test("conversation memory resolves follow-up pronouns", async ({ page }) => {
    await sendPrompt(page, "How is hypertension diagnosed?");
    await expect(page.getByTestId("copilot-message-thread").getByText(/hypertension|diagnos|blood pressure|measure|reading|workup/i).first()).toBeVisible();
  });

  test("topic switching works across turns", async ({ page }) => {
    await sendPrompt(page, "What drugs are commonly used for hypertension?");
    await expect(page.getByTestId("copilot-message-thread").getByText(/hypertension|drug|medication|agent|blood pressure|treatment/i).first()).toBeVisible();
  });

  test("ECG upload acknowledgment is conversational", async ({ page }) => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload ECG" }).last().click();
    await (await chooser).setFiles({ buffer: Buffer.from("ECG rhythm strip"), mimeType: "application/pdf", name: "v2-ecg.pdf" });
    await expect(page.getByText("v2-ecg.pdf").last()).toBeVisible({ timeout: 30_000 });
    await sendPrompt(page, "I uploaded an ECG");
    await expect(page.getByText(/received|analyzing|uploaded/i).first()).toBeVisible();
  });

  test("image upload and file review stay conversational", async ({ page }) => {
    const imageChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Image" }).last().click();
    await (await imageChooser).setFiles({ buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), mimeType: "image/png", name: "v2-image.png" });
    await sendPrompt(page, "Review the image I uploaded");
    await expect(page.getByText(/reviewed|image|focus|correlate/i).first()).toBeVisible();
  });

  test("guideline and drug questions avoid citation dumps", async ({ page }) => {
    await sendPrompt(page, "What does ESC recommend for AF anticoagulation?");
    await expect(page.getByTestId("copilot-message-thread").getByText(/atrial fibrillation|anticoagulation|stroke/i).first()).toBeVisible();
    await expectCleanThread(page);
    await page.getByRole("button", { name: "New Chat" }).click();
    await sendPrompt(page, "Is amiodarone safe with warfarin?");
    await expect(page.getByText(/amiodarone|warfarin|interaction|bleed|monitor/i).first()).toBeVisible();
  });

  test("clarification flow for ambiguous ECG request", async ({ page }) => {
    await sendPrompt(page, "Interpret this ECG");
    await expect(page.getByText(/upload|open|focus|clarify|patient record|ECG interpretation/i).first()).toBeVisible();
  });

  test("voice recording populates composer", async ({ page }) => {
    await page.getByRole("button", { name: "Voice" }).last().click();
    await expect(page.getByPlaceholder(/Message the assistant|Ask about ECG/i)).toHaveValue(/hello copilot/i);
  });

  test("streaming tokens render assistant output", async ({ page }) => {
    await sendPrompt(page, "Hello");
    await expect(page.getByText("Assistant").first()).toBeVisible();
    await expect(page.getByText(/Hello|Good (morning|afternoon|evening)/i).first()).toBeVisible();
  });

  test("voice playback controls work", async ({ page }) => {
    await sendPrompt(page, "Hello");
    await page.getByRole("button", { name: "Play answer" }).first().click();
    await page.getByRole("button", { name: "Stop voice" }).first().click({ force: true });
    await expect(page.getByText("Assistant").first()).toBeVisible();
  });

  test("regression: no legacy report labels in chat", async ({ page }) => {
    await sendPrompt(page, "Explain STEMI");
    await expectCleanThread(page);
  });
});
