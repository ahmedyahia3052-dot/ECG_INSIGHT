import { apiRequest } from "./api";

export async function listNotifications(accessToken: string) {
  return apiRequest<{ notifications: unknown[] }>("/notifications", { accessToken });
}

export async function listSyncState(accessToken: string) {
  return apiRequest<{ cache: unknown[]; queue: unknown[] }>("/sync", { accessToken });
}

export async function processSyncQueue(accessToken: string) {
  return apiRequest<{ completed: unknown[] }>("/sync/process", { accessToken, method: "POST" });
}

export async function listTasks(accessToken: string) {
  return apiRequest<{ tasks: unknown[] }>("/tasks", { accessToken });
}

export async function listConversations(accessToken: string) {
  return apiRequest<{ conversations: unknown[] }>("/messages", { accessToken });
}

export async function listTeams(accessToken: string) {
  return apiRequest<{ teams: unknown[] }>("/teams", { accessToken });
}

export async function listAlerts(accessToken: string) {
  return apiRequest<{ alerts: unknown[] }>("/alerts", { accessToken });
}
