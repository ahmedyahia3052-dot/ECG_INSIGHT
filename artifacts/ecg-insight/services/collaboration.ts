import { apiRequest } from "./api";

export async function listNotifications(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ notifications: unknown[] }>(`/notifications${suffix}`, { accessToken });
}

export async function markNotificationRead(accessToken: string, notificationId: string) {
  return apiRequest<{ notification: unknown }>(`/notifications/${notificationId}/read`, {
    accessToken,
    method: "POST",
  });
}

export async function deleteNotification(accessToken: string, notificationId: string) {
  return apiRequest<void>(`/notifications/${notificationId}`, { accessToken, method: "DELETE" });
}

export async function listSyncState(accessToken: string) {
  return apiRequest<{ cache: unknown[]; queue: unknown[] }>("/sync", { accessToken });
}

export async function processSyncQueue(accessToken: string) {
  return apiRequest<{ completed: unknown[] }>("/sync/process", { accessToken, method: "POST" });
}

export async function listTasks(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ tasks: unknown[] }>(`/tasks${suffix}`, { accessToken });
}

export async function getTask(accessToken: string, taskId: string) {
  return apiRequest<{ task: unknown }>(`/tasks/${taskId}`, { accessToken });
}

export async function createTask(accessToken: string, input: Record<string, unknown>) {
  return apiRequest<{ task: unknown }>("/tasks", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateTask(accessToken: string, taskId: string, input: Record<string, unknown>) {
  return apiRequest<{ task: unknown }>(`/tasks/${taskId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function deleteTask(accessToken: string, taskId: string) {
  return apiRequest<void>(`/tasks/${taskId}`, { accessToken, method: "DELETE" });
}

export async function listConversations(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ conversations: unknown[] }>(`/messages${suffix}`, { accessToken });
}

export async function getConversation(accessToken: string, conversationId: string) {
  return apiRequest<{ conversation: unknown }>(`/messages/${conversationId}`, { accessToken });
}

export async function sendMessage(accessToken: string, input: Record<string, unknown>) {
  return apiRequest<{ conversation: unknown; message: unknown }>("/messages", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function markConversationRead(accessToken: string, conversationId: string) {
  return apiRequest<{ receipts: unknown[] }>(`/messages/${conversationId}/read`, { accessToken, method: "POST" });
}

export async function deleteConversation(accessToken: string, conversationId: string) {
  return apiRequest<void>(`/messages/${conversationId}`, { accessToken, method: "DELETE" });
}

export async function listTeams(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ teams: unknown[] }>(`/teams${suffix}`, { accessToken });
}

export async function getTeam(accessToken: string, teamId: string) {
  return apiRequest<{ team: unknown }>(`/teams/${teamId}`, { accessToken });
}

export async function createTeam(accessToken: string, input: Record<string, unknown>) {
  return apiRequest<{ team: unknown }>("/teams", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateTeam(accessToken: string, teamId: string, input: Record<string, unknown>) {
  return apiRequest<{ team: unknown }>(`/teams/${teamId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function deleteTeam(accessToken: string, teamId: string) {
  return apiRequest<void>(`/teams/${teamId}`, { accessToken, method: "DELETE" });
}

export async function listAlerts(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ alerts: unknown[] }>(`/alerts${suffix}`, { accessToken });
}

export async function getAlert(accessToken: string, alertId: string) {
  return apiRequest<{ alert: unknown }>(`/alerts/${alertId}`, { accessToken });
}

export async function createAlert(accessToken: string, input: Record<string, unknown>) {
  return apiRequest<{ alert: unknown }>("/alerts", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateAlert(accessToken: string, alertId: string, input: Record<string, unknown>) {
  return apiRequest<{ alert: unknown }>(`/alerts/${alertId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export async function deleteAlert(accessToken: string, alertId: string) {
  return apiRequest<void>(`/alerts/${alertId}`, { accessToken, method: "DELETE" });
}
