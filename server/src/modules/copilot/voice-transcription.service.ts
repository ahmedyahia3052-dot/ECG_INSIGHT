import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error";

async function writeTempAudio(audio: Buffer, mimeType: string) {
  const ext = mimeType.includes("wav") ? ".wav" : mimeType.includes("mp4") ? ".mp4" : ".webm";
  const filePath = path.join(os.tmpdir(), `copilot-voice-${Date.now()}${ext}`);
  await fs.writeFile(filePath, audio);
  return filePath;
}

async function tryOllamaTranscribe(audio: Buffer, mimeType: string): Promise<string | null> {
  if (!env.OLLAMA_ENABLED) return null;

  const tempPath = await writeTempAudio(audio, mimeType);
  try {
    const fileBuffer = await fs.readFile(tempPath);
    const form = new FormData();
    form.append("file", new Blob([fileBuffer], { type: mimeType }), path.basename(tempPath));

    const response = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/transcribe`, {
      body: form,
      method: "POST",
      signal: AbortSignal.timeout(60_000),
    });

    if (response.ok) {
      const payload = await response.json() as { text?: string };
      return payload.text?.trim() || null;
    }

    const generateResponse = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/generate`, {
      body: JSON.stringify({
        model: process.env.OLLAMA_WHISPER_MODEL ?? "whisper",
        prompt: "Transcribe the attached clinical voice note to plain text only.",
        stream: false,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(45_000),
    });
    if (!generateResponse.ok) return null;
    const payload = await generateResponse.json() as { response?: string };
    return payload.response?.trim() || null;
  } catch {
    return null;
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}

export async function transcribeWithWhisper(audio: Buffer, mimeType: string): Promise<string> {
  if (!audio.length) {
    throw new AppError(400, "Empty audio recording.", "VOICE_TRANSCRIPTION_EMPTY");
  }

  const ollamaText = await tryOllamaTranscribe(audio, mimeType);
  if (ollamaText) return ollamaText;

  throw new AppError(
    503,
    "Voice transcription unavailable. Use browser speech recognition or configure Ollama with a Whisper model (OLLAMA_WHISPER_MODEL).",
    "VOICE_TRANSCRIPTION_UNAVAILABLE",
  );
}
