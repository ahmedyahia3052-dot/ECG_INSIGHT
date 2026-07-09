import type { CaseListItemVM, DashboardVM, NotificationVM, PatientListItemVM } from "../view-models";

export const dashboardSelectors = {
  criticalCount(snapshot: DashboardVM | null) {
    return snapshot?.kpis.find((item) => item.label === "Critical Cases")?.value ?? "0";
  },
  unreadNotifications(notifications: NotificationVM[]) {
    return notifications.filter((item) => !item.read);
  },
};

export const caseSelectors = {
  byPriority(cases: CaseListItemVM[], priority: string) {
    return cases.filter((item) => item.priorityBadge.label === priority);
  },
  critical(cases: CaseListItemVM[]) {
    return cases.filter((item) => item.priorityBadge.tone === "critical");
  },
};

export const patientSelectors = {
  active(patients: PatientListItemVM[]) {
    return patients.filter((item) => item.statusBadge.label !== "archived");
  },
};
