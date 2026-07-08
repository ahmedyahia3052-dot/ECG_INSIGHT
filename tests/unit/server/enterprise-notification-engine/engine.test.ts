import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFICATION_RULES } from "../../../../server/src/modules/enterprise-notification-engine/notification-rules";
import {
  deliveryModeToChannel,
  deliveryStatusForMode,
  matchRulesForEvent,
  mergeRecipientUserIds,
  renderTemplate,
} from "../../../../server/src/modules/enterprise-notification-engine/rule-engine";

describe("enterprise notification rule engine", () => {
  it("seeds all sprint 66 event types", () => {
    expect(DEFAULT_NOTIFICATION_RULES).toHaveLength(12);
    expect(new Set(DEFAULT_NOTIFICATION_RULES.map((rule) => rule.eventType)).size).toBe(12);
  });

  it("matches persisted-style rules by event type", () => {
    const rules = matchRulesForEvent("FOLLOW_UP_OVERDUE");
    expect(rules[0]?.ruleCode).toBe("follow_up_overdue");
    expect(rules[0]?.deliveryModes).toContain("PUSH_READY");
  });

  it("merges and deduplicates recipient ids", () => {
    expect(mergeRecipientUserIds(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("renders template variables", () => {
    expect(renderTemplate("Case {{caseId}}", { caseId: "case-123" })).toBe("Case case-123");
  });

  it("maps delivery modes to channels and statuses", () => {
    expect(deliveryModeToChannel("EMAIL_READY")).toBe("EMAIL");
    expect(deliveryStatusForMode("IN_APP")).toBe("SENT");
    expect(deliveryStatusForMode("WEBHOOK_READY")).toBe("QUEUED");
  });
});
