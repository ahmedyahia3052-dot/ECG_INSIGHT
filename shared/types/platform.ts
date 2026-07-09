export type NotificationSeverity = "info" | "warning" | "critical" | "success";

export type Notification = {
  id: string;
  message: string;
  read: boolean;
  severity: NotificationSeverity;
  timestamp: string;
  title: string;
  type?: string;
};

export type AuditLog = {
  action: string;
  actorId: string;
  actorName?: string;
  createdAt: string;
  id: string;
  newValue?: unknown;
  oldValue?: unknown;
  resourceId?: string;
  resourceType: string;
};

export type AIConfidence = {
  label: "low" | "medium" | "high";
  score: number;
};

export type AIResult = {
  confidence: AIConfidence;
  diagnosis: string;
  findings: string[];
  modelVersion?: string;
  recommendations?: string[];
};
