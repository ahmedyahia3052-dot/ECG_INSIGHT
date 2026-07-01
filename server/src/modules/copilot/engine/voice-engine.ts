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
};

export const VoiceEngine = {
  capabilities: {
    interruptSupported: true,
    resumeSupported: true,
    silenceDetectionReady: true,
    streamingLlmReady: true,
    streamingSttReady: true,
    streamingTtsReady: true,
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
    };
  },

  voiceIntentActive(question: string, voiceMode: boolean) {
    return voiceMode || /^voice mode|speak to me|talk to me/i.test(question.trim());
  },
};
