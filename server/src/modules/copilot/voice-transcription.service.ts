import { env } from "../../config/env";
import { AppError } from "../../middleware/error";

async function tryOllamaTranscribe(audio: Buffer, mimeType: string): Promise<string | null> {
  if (!env.OLLAMA_ENABLED) return null;

  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/transcribe`, {
      body: JSON.stringify({
        model: process.env.OLLAMA_WHISPER_MODEL ?? "whisper",
        options: { temperature: 0 },
        prompt: "",
        stream: false,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const generateResponse = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/generate`, {
        body: JSON.stringify({
          model: process.env.OLLAMA_WHISPER_MODEL ?? "whisper",
          prompt: `Transcribe this ${mimeType} clinical voice note to plain text only.`,
          stream: false,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(45_000),
      });
      if (!generateResponse.ok) return null;
      const payload = await generateResponse.json() as { response?: string };
      return payload.response?.trim() || null;
    }

    const payload = await response.json() as { text?: string };
    return payload.text?.trim() || null;
  } catch {
    return null;
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
