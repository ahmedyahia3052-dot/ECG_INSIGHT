import { safeArray } from "@/utils/collections";

import { API_URL, apiRequest } from "./api";

export type CopilotTag = "Clinical Summary" | "Differential Diagnosis" | "ECG Interpretation" | "Follow-up" | "Occupational Fitness";

export interface CopilotConversation {
  caseId?: string;
  contextType?: string;
  createdAt: string;
  id: string;
  lastMessagePreview?: string;
  patientId?: string;
  tag: CopilotTag;
  title: string;
  updatedAt: string;
}

export interface CopilotCitation {
  id: string;
  label: string;
  source: string;
  tags?: string[];
  type: string;
}

export type CopilotClinicalLinkage = {
  caseId: string;
  caseNumber?: string | null;
  createdPatient?: boolean;
  patientId: string;
  visitId: string;
};

export interface CopilotAttachment {
  analysisSummary?: string;
  caseId?: string;
  clinicalLinkage?: CopilotClinicalLinkage;
  confidence?: number;
  conversationId?: string;
  createdAt: string;
  documentType?: string;
  downloadUrl: string;
  extractedText?: string;
  id: string;
  kind: "camera" | "ecg" | "echo" | "file" | "image" | "labs";
  medicalAnalysis?: {
    documentType?: string;
    findings?: string[];
    hasReadableText?: boolean;
    mimeType?: string;
    originalName?: string;
    sizeBytes?: number;
  };
  messageId?: string;
  mimeType: string;
  originalName: string;
  patientId?: string;
  pipelineStages?: Array<{ durationMs?: number; message?: string; stage: string; status: string }>;
  recommendations?: string[];
  sizeBytes: number;
  storedName: string;
  warnings?: string[];
}

export interface CopilotMessage {
  attachments?: CopilotAttachment[];
  citations: CopilotCitation[];
  confidence?: number;
  content: string;
  createdAt: string;
  id: string;
  responseTimeMs?: number;
  role: "assistant" | "user";
}

export type CopilotChatInput = {
  attachmentIds?: string[];
  caseId?: string;
  contextPath?: string;
  contextType: "case" | "global" | "patient";
  conversationId?: string;
  patientId?: string;
  question: string;
  tag: CopilotTag;
  voiceMode?: boolean;
};
export type CopilotStreamEvent = {
  brainDebug?: CopilotBrainDebug;
  communicationDebug?: CopilotCommunicationDebug;
  engineDebug?: CopilotEngineDebug;
  conversation?: CopilotConversation;
  intentDebug?: CopilotIntentDebug;
  message?: CopilotMessage;
  status?: string;
  token?: string;
  type: "brain_debug" | "communication_debug" | "conversation" | "done" | "engine_debug" | "error" | "intent_debug" | "status" | "token";
  userMessage?: CopilotMessage;
};

export interface CopilotEngineDebug {
  classification: CopilotIntentDebug["classification"];
  communicationIntent: string;
  context: {
    activeTopic: { label: string; slug: string } | null;
    resolvedQuestion: string;
    topicStack: Array<{ label: string; slug: string }>;
  };
  engineVersion: "v2";
  executionTimeMs: number;
  knowledgeRoute: { query: string; sources: string[] };
  plan: {
    allowBullets: boolean;
    maxParagraphs: number;
    style: string;
    suggestFollowUps: boolean;
  };
  toolPlan: {
    runClinicalContext: boolean;
    runDrugDatabase: boolean;
    runEcgEngine: boolean;
    runKnowledge: boolean;
    runOcr: boolean;
    runPatientDatabase: boolean;
    runReportGenerator: boolean;
    tools: string[];
  };
}

export interface CopilotCommunicationDebug {
  brain: CopilotBrainDebug;
  communicationVersion: "v1";
  intent: string;
  intentConfidence: number;
  knowledgeSources: string[];
  memoryTopic: string | null;
  resolvedQuestion: string;
  responsePlan: {
    allowBullets: boolean;
    maxParagraphs: number;
    style: string;
    suggestFollowUps: boolean;
  };
  sessionTurnCount: number;
}

export interface CopilotBrainDebug {
  brainVersion: "v3";
  classification: CopilotIntentDebug["classification"];
  clinicalPlan: {
    description: string;
    steps: Array<{ action: string; description: string; order: number; tool: string }>;
  };
  decision: {
    conversationalOnly: boolean;
    decisionPath: string[];
    emergencyEscalation: boolean;
    isClinical: boolean;
    isConversational: boolean;
    isEcgAnalysis: boolean;
    selectedTools: string[];
    shouldRunTools: boolean;
  };
  executionTimeMs: number;
  memoryState: {
    currentDiscussionTopic: string;
    currentPatientAge?: number;
    currentPatientGender?: string;
    currentPatientName?: string;
    followUpTopics: string[];
    hasActiveCase: boolean;
    hasActivePatient: boolean;
    hasUploadedEcg: boolean;
    hasUploadedFiles: boolean;
    turnCount: number;
  };
  plan: CopilotIntentDebug["plan"];
}

export interface CopilotIntentDebug {
  classification: {
    confidence: number;
    emergencyPriority: string;
    entities: Record<string, string[] | number[]>;
    executionTimeMs: number;
    intents: Array<{ confidence: number; intent: string; reason: string }>;
    primaryIntent: string;
    primaryMedicalIntent: string;
    requiresClarification: boolean;
  };
  plan: {
    steps: Array<{ intent: string; medicalIntent: string; note: string; tools: string[] }>;
    tools: string[];
  };
}

export interface CopilotSettings {
  enabled: boolean;
  provider: string;
}

function normalizeCopilotMessage(message: CopilotMessage): CopilotMessage {
  return {
    ...message,
    attachments: safeArray(message.attachments),
    citations: safeArray(message.citations),
  };
}

export async function listCopilotConversations(accessToken: string, q = "") {
  const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
  const payload = await apiRequest<{ conversations?: CopilotConversation[] }>(`/copilot/conversations${suffix}`, { accessToken });
  return { conversations: safeArray(payload.conversations) };
}

export async function getCopilotConversation(accessToken: string, conversationId: string) {
  const payload = await apiRequest<{ conversation: CopilotConversation; messages?: CopilotMessage[] }>(`/copilot/conversations/${conversationId}`, { accessToken });
  return {
    conversation: payload.conversation,
    messages: safeArray(payload.messages).map(normalizeCopilotMessage),
  };
}

export async function deleteCopilotMessage(accessToken: string, conversationId: string, messageId: string) {
  return apiRequest<void>(`/copilot/conversations/${conversationId}/messages/${messageId}`, { accessToken, method: "DELETE" });
}

export async function sendCopilotMessage(accessToken: string, input: CopilotChatInput) {
  return apiRequest<{ conversation: CopilotConversation; message: CopilotMessage; streaming: boolean; userMessage: CopilotMessage }>("/copilot/chat", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function uploadCopilotAttachment(accessToken: string, formData: FormData, signal?: AbortSignal) {
  return apiRequest<{ attachment: CopilotAttachment; clinicalLinkage?: CopilotClinicalLinkage; processingStatus?: "processing" | "completed" | "failed" }>("/copilot/attachments", {
    accessToken,
    body: formData,
    headers: {},
    method: "POST",
    signal,
  });
}

export type CopilotAttachmentProcessingStatus = {
  attachment?: CopilotAttachment;
  attachmentId: string;
  clinicalLinkage?: CopilotClinicalLinkage;
  job?: {
    error?: { code?: string; message?: string; recovery?: string };
    progress?: number;
    stage?: string;
    status?: string;
  };
  processingStatus: "processing" | "completed" | "failed" | "cancelled";
};

export async function getCopilotAttachmentProcessing(accessToken: string, attachmentId: string) {
  return apiRequest<CopilotAttachmentProcessingStatus>(`/copilot/attachments/${attachmentId}/processing`, {
    accessToken,
    method: "GET",
  });
}

export async function transcribeVoiceAudio(accessToken: string, audio: Blob, mimeType: string) {
  const formData = new FormData();
  formData.append("audio", audio, mimeType.includes("webm") ? "recording.webm" : "recording.wav");
  return apiRequest<{ partial: boolean; text: string }>("/copilot/voice/transcribe", {
    accessToken,
    body: formData,
    headers: {},
    method: "POST",
  });
}

export async function downloadCopilotExport(accessToken: string, conversationId: string, format: "pdf" | "txt") {
  const response = await fetch(format === "pdf" ? copilotExportUrl(conversationId) : copilotExportTxtUrl(conversationId), {
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });
  if (!response.ok) throw new Error(`Copilot export failed with status ${response.status}`);
  return response.blob();
}

export async function streamCopilotMessage(
  accessToken: string,
  input: CopilotChatInput,
  onEvent: (event: CopilotStreamEvent) => void,
  signal?: AbortSignal,
) {
  const csrfToken = csrfTokenFromCookie();
  const maxAttempts = 4;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      await consumeCopilotStream(accessToken, input, onEvent, signal, csrfToken);
      return;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = /failed with status (429|5\d\d)|network|fetch/i.test(lastError.message);
      if (!retryable || attempt >= maxAttempts - 1) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Copilot stream failed.");
}

async function consumeCopilotStream(
  accessToken: string,
  input: CopilotChatInput,
  onEvent: (event: CopilotStreamEvent) => void,
  signal: AbortSignal | undefined,
  csrfToken: string | null,
) {
  const response = await fetch(`${API_URL}/copilot/chat/stream`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    method: "POST",
    signal,
  });
  if (!response.ok || !response.body) throw new Error(`Copilot stream failed with status ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const eventBlock of events) {
      const event = parseSseEvent(eventBlock);
      if (event) onEvent(event);
    }
  }
}

export async function getCopilotSettings(accessToken: string) {
  return apiRequest<{ settings: CopilotSettings }>("/copilot/settings", { accessToken });
}

export async function updateCopilotSettings(accessToken: string, input: CopilotSettings) {
  return apiRequest<{ settings: CopilotSettings }>("/copilot/settings", {
    accessToken,
    body: JSON.stringify(input),
    method: "PUT",
  });
}

export async function getCopilotAnalytics(accessToken: string) {
  return apiRequest<{ analytics: { activeUsers: number; averageResponseTimeMs: number; mostCommonQuestions: Array<{ count: number; question: string }>; topDiagnosesRequested: Array<{ count: number; diagnosis: string }>; totalConversations: number } }>("/copilot/analytics", { accessToken });
}

export function copilotExportUrl(conversationId: string) {
  return `${API_URL}/copilot/conversations/${conversationId}/export`;
}

export function copilotExportTxtUrl(conversationId: string) {
  return `${API_URL}/copilot/conversations/${conversationId}/export.txt`;
}

function csrfTokenFromCookie() {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("ecg_csrf_token="));
  return cookie ? decodeURIComponent(cookie.slice("ecg_csrf_token=".length)) : null;
}

function parseSseEvent(block: string): CopilotStreamEvent | null {
  const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
  const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) return null;
  const type = eventLine.replace("event:", "").trim() as CopilotStreamEvent["type"];
  const data = JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, unknown>;
  if (type === "status" || type === "error") return { status: typeof data.message === "string" ? data.message : undefined, type };
  if (type === "engine_debug" && data.engineVersion === "v2") {
    return { engineDebug: data as unknown as CopilotEngineDebug, type };
  }
  if (type === "communication_debug" && data.communicationVersion === "v1") {
    return { communicationDebug: data as unknown as CopilotCommunicationDebug, type };
  }
  if (type === "brain_debug" && data.brainVersion === "v3") {
    return { brainDebug: data as unknown as CopilotBrainDebug, type };
  }
  if (type === "intent_debug" && data.classification && data.plan) {
    return { intentDebug: { classification: data.classification, plan: data.plan } as CopilotIntentDebug, type };
  }
  return {
    conversation: data.conversation as CopilotConversation | undefined,
    message: typeof data.message === "string" ? undefined : data.message as CopilotMessage | undefined,
    token: typeof data.token === "string" ? data.token : undefined,
    type,
    userMessage: data.userMessage as CopilotMessage | undefined,
  };
}
