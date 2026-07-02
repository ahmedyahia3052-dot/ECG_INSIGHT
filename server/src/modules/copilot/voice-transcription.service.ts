import { AppError } from "../../middleware/error";

export async function transcribeWithWhisper(_audio: Buffer, _mimeType: string): Promise<string> {
  throw new AppError(
    503,
    "Local voice transcription is not configured. Use text input or install a local Whisper model in Ollama.",
    "VOICE_TRANSCRIPTION_UNAVAILABLE",
  );
}
