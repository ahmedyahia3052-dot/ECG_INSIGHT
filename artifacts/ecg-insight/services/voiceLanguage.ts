export type VoiceLanguageMode = "auto" | "en-US" | "ar-SA";

export function detectTextLanguage(text: string): "en-US" | "ar-SA" {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latinChars = (text.match(/[A-Za-z]/g) ?? []).length;
  if (arabicChars > latinChars) return "ar-SA";
  return "en-US";
}

export function resolveSpeechLanguage(mode: VoiceLanguageMode, transcript = ""): "en-US" | "ar-SA" {
  if (mode === "auto") {
    if (transcript.trim()) return detectTextLanguage(transcript);
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ar")) return "ar-SA";
    return "en-US";
  }
  return mode;
}

export function voiceLanguageLabel(mode: VoiceLanguageMode) {
  switch (mode) {
    case "ar-SA": return "Arabic";
    case "en-US": return "English";
    default: return "Auto";
  }
}
