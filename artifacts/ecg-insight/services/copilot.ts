import { API_URL, apiRequest } from "./api";

export type CopilotTag = "Clinical Summary" | "Differential Diagnosis" | "ECG Interpretation" | "Follow-up" | "Occupational Fitness";

export interface CopilotConversation {
  archivedAt?: string;
  caseId?: string;
  contextType?: string;
  createdAt: string;
  deletedAt?: string;
  favorite: boolean;
  id: string;
  isFavorite: boolean;
  isPinned: boolean;
  lastOpenedAt?: string;
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
  caseId?: string;
  conversationId?: string;
  createdAt: string;
  downloadUrl: string;
  id: string;
  kind: "ecg" | "echo" | "file" | "labs";
  messageId?: string;
  mimeType: string;
  originalName: string;
  patientId?: string;
  sizeBytes: number;
  storedName: string;
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
export type CopilotStreamEvent = { conversation?: CopilotConversation; message?: CopilotMessage; status?: string; token?: string; type: "conversation" | "done" | "error" | "status" | "token"; userMessage?: CopilotMessage };

export interface CopilotSettings {
  enabled: boolean;
  provider: string;
}

export async function listCopilotConversations(accessToken: string, q = "") {
  const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiRequest<{ conversations: CopilotConversation[] }>(`/copilot/conversations${suffix}`, { accessToken });
}

export async function getCopilotConversation(accessToken: string, conversationId: string) {
  return apiRequest<{ conversation: CopilotConversation; messages: CopilotMessage[] }>(`/copilot/conversations/${conversationId}`, { accessToken });
}

export async function createCopilotConversation(accessToken: string, input: Partial<CopilotConversation>) {
  return apiRequest<{ conversation: CopilotConversation }>("/copilot/conversations", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateCopilotConversation(accessToken: string, conversationId: string, input: Partial<CopilotConversation>) {
  return apiRequest<{ conversation: CopilotConversation }>(`/copilot/conversations/${conversationId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function renameCopilotConversation(accessToken: string, conversationId: string, title: string) {
  return renameConversation(accessToken, conversationId, title);
}

export async function renameConversation(accessToken: string, conversationId: string, title: string) {
  return apiRequest<{ conversation: CopilotConversation }>(`/copilot/conversations/${conversationId}/rename`, {
    accessToken,
    body: JSON.stringify({ title }),
    method: "PATCH",
  });
}

export async function pinCopilotConversation(accessToken: string, conversationId: string, isPinned: boolean) {
  return togglePin(accessToken, conversationId, isPinned);
}

export async function togglePin(accessToken: string, conversationId: string, _isPinned?: boolean) {
  return apiRequest<{ conversation: CopilotConversation }>(`/copilot/conversations/${conversationId}/pin`, {
    accessToken,
    method: "POST",
  });
}

export async function favoriteCopilotConversation(accessToken: string, conversationId: string, isFavorite: boolean) {
  return toggleFavorite(accessToken, conversationId, isFavorite);
}

export async function toggleFavorite(accessToken: string, conversationId: string, _isFavorite?: boolean) {
  return apiRequest<{ conversation: CopilotConversation }>(`/copilot/conversations/${conversationId}/favorite`, {
    accessToken,
    method: "POST",
  });
}

export async function deleteCopilotConversation(accessToken: string, conversationId: string) {
  return deleteConversation(accessToken, conversationId);
}

export async function deleteConversation(accessToken: string, conversationId: string) {
  return apiRequest<void>(`/copilot/conversations/${conversationId}`, { accessToken, method: "DELETE" });
}

export async function deleteCopilotMessage(accessToken: string, conversationId: string, messageId: string) {
  return apiRequest<void>(`/copilot/conversations/${conversationId}/messages/${messageId}`, { accessToken, method: "DELETE" });
}

export async function duplicateCopilotConversation(accessToken: string, conversationId: string) {
  return apiRequest<{ conversation: CopilotConversation }>(`/copilot/conversations/${conversationId}/duplicate`, { accessToken, method: "POST" });
}

export async function archiveCopilotConversation(accessToken: string, conversationId: string) {
  return toggleArchive(accessToken, conversationId);
}

export async function toggleArchive(accessToken: string, conversationId: string) {
  return apiRequest<{ conversation: CopilotConversation }>(`/copilot/conversations/${conversationId}/archive`, { accessToken, method: "POST" });
}

export async function restoreCopilotConversation(accessToken: string, conversationId: string) {
  return apiRequest<{ conversation: CopilotConversation }>(`/copilot/conversations/${conversationId}/restore`, { accessToken, method: "POST" });
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
  const type = eventLine.replace("event:", "").trim() as "conversation" | "done" | "error" | "status" | "token";
  const data = JSON.parse(dataLine.replace("data:", "").trim()) as { conversation?: CopilotConversation; message?: CopilotMessage | string; token?: string; userMessage?: CopilotMessage };
  if (type === "status" || type === "error") return { status: typeof data.message === "string" ? data.message : undefined, type };
  return { conversation: data.conversation, message: typeof data.message === "string" ? undefined : data.message, token: data.token, type, userMessage: data.userMessage };
}
