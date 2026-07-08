import { DEFAULT_NOTIFICATION_RULES } from "../server/src/modules/enterprise-notification-engine/notification-rules";
import {
  deliveryModeToChannel,
  deliveryStatusForMode,
  matchRulesForEvent,
  mergeRecipientUserIds,
  recipientStatusForMode,
  renderTemplate,
} from "../server/src/modules/enterprise-notification-engine/rule-engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  assert(DEFAULT_NOTIFICATION_RULES.length === 12, "notification rules should cover all 12 clinical event types");

  const eventTypes = new Set(DEFAULT_NOTIFICATION_RULES.map((rule) => rule.eventType));
  assert(eventTypes.has("CRITICAL_ECG"), "critical ECG rule required");
  assert(eventTypes.has("REPORT_EXPORTED"), "report exported rule required");
  assert(eventTypes.has("TIMELINE_UPDATED"), "timeline updated rule required");

  const criticalRules = matchRulesForEvent("CRITICAL_ECG");
  assert(criticalRules.length === 1, "critical ECG should match one rule");
  assert(criticalRules[0]!.deliveryModes.includes("IN_APP"), "critical ECG should deliver in-app");
  assert(criticalRules[0]!.deliveryModes.includes("EMAIL_READY"), "critical ECG should prepare email");

  const merged = mergeRecipientUserIds(["user-a"], ["user-b", "user-a"], undefined);
  assert(merged.length === 2, "recipient merge should deduplicate");
  assert(merged.includes("user-a") && merged.includes("user-b"), "recipient merge should preserve ids");

  const rendered = renderTemplate("Alert for {{patientName}}: {{finding}}", {
    finding: "ST elevation",
    patientName: "John Doe",
  });
  assert(rendered === "Alert for John Doe: ST elevation", "template rendering should substitute variables");

  assert(deliveryModeToChannel("EMAIL_READY") === "EMAIL", "email ready maps to email channel");
  assert(deliveryModeToChannel("WEBHOOK_READY") === "IN_APP", "webhook ready maps to in-app channel placeholder");
  assert(deliveryStatusForMode("IN_APP") === "SENT", "in-app delivery is sent immediately");
  assert(deliveryStatusForMode("EMAIL_READY") === "QUEUED", "email ready stays queued");
  assert(recipientStatusForMode("IN_APP") === "DELIVERED", "in-app recipient is delivered");
  assert(recipientStatusForMode("SMS_READY") === "PENDING", "sms ready recipient stays pending");

  console.log("sprint66-enterprise-notification-engine.test.ts: all tests passed");
}

main();
