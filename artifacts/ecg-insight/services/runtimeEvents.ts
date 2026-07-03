export const RUNTIME_EVENT_CHANNEL = "ecg:runtime";

export type RuntimeEventName =
  | "StreamingStarted"
  | "StreamingFinished"
  | "VoiceListeningStarted"
  | "VoiceProcessingStarted"
  | "VoicePlaybackStarted"
  | "VoiceIdle"
  | "UploadStarted"
  | "UploadFinished"
  | "OCRFinished"
  | "ViewerReady";

export type RuntimeEventRecord = {
  detail?: Record<string, unknown>;
  name: RuntimeEventName;
  ts: number;
};

type RuntimeListener = {
  handler: (record: RuntimeEventRecord) => void;
  id: string;
  name: RuntimeEventName;
  owner: string;
};

declare global {
  interface Window {
    __ECG_RUNTIME_EVENT_LOG__?: RuntimeEventRecord[];
    __ECG_RUNTIME_LISTENERS__?: RuntimeListener[];
  }
}

const MAX_EVENT_LOG = 500;
const activeListeners = new Map<string, RuntimeListener>();

function syncListenerRegistry() {
  if (typeof window === "undefined") return;
  window.__ECG_RUNTIME_LISTENERS__ = [...activeListeners.values()];
}

export function emitRuntimeEvent(name: RuntimeEventName, detail?: Record<string, unknown>) {
  const record: RuntimeEventRecord = { detail, name, ts: Date.now() };
  if (typeof window !== "undefined") {
    const log = window.__ECG_RUNTIME_EVENT_LOG__ ?? [];
    log.push(record);
    if (log.length > MAX_EVENT_LOG) log.splice(0, log.length - MAX_EVENT_LOG);
    window.__ECG_RUNTIME_EVENT_LOG__ = log;
    window.dispatchEvent(new CustomEvent(RUNTIME_EVENT_CHANNEL, { detail: record }));
  }
  for (const listener of activeListeners.values()) {
    if (listener.name === name) listener.handler(record);
  }
}

export function subscribeRuntimeEvent(
  name: RuntimeEventName,
  handler: (record: RuntimeEventRecord) => void,
  owner = "anonymous",
) {
  const id = `${owner}:${name}:${Math.random().toString(36).slice(2, 9)}`;
  const listener: RuntimeListener = { handler, id, name, owner };
  activeListeners.set(id, listener);
  syncListenerRegistry();
  return () => {
    activeListeners.delete(id);
    syncListenerRegistry();
  };
}

export function getRuntimeEventLog() {
  if (typeof window === "undefined") return [] as RuntimeEventRecord[];
  return [...(window.__ECG_RUNTIME_EVENT_LOG__ ?? [])];
}

export function getActiveRuntimeListenerCounts() {
  const counts: Partial<Record<RuntimeEventName | "total", number>> = { total: activeListeners.size };
  for (const listener of activeListeners.values()) {
    counts[listener.name] = (counts[listener.name] ?? 0) + 1;
  }
  return counts;
}

export function voiceStatusToRuntimeEvent(status: string): RuntimeEventName | null {
  if (status === "listening" || status === "recording") return "VoiceListeningStarted";
  if (status === "processing" || status === "uploading" || status === "thinking" || status === "streaming" || status === "permission") {
    return "VoiceProcessingStarted";
  }
  if (status === "speaking") return "VoicePlaybackStarted";
  if (status === "idle" || status === "completed" || status === "cancelled" || status === "error" || status === "timeout") {
    return "VoiceIdle";
  }
  return null;
}
