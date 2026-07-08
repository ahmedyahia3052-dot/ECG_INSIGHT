import { runIntegrationMain } from "./finish-integration";
import { DEFAULT_NOTIFICATION_RULES } from "../server/src/modules/enterprise-notification-engine/notification-rules";
import {
  deliveryModeToChannel,
  matchRulesForEvent,
  mergeRecipientUserIds,
  renderTemplate,
} from "../server/src/modules/enterprise-notification-engine/rule-engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const criticalEvent = {
    caseId: "integration-case",
    eventType: "CRITICAL_ECG" as const,
    message: "ST elevation detected in leads V2-V4.",
    patientId: "integration-patient",
    recipientUserIds: ["doctor-1", "doctor-2"],
    title: "Critical ECG Alert",
  };

  const rules = matchRulesForEvent(criticalEvent.eventType);
  assert(rules.length > 0, "integration pipeline should match notification rules");

  const recipients = mergeRecipientUserIds(
    ["uploader-1"],
    criticalEvent.recipientUserIds,
  );
  assert(recipients.length === 3, "integration recipients should merge explicit and stakeholder ids");

  for (const rule of rules) {
    const templateKey = rule.templateKey ?? rule.ruleCode;
    const template = DEFAULT_NOTIFICATION_RULES.find((item) => item.templateKey === templateKey || item.ruleCode === templateKey);
    assert(template, `template metadata should exist for ${templateKey}`);

    const title = renderTemplate(template!.name, {
      caseId: criticalEvent.caseId,
      message: criticalEvent.message,
      patientName: "Integration Patient",
    });
    assert(title.length > 0, "rendered notification title required");

    for (const mode of rule.deliveryModes) {
      assert(deliveryModeToChannel(mode) !== undefined, `delivery channel mapping required for ${mode}`);
    }
  }

  const exportedRules = matchRulesForEvent("REPORT_EXPORTED");
  assert(exportedRules.some((rule) => rule.deliveryModes.includes("WEBHOOK_READY")), "report export should expose webhook-ready delivery");

  console.log("sprint66-enterprise-notification-engine.integration.ts: all tests passed");
}

runIntegrationMain(main, "sprint66-enterprise-notification-engine.integration.ts");
