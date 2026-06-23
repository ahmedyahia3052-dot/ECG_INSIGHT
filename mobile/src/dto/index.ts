export type SyncStatus = "pending" | "syncing" | "completed" | "failed";
export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type AlertCategory =
  | "critical_ecg"
  | "high_risk_worker"
  | "pending_review"
  | "expiring_certificate"
  | "security_incident";

export interface MobileNotificationDto {
  id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  read: boolean;
}

export interface MobileSyncItemDto {
  id: string;
  entityType: string;
  operation: string;
  status: SyncStatus;
  retryCount: number;
}

export interface MobileTaskDto {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt?: string;
}

export interface MobileAlertDto {
  id: string;
  category: AlertCategory;
  title: string;
  message: string;
}
