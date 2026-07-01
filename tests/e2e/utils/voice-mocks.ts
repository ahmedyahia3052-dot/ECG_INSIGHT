import type { Page } from "@playwright/test";

export async function installCopilotVoiceMocks(page: Page, transcripts: string[]) {
  await page.addInitScript(({ items }) => {
    let callIndex = 0;
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
        const transcript = items[Math.min(callIndex, items.length - 1)] ?? items[0];
        callIndex += 1;
        const words = transcript.split(" ");
        const partial = words.slice(0, Math.max(1, Math.floor(words.length / 2))).join(" ");
        window.setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ 0: { transcript: partial }, isFinal: false, length: 1 }],
          });
          window.setTimeout(() => {
            this.onresult?.({
              resultIndex: 0,
              results: [{ 0: { transcript }, isFinal: true, length: 1 }],
            });
            window.setTimeout(() => this.onend?.(), 80);
          }, 30);
        }, 40);
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    class MockMediaRecorder {
      static isTypeSupported() {
        return true;
      }
      state = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {
        void _stream;
        void _options;
      }
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["mock-audio"], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }
    Object.assign(window, {
      MediaRecorder: MockMediaRecorder,
      SpeechRecognition: MockSpeechRecognition,
      webkitSpeechRecognition: MockSpeechRecognition,
    });
    navigator.mediaDevices.getUserMedia = async () => ({
      getTracks: () => [{ stop: () => undefined }],
    } as MediaStream);
    window.speechSynthesis = {
      cancel: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      speak: (utterance: SpeechSynthesisUtterance) => {
        window.setTimeout(() => {
          utterance.onstart?.({} as SpeechSynthesisEvent);
          window.setTimeout(() => utterance.onend?.({} as SpeechSynthesisEvent), 10);
        }, 0);
      },
    } as SpeechSynthesis;
  }, { items: transcripts });
}
