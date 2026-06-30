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

export interface CopilotAttachment {
  analysisSummary?: string;
  caseId?: string;
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
};
export type CopilotStreamEvent = {
  conversation?: CopilotConversation;
  intentDebug?: CopilotIntentDebug;
  message?: CopilotMessage;
  status?: string;
  token?: string;
  type: "conversation" | "done" | "error" | "intent_debug" | "status" | "token";
  userMessage?: CopilotMessage;
};

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

export async function uploadCopilotAttachment(accessToken: string, formData: FormData) {
  return apiRequest<{ attachment: CopilotAttachment }>("/copilot/attachments", {
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

function parseSseEvent(block: string) {
  const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
  const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) return null;
  const type = eventLine.replace("event:", "").trim() as CopilotStreamEvent["type"];
  const data = JSON.parse(dataLine.replace("data:", "").trim()) as {
    classification?: CopilotIntentDebug["classification"];
    conversation?: CopilotConversation;
    message?: CopilotMessage | string;
    plan?: CopilotIntentDebug["plan"];
    token?: string;
    userMessage?: CopilotMessage;
  };
  if (type === "status" || type === "error") return { status: typeof data.message === "string" ? data.message : undefined, type };
  if (type === "intent_debug" && data.classification && data.plan) {
    return { intentDebug: { classification: data.classification, plan: data.plan }, type };
  }
  return { conversation: data.conversation, message: typeof data.message === "string" ? undefined : data.message, token: data.token, type, userMessage: data.userMessage };
}
