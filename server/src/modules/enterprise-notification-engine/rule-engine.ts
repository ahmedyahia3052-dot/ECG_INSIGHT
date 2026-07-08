import type {
  EnterpriseDeliveryMode,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationProvider,
} from "@prisma/client";
import { DEFAULT_NOTIFICATION_RULES } from "./notification-rules";
import type { MatchedNotificationRule } from "./types";

export function matchRulesForEvent(eventType: string, persistedRules?: MatchedNotificationRule[]) {
  if (persistedRules?.length) return persistedRules;
  return DEFAULT_NOTIFICATION_RULES.filter((rule) => rule.eventType === eventType).map((rule) => ({
    ...rule,
    id: rule.ruleCode,
  }));
}

export function mergeRecipientUserIds(...groups: Array<string[] | undefined>) {
  return [...new Set(groups.flatMap((group) => group ?? []).filter(Boolean))];
}

export function renderTemplate(template: string, variables: Record<string, unknown> = {}) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function deliveryModeToChannel(mode: EnterpriseDeliveryMode): NotificationChannel {
  switch (mode) {
    case "EMAIL_READY":
      return "EMAIL";
    case "PUSH_READY":
      return "PUSH";
    case "SMS_READY":
      return "SMS";
    case "WEBHOOK_READY":
    case "IN_APP":
    default:
      return "IN_APP";
  }
}

export function deliveryModeToProvider(mode: EnterpriseDeliveryMode): NotificationProvider {
  if (mode === "EMAIL_READY") return "SMTP";
  if (mode === "PUSH_READY") return "FIREBASE_PUSH";
  if (mode === "SMS_READY") return "TWILIO_SMS";
  if (mode === "WEBHOOK_READY") return "IN_APP";
  return "IN_APP";
}

export function deliveryStatusForMode(mode: EnterpriseDeliveryMode): NotificationDeliveryStatus {
  if (mode === "IN_APP") return "SENT";
  return "QUEUED";
}

export function recipientStatusForMode(mode: EnterpriseDeliveryMode) {
  return mode === "IN_APP" ? ("DELIVERED" as const) : ("PENDING" as const);
}
