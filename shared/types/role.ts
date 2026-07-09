export type Role = "super_admin" | "admin" | "doctor" | "student" | "technician" | "viewer";

export type Permission =
  | "cases.read"
  | "cases.write"
  | "cases.approve"
  | "cases.reject"
  | "patients.read"
  | "patients.write"
  | "reports.read"
  | "reports.write"
  | "reports.sign"
  | "workspace.read"
  | "viewer.read"
  | "monitor.read"
  | "organizations.read"
  | "organizations.write"
  | "subscriptions.read"
  | "subscriptions.manage"
  | "developer.access"
  | "audit.read";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["cases.read", "cases.write", "cases.approve", "cases.reject", "patients.read", "patients.write", "reports.read", "reports.write", "reports.sign", "workspace.read", "viewer.read", "monitor.read", "organizations.read", "organizations.write", "subscriptions.read", "audit.read"],
  doctor: ["cases.read", "cases.write", "cases.approve", "cases.reject", "patients.read", "patients.write", "reports.read", "reports.write", "reports.sign", "workspace.read", "viewer.read", "monitor.read"],
  student: ["cases.read", "patients.read", "reports.read", "workspace.read", "viewer.read"],
  super_admin: ["cases.read", "cases.write", "cases.approve", "cases.reject", "patients.read", "patients.write", "reports.read", "reports.write", "reports.sign", "workspace.read", "viewer.read", "monitor.read", "organizations.read", "organizations.write", "subscriptions.read", "subscriptions.manage", "developer.access", "audit.read"],
  technician: ["cases.read", "patients.read", "workspace.read", "viewer.read", "monitor.read", "reports.read"],
  viewer: ["cases.read", "patients.read", "viewer.read", "reports.read"],
};
