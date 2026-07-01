import { env } from "../../config/env";
import { AppError } from "../../middleware/error";

export async function transcribeWithWhisper(audio: Buffer, mimeType: string): Promise<string> {
  const apiKey = env.AI_MODEL_API_KEY;
  if (!apiKey) {
    throw new AppError(503, "Whisper transcription is not configured.", "VOICE_TRANSCRIPTION_UNAVAILABLE");
  }

  const extension = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "wav";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), `recording.${extension}`);
  form.append("model", "whisper-1");
  form.append("language", "en");
  form.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    body: form,
    headers: { Authorization: `Bearer ${apiKey}` },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AppError(502, `Whisper transcription failed: ${detail.slice(0, 180)}`, "VOICE_TRANSCRIPTION_FAILED");
  }

  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() ?? "";
}
