import { detectTextLanguage, resolveSpeechLanguage, type VoiceLanguageMode } from "./voiceLanguage";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }>;
  }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type VoiceStatus =
  | "idle"
  | "permission"
  | "listening"
  | "recording"
  | "uploading"
  | "processing"
  | "thinking"
  | "speaking"
  | "streaming"
  | "completed"
  | "cancelled"
  | "error"
  | "timeout";

export type VoiceEngineCallbacks = {
  onAudioLevel?: (levels: number[]) => void;
  onError: (message: string) => void;
  onFinalTranscript: (text: string) => void;
  onNetworkChange?: (online: boolean) => void;
  onPartialTranscript: (text: string) => void;
  onPermissionDenied: () => void;
  onRecordingEnd: () => void;
  onRecordingStart: () => void;
  onSilence: () => void;
  onSpeakingEnd: () => void;
  onSpeakingStart: (messageId: string) => void;
  onStatusChange: (status: VoiceStatus) => void;
};

export type VoiceEngineState = {
  muted: boolean;
  online: boolean;
  paused: boolean;
  permissionGranted: boolean;
  recording: boolean;
  speakingMessageId?: string;
  status: VoiceStatus;
  voiceMode: boolean;
};

export type WhisperTranscriber = (audio: Blob, mimeType: string) => Promise<string>;

const SILENCE_MS = 2400;
const SPEECH_TIMEOUT_MS = 30_000;
const MIN_RECORDING_MS = 900;

function punctuate(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (/[.!?]$/.test(capitalized)) return capitalized;
  if (/\?$/.test(cleaned)) return capitalized;
  if (/^(how|what|why|when|where|who|can|could|should|is|are|do|does|did|will|would)\b/i.test(cleaned)) return `${capitalized}?`;
  return `${capitalized}.`;
}

function splitSpeechChunks(text: string) {
  return text
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((chunk) => chunk.trim())
    .filter(Boolean) ?? [];
}

export class ClinicalVoiceEngine {
  private callbacks: VoiceEngineCallbacks;
  private recognition: SpeechRecognitionLike | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private capturedAudioBytes = 0;
  private levelMonitorTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;
  private recordingMimeType = "audio/webm";
  private finalTranscript = "";
  private latestPartial = "";
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private speechTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private whisperTranscriber?: WhisperTranscriber;
  private finishingRecording = false;
  private utteranceFinalized = false;
  private ttsQueue: string[] = [];
  private lastFedSpeech = "";
  private activeSpeechMessageId = "assistant-message";
  private visibilityHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  private deviceChangeHandler: (() => void) | null = null;
  private recordingStartedAt = 0;
  private languageMode: VoiceLanguageMode = "auto";
  private preferredLang: "en-US" | "ar-SA" = "en-US";
  private state: VoiceEngineState = {
    muted: false,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    paused: false,
    permissionGranted: false,
    recording: false,
    status: "idle",
    voiceMode: false,
  };

  setLanguage(mode: VoiceLanguageMode) {
    this.languageMode = mode;
    this.preferredLang = resolveSpeechLanguage(mode);
    if (this.recognition) this.recognition.lang = this.preferredLang;
  }

  private syncLanguageFromTranscript(text: string) {
    if (this.languageMode !== "auto" || !text.trim()) return;
    const detected = detectTextLanguage(text);
    if (detected === this.preferredLang) return;
    this.preferredLang = detected;
    if (this.recognition) this.recognition.lang = detected;
  }

  constructor(callbacks: VoiceEngineCallbacks, whisperTranscriber?: WhisperTranscriber) {
    this.callbacks = callbacks;
    this.whisperTranscriber = whisperTranscriber;
    this.bindEnvironmentListeners();
  }

  dispose() {
    this.interrupt();
    this.unbindEnvironmentListeners();
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

  setStatus(status: VoiceStatus) {
    if (this.state.status === status) return;
    this.state.status = status;
    this.callbacks.onStatusChange(status);
    void import("./runtimeEvents").then(({ emitRuntimeEvent, voiceStatusToRuntimeEvent }) => {
      const event = voiceStatusToRuntimeEvent(status);
      if (event) emitRuntimeEvent(event, { status });
    });
  }

  resetAfterStream(willSpeak: boolean) {
    if (willSpeak || this.state.status === "speaking") return;
    if (this.state.status === "thinking" || this.state.status === "streaming") {
      this.setStatus("idle");
    }
  }

  returnToIdle() {
    if (this.state.status === "speaking") return;
    this.setStatus("idle");
  }

  private reportVoiceError(message: string) {
    this.setStatus("error");
    this.callbacks.onError(message);
  }

  async requestPermission() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      this.state.permissionGranted = false;
      this.reportVoiceError("Microphone is not available in this environment.");
      return false;
    }
    try {
      this.setStatus("permission");
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

  async startRecording() {
    if (typeof window === "undefined") {
      this.reportVoiceError("Voice input is not supported by this browser.");
      return;
    }
    if (!this.state.online) {
      this.reportVoiceError("Voice input requires an internet connection.");
      return;
    }
    if (this.state.status === "speaking") {
      this.stopSpeaking();
    }
    if (this.state.recording) return;

    this.finalTranscript = "";
    this.latestPartial = "";
    this.audioChunks = [];
    this.capturedAudioBytes = 0;
    this.finishingRecording = false;
    this.utteranceFinalized = false;
    this.recordingStartedAt = Date.now();
    this.setStatus("listening");

    const granted = await this.requestPermission();
    if (!granted) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.startMediaRecorder(this.mediaStream);
    } catch {
      this.callbacks.onPermissionDenied();
      this.setStatus("idle");
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (Recognition) {
      try {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = this.preferredLang;
        recognition.onresult = (event) => this.handleSpeechResult(event);
        recognition.onerror = (event) => {
          if (event.error === "not-allowed") {
            this.callbacks.onPermissionDenied();
          } else if (event.error === "no-speech") {
            // Wait for MediaRecorder fallback instead of surfacing immediately.
          } else if (event.error !== "aborted") {
            this.callbacks.onError("Live speech recognition interrupted. Falling back to server transcription.");
          }
        };
        recognition.onend = () => {
          if (this.state.recording && !this.finishingRecording) {
            void this.finishRecording("recognition-ended");
          }
        };
        this.recognition = recognition;
        recognition.start();
      } catch {
        this.callbacks.onError("Browser speech recognition unavailable. Using server transcription.");
      }
    }

    this.state.recording = true;
    this.setStatus("recording");
    this.callbacks.onRecordingStart();
    this.resetSilenceTimer();
    this.resetSpeechTimeout();
  }

  stopRecording() {
    if (!this.state.recording && !this.recognition && !this.mediaRecorder) return;
    this.clearSilenceTimer();
    this.clearSpeechTimeout();
    this.state.recording = false;
    this.recognition?.stop();
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    } else {
      void this.finishRecording("manual-stop");
    }
  }

  cancelRecording() {
    this.finishingRecording = true;
    this.clearSilenceTimer();
    this.clearSpeechTimeout();
    this.state.recording = false;
    this.finalTranscript = "";
    this.callbacks.onPartialTranscript("");
    this.recognition?.abort();
    this.recognition = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.releaseMediaStream();
    this.setStatus("cancelled");
    this.callbacks.onRecordingEnd();
    this.finishingRecording = false;
  }

  restartRecording() {
    this.cancelRecording();
    void this.startRecording();
  }

  interrupt() {
    this.stopSpeaking();
    this.cancelRecording();
  }

  markThinking() {
    this.setStatus("thinking");
  }

  markStreaming() {
    this.setStatus("streaming");
  }

  feedSpeech(content: string, messageId: string) {
    const sanitized = content.replace(/^#{1,3}\s+/gm, "").replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
    if (!sanitized || this.state.muted) return;
    if (sanitized.length <= this.lastFedSpeech.length) return;
    const delta = sanitized.slice(this.lastFedSpeech.length);
    this.lastFedSpeech = sanitized;
    const newChunks = splitSpeechChunks(delta);
    if (!newChunks.length) return;
    this.ttsQueue.push(...newChunks);
    if (this.state.status !== "speaking") {
      this.beginSpeech(messageId);
    }
  }

  speak(content: string, messageId: string) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.ttsQueue = splitSpeechChunks(content);
    this.lastFedSpeech = content.replace(/^#{1,3}\s+/gm, "").replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
    this.state.speakingMessageId = undefined;
    this.state.paused = false;
    this.beginSpeech(messageId);
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
    this.ttsQueue = [];
    this.lastFedSpeech = "";
    this.state.speakingMessageId = undefined;
    this.state.paused = false;
    if (this.state.status === "speaking") {
      this.setStatus(this.state.voiceMode ? "idle" : "idle");
    }
  }

  private beginSpeech(messageId: string) {
    if (!this.ttsQueue.length) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      this.reportVoiceError("Voice playback is not supported by this browser.");
      return;
    }
    this.activeSpeechMessageId = messageId;
    this.state.speakingMessageId = messageId;
    this.state.paused = false;
    this.setStatus("speaking");
    this.callbacks.onSpeakingStart(messageId);
    this.pumpSpeechQueue();
  }

  private pumpSpeechQueue() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || this.state.muted) {
      this.finishSpeech();
      return;
    }
    const chunk = this.ttsQueue.shift();
    if (!chunk) {
      this.finishSpeech();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = this.preferredLang;
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => this.pumpSpeechQueue();
    utterance.onerror = () => {
      this.ttsQueue = [];
      this.state.speakingMessageId = undefined;
      this.reportVoiceError("Voice playback failed.");
    };
    window.speechSynthesis.speak(utterance);
  }

  private finishSpeech() {
    this.state.speakingMessageId = undefined;
    this.state.paused = false;
    this.setStatus("completed");
    this.callbacks.onSpeakingEnd();
    const resetIdle = () => {
      if (this.state.status === "completed") this.setStatus("idle");
    };
    if (typeof window !== "undefined") window.setTimeout(resetIdle, 400);
    else resetIdle();
  }

  private handleSpeechResult(event: {
    resultIndex: number;
    results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }>;
  }) {
    this.resetSilenceTimer();
    this.resetSpeechTimeout();
    let interim = "";
    let final = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript ?? "";
      if (result.isFinal) final += transcript;
      else interim += transcript;
    }
    if (final) {
      this.finalTranscript = punctuate(`${this.finalTranscript} ${final}`.trim());
      this.latestPartial = this.finalTranscript;
      this.syncLanguageFromTranscript(this.finalTranscript);
      this.callbacks.onPartialTranscript(this.finalTranscript);
    } else if (interim) {
      this.latestPartial = punctuate(`${this.finalTranscript} ${interim}`.trim());
      this.syncLanguageFromTranscript(this.latestPartial);
      this.callbacks.onPartialTranscript(this.latestPartial);
    }
  }

  private async finishRecording(reason: string) {
    if (this.finishingRecording || this.utteranceFinalized) return;
    this.finishingRecording = true;
    this.state.recording = false;
    this.clearSilenceTimer();
    this.clearSpeechTimeout();
    this.recognition = null;
    this.releaseMediaStream();

    const liveTranscript = this.finalTranscript.trim() || this.latestPartial.trim();
    if (liveTranscript) {
      this.utteranceFinalized = true;
      this.callbacks.onFinalTranscript(liveTranscript);
      this.setStatus("idle");
      this.callbacks.onRecordingEnd();
      this.finishingRecording = false;
      return;
    }

    if (this.audioChunks.length && this.whisperTranscriber) {
      this.setStatus("uploading");
      try {
        const blob = new Blob(this.audioChunks, { type: this.recordingMimeType });
        this.setStatus("processing");
        const transcribed = punctuate((await this.whisperTranscriber(blob, this.recordingMimeType)).trim());
        if (transcribed) {
          this.utteranceFinalized = true;
          this.callbacks.onPartialTranscript(transcribed);
          this.callbacks.onFinalTranscript(transcribed);
          this.setStatus("idle");
          this.callbacks.onRecordingEnd();
          this.finishingRecording = false;
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Server transcription failed.";
        if (!message.includes("503") && !message.includes("unavailable")) {
          this.reportVoiceError(message);
        }
      }
    }

    const recordingDuration = Date.now() - this.recordingStartedAt;
    if (recordingDuration < MIN_RECORDING_MS && this.state.voiceMode) {
      this.setStatus("idle");
      this.callbacks.onRecordingEnd();
      this.finishingRecording = false;
      return;
    }

    if (reason === "speech-timeout") {
      this.setStatus("timeout");
      this.reportVoiceError("Speech timeout. Try speaking again.");
    } else if (!liveTranscript && !this.state.voiceMode && this.capturedAudioBytes > 0) {
      this.reportVoiceError("No speech detected in the recording. Try speaking closer to the microphone.");
    } else if (!liveTranscript && !this.state.voiceMode && this.capturedAudioBytes === 0) {
      this.reportVoiceError("Microphone did not capture audio. Check permissions and input device.");
    }
    this.setStatus("idle");
    this.callbacks.onRecordingEnd();
    this.finishingRecording = false;
  }

  private startMediaRecorder(stream: MediaStream) {
    const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    const mimeType = preferredTypes.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "audio/webm";
    this.recordingMimeType = mimeType;
    this.audioChunks = [];
    this.capturedAudioBytes = 0;
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.capturedAudioBytes += event.data.size;
      }
    };
    recorder.onstop = () => {
      this.stopLevelMonitor();
      void this.finishRecording("recorder-stop");
    };
    recorder.start(250);
    this.mediaRecorder = recorder;
    this.startLevelMonitor(stream);
  }

  private startLevelMonitor(stream: MediaStream) {
    if (typeof window === "undefined" || !this.callbacks.onAudioLevel) return;
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      this.levelMonitorTimer = setInterval(() => {
        analyser.getByteFrequencyData(buffer);
        const levels = Array.from(buffer.slice(0, 16)).map((value) => value / 255);
        this.callbacks.onAudioLevel?.(levels);
      }, 80);
    } catch {
      // Waveform is optional; recording must continue without it.
    }
  }

  private stopLevelMonitor() {
    if (this.levelMonitorTimer) clearInterval(this.levelMonitorTimer);
    this.levelMonitorTimer = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.callbacks.onAudioLevel?.([]);
  }

  private releaseMediaStream() {
    this.stopLevelMonitor();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (!this.state.recording) return;
      this.callbacks.onSilence();
      this.stopRecording();
    }, SILENCE_MS);
  }

  private resetSpeechTimeout() {
    this.clearSpeechTimeout();
    this.speechTimeoutTimer = setTimeout(() => {
      if (!this.state.recording) return;
      void this.finishRecording("speech-timeout");
    }, SPEECH_TIMEOUT_MS);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
  }

  private clearSpeechTimeout() {
    if (this.speechTimeoutTimer) clearTimeout(this.speechTimeoutTimer);
    this.speechTimeoutTimer = null;
  }

  private bindEnvironmentListeners() {
    if (typeof window === "undefined") return;
    this.onlineHandler = () => {
      this.state.online = true;
      this.callbacks.onNetworkChange?.(true);
    };
    this.offlineHandler = () => {
      this.state.online = false;
      this.callbacks.onNetworkChange?.(false);
      if (this.state.recording) this.cancelRecording();
      this.reportVoiceError("Network connection lost.");
    };
    this.visibilityHandler = () => {
      if (document.visibilityState === "hidden" && this.state.recording) {
        this.stopRecording();
      }
    };
    this.deviceChangeHandler = () => {
      if (this.state.recording) {
        this.restartRecording();
      }
    };
    window.addEventListener("online", this.onlineHandler);
    window.addEventListener("offline", this.offlineHandler);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    navigator.mediaDevices?.addEventListener?.("devicechange", this.deviceChangeHandler);
  }

  private unbindEnvironmentListeners() {
    if (typeof window === "undefined") return;
    if (this.onlineHandler) window.removeEventListener("online", this.onlineHandler);
    if (this.offlineHandler) window.removeEventListener("offline", this.offlineHandler);
    if (this.visibilityHandler) document.removeEventListener("visibilitychange", this.visibilityHandler);
    if (this.deviceChangeHandler) navigator.mediaDevices?.removeEventListener?.("devicechange", this.deviceChangeHandler);
  }
}
