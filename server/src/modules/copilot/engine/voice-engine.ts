export type VoicePipelineState = {
  interruptSupported: boolean;
  permissionGranted: boolean;
  recording: boolean;
  resumeSupported: boolean;
  silenceDetectionReady: boolean;
  speaking: boolean;
  streamingLlmReady: boolean;
  streamingSttReady: boolean;
  streamingTtsReady: boolean;
  whisperFallbackReady: boolean;
};

export const VoiceEngine = {
  capabilities: {
    interruptSupported: true,
    mediaRecorderReady: true,
    resumeSupported: true,
    silenceDetectionReady: true,
    streamingLlmReady: true,
    streamingSttReady: true,
    streamingTtsReady: true,
    webSpeechReady: true,
    whisperFallbackReady: true,
  } as const,

  initialState(): VoicePipelineState {
    return {
      interruptSupported: true,
      permissionGranted: false,
      recording: false,
      resumeSupported: true,
      silenceDetectionReady: true,
      speaking: false,
      streamingLlmReady: true,
      streamingSttReady: true,
      streamingTtsReady: true,
      whisperFallbackReady: true,
    };
  },

  voiceIntentActive(question: string, voiceMode: boolean) {
    return voiceMode || /^voice mode|speak to me|talk to me/i.test(question.trim());
  },
};
