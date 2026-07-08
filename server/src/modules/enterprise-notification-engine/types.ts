import type {
  ClinicalEventType,
  EnterpriseDeliveryMode,
  NotificationCategory,
  NotificationType,
  TaskPriority,
} from "@prisma/client";

export const ENTERPRISE_NOTIFICATION_ENGINE_VERSION = "sprint66-v1";

export type PublishClinicalEventInput = {
  actorId?: string;
  caseId?: string;
  eventType: ClinicalEventType;
  message: string;
  patientId?: string;
  payload?: Record<string, unknown>;
  recipientUserIds?: string[];
  title: string;
};

export type NotificationRuleDefinition = {
  category: NotificationCategory;
  criteriaJson?: Record<string, unknown>;
  deliveryModes: EnterpriseDeliveryMode[];
  description: string;
  eventType: ClinicalEventType;
  name: string;
  notificationType: NotificationType;
  priority: TaskPriority;
  ruleCode: string;
  templateKey?: string;
};

export type MatchedNotificationRule = NotificationRuleDefinition & {
  id: string;
};

export type PublishedEventResult = {
  clinicalEventId: string;
  engineVersion: string;
  eventType: ClinicalEventType;
  notificationIds: string[];
  recipientCount: number;
};

export type EnterpriseNotificationView = {
  caseId?: string;
  category: NotificationCategory;
  clinicalEventId?: string;
  createdAt: string;
  deliveryModes: EnterpriseDeliveryMode[];
  id: string;
  message: string;
  patientId?: string;
  read: boolean;
  readAt?: string;
  title: string;
  type: string;
};
