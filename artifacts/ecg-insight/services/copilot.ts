import { API_URL, apiRequest } from "./api";

export type CopilotTag = "Clinical Summary" | "Differential Diagnosis" | "ECG Interpretation" | "Follow-up" | "Occupational Fitness";

export interface CopilotConversation {
  caseId?: string;
  contextType?: string;
  createdAt: string;
  favorite: boolean;
  id: string;
  patientId?: string;
  tag: CopilotTag;
  title: string;
  updatedAt: string;
}

export interface CopilotCitation {
  id: string;
  label: string;
  source: string;
  type: string;
}

export interface CopilotMessage {
  citations: CopilotCitation[];
  confidence?: number;
  content: string;
  createdAt: string;
  id: string;
  responseTimeMs?: number;
  role: "assistant" | "user";
}

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

export async function deleteCopilotConversation(accessToken: string, conversationId: string) {
  return apiRequest<void>(`/copilot/conversations/${conversationId}`, { accessToken, method: "DELETE" });
}

export async function sendCopilotMessage(accessToken: string, input: {
  caseId?: string;
  contextPath?: string;
  contextType: "case" | "global" | "patient";
  conversationId?: string;
  patientId?: string;
  question: string;
  tag: CopilotTag;
}) {
  return apiRequest<{ conversation: CopilotConversation; message: CopilotMessage; streaming: boolean }>("/copilot/chat", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
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
  return apiRequest<{ analytics: { activeUsers: number; averageResponseTimeMs: number; mostCommonQuestions: Array<{ count: number; question: string }>; totalConversations: number } }>("/copilot/analytics", { accessToken });
}

export function copilotExportUrl(conversationId: string) {
  return `${API_URL}/copilot/conversations/${conversationId}/export`;
}
