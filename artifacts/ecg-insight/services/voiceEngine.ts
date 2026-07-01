type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type VoiceEngineCallbacks = {
  onError: (message: string) => void;
  onInterimTranscript: (text: string) => void;
  onPermissionDenied: () => void;
  onRecordingEnd: () => void;
  onRecordingStart: () => void;
  onSilence: () => void;
  onSpeakingEnd: () => void;
  onSpeakingStart: (messageId: string) => void;
};

export type VoiceEngineState = {
  muted: boolean;
  paused: boolean;
  permissionGranted: boolean;
  recording: boolean;
  speakingMessageId?: string;
  voiceMode: boolean;
};

const SILENCE_MS = 1800;

export class ClinicalVoiceEngine {
  private callbacks: VoiceEngineCallbacks;
  private recognition: SpeechRecognitionLike | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private state: VoiceEngineState = {
    muted: false,
    paused: false,
    permissionGranted: false,
    recording: false,
    voiceMode: false,
  };

  constructor(callbacks: VoiceEngineCallbacks) {
    this.callbacks = callbacks;
  }

  getState() {
    return this.state;
  }

  setVoiceMode(active: boolean) {
    this.state.voiceMode = active;
  }

  setMuted(muted: boolean) {
    this.state.muted = muted;
    if (muted) this.stopSpeaking();
  }

  async requestPermission() {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        this.state.permissionGranted = true;
        return true;
      } catch {
        this.state.permissionGranted = false;
        this.callbacks.onPermissionDenied();
        return false;
      }
    }
    this.state.permissionGranted = true;
    return true;
  }

  startRecording() {
    if (typeof window === "undefined") {
      this.callbacks.onError("Voice input is not supported by this browser.");
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      this.callbacks.onError("Voice input is not supported by this browser.");
      return;
    }

    const startRecognition = () => {
      try {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          this.resetSilenceTimer();
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(" ")
            .trim();
          if (transcript) this.callbacks.onInterimTranscript(transcript);
        };
        recognition.onerror = (event) => {
          this.stopRecording();
          this.callbacks.onError(event.error === "not-allowed" ? "Microphone permission denied." : "Voice input failed.");
        };
        recognition.onend = () => {
          this.state.recording = false;
          this.callbacks.onRecordingEnd();
        };
        this.recognition = recognition;
        recognition.start();
        this.state.recording = true;
        this.state.permissionGranted = true;
        this.callbacks.onRecordingStart();
        this.resetSilenceTimer();
      } catch {
        this.callbacks.onError("Microphone permission denied.");
      }
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      void navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          this.state.permissionGranted = true;
          startRecognition();
        })
        .catch(() => startRecognition());
      return;
    }

    startRecognition();
  }

  stopRecording() {
    this.clearSilenceTimer();
    this.recognition?.stop();
    this.recognition = null;
    this.state.recording = false;
  }

  interrupt() {
    this.stopSpeaking();
    this.stopRecording();
  }

  speak(content: string, messageId: string) {
    const text = content.replace(/^#{1,3}\s+/gm, "").replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
    if (!text) {
      this.callbacks.onError("No answer text available for speech.");
      return;
    }
    if (this.state.muted) {
      this.callbacks.onError("Voice output is muted.");
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      this.callbacks.onError("Voice playback is not supported by this browser.");
      return;
    }
    this.stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => {
      this.state.speakingMessageId = messageId;
      this.state.paused = false;
      this.callbacks.onSpeakingStart(messageId);
    };
    utterance.onend = () => {
      this.state.speakingMessageId = undefined;
      this.state.paused = false;
      this.callbacks.onSpeakingEnd();
    };
    utterance.onerror = () => {
      this.state.speakingMessageId = undefined;
      this.state.paused = false;
      this.callbacks.onSpeakingEnd();
      this.callbacks.onError("Voice playback failed.");
    };
    window.speechSynthesis.speak(utterance);
  }

  pauseOrResumeSpeaking() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !this.state.speakingMessageId) return;
    if (this.state.paused) {
      window.speechSynthesis.resume();
      this.state.paused = false;
      return;
    }
    window.speechSynthesis.pause();
    this.state.paused = true;
  }

  stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.state.speakingMessageId = undefined;
    this.state.paused = false;
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.state.recording) {
        this.callbacks.onSilence();
        this.stopRecording();
      }
    }, SILENCE_MS);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
  }
}
