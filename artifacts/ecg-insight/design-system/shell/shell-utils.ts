import type { NotificationRecord } from "@/services/collaboration";
import type { GlobalSearchResult } from "@/services/search";
import { Feather } from "@expo/vector-icons";

export function notificationMatchesFilter(
  notification: NotificationRecord,
  filter: "all" | "critical" | "license" | "system" | "unread",
) {
  const haystack = `${notification.type} ${notification.entityType ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  if (filter === "all") return true;
  if (filter === "unread") return !notification.read;
  if (filter === "critical") return isCriticalNotification(notification);
  if (filter === "license") return haystack.includes("license") || haystack.includes("subscription") || haystack.includes("billing");
  if (filter === "system") return haystack.includes("system") || haystack.includes("sync") || haystack.includes("failed");
  return haystack.includes(filter);
}

export function notificationFilterLabel(filter: "all" | "critical" | "license" | "system" | "unread") {
  if (filter === "all") return "All";
  if (filter === "unread") return "Unread";
  if (filter === "critical") return "Critical";
  if (filter === "system") return "System";
  return "License";
}

export function isCriticalNotification(notification: NotificationRecord) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  return haystack.includes("critical") || haystack.includes("stemi") || haystack.includes("urgent") || haystack.includes("failed");
}

export function classifyNotification(notification: NotificationRecord) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  if (haystack.includes("stemi")) return "STEMI";
  if (haystack.includes("subscription") || haystack.includes("license") || haystack.includes("billing")) return "License";
  if (haystack.includes("system") || haystack.includes("sync") || haystack.includes("failed")) return "System";
  if (haystack.includes("urgent") || haystack.includes("review")) return "Urgent review";
  return "Clinical";
}

export function notificationStatusLabel(notification: NotificationRecord) {
  if (isCriticalNotification(notification)) return "Critical";
  return notification.read ? "Read" : "Unread";
}

export function searchResultIcon(type: GlobalSearchResult["type"]): keyof typeof Feather.glyphMap {
  if (type === "case") return "activity";
  if (type === "doctor") return "user-check";
  if (type === "employee") return "briefcase";
  if (type === "organization") return "briefcase";
  if (type === "report") return "file-text";
  return "users";
}

export function searchResultTypeLabel(type: GlobalSearchResult["type"]) {
  if (type === "case") return "ECG Case";
  if (type === "doctor") return "Doctor";
  if (type === "employee") return "Employee";
  if (type === "organization") return "Organization";
  if (type === "report") return "Report";
  return "Patient";
}

export function notificationIcon(notification: NotificationRecord): keyof typeof Feather.glyphMap {
  const haystack = `${notification.type} ${notification.entityType ?? ""} ${notification.title}`.toLowerCase();
  if (haystack.includes("critical")) return "alert-triangle";
  if (haystack.includes("license") || haystack.includes("subscription")) return "award";
  if (haystack.includes("system")) return "server";
  return "bell";
}

export function roleLabel(role?: string) {
  if (role === "super_admin") return "Developer Super Admin";
  if (role === "admin") return "Admin";
  if (role === "doctor") return "Doctor";
  if (role === "student") return "Student";
  return "Clinical User";
}

export function formatShellDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}
