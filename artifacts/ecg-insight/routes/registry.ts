import type { AppNavItem, AppPageMeta } from "@/types/navigation";

export const APP_NAV_ITEMS: AppNavItem[] = [
  { group: "CLINICAL", href: "/dashboard", icon: "grid", title: "Dashboard" },
  { group: "CLINICAL", href: "/ecg-analysis", icon: "activity", title: "ECG Analysis" },
  { group: "CLINICAL", href: "/ecg-cases", icon: "clipboard", title: "ECG Cases" },
  { group: "CLINICAL", href: "/upload-ecg", icon: "upload-cloud", title: "Upload ECG" },
  { group: "CLINICAL", href: "/ecg-workspace", icon: "image", title: "ECG Workspace" },
  { group: "CLINICAL", href: "/ecg-viewer", icon: "monitor", title: "ECG Pro Viewer" },
  { group: "CLINICAL", href: "/ecg-live-monitor", icon: "monitor", title: "Live Monitor" },
  { group: "CLINICAL", href: "/patients", icon: "users", title: "Patients" },
  { group: "CLINICAL", href: "/reports", icon: "file-text", title: "Reports" },
  { group: "WORKSPACE", href: "/copilot", icon: "message-square", title: "AI Copilot" },
  { group: "WORKSPACE", href: "/analytics", icon: "bar-chart-2", title: "Analytics" },
  { group: "WORKSPACE", href: "/team-management", icon: "briefcase", minRole: "admin", title: "Organizations" },
  { group: "WORKSPACE", href: "/team-management", icon: "user-plus", minRole: "admin", title: "Employees" },
  { group: "WORKSPACE", href: "/notifications", icon: "bell", title: "Notifications" },
  { group: "WORKSPACE", href: "/support", icon: "life-buoy", title: "Support" },
  { group: "WORKSPACE", href: "/settings", icon: "settings", title: "Settings" },
  { group: "WORKSPACE", href: "/profile", icon: "user", title: "Profile" },
  { group: "DEVELOPER", href: "/admin-dashboard", icon: "shield", minRole: "admin", title: "Admin Controls" },
  { group: "DEVELOPER", href: "/ecg-benchmark", icon: "bar-chart", minRole: "admin", title: "ECG Benchmark" },
  { group: "DEVELOPER", href: "/audit-log", icon: "book-open", minRole: "admin", title: "Audit Trail" },
  { group: "DEVELOPER", href: "/billing-subscription", icon: "credit-card", minRole: "admin", title: "Subscription Controls" },
  { group: "DEVELOPER", href: "/owner/licenses", icon: "award", minRole: "super_admin", ownerOnly: true, title: "License Controls" },
  { group: "DEVELOPER", href: "/release-candidate", icon: "flag", minRole: "super_admin", ownerOnly: true, title: "Release Candidate" },
];

export const APP_PAGE_TITLES: Record<string, AppPageMeta> = {
  "/analytics": { subtitle: "Enterprise BI, trends, workload, and quality signals.", title: "Analytics" },
  "/admin-dashboard": { subtitle: "Administrative overview, users, subscriptions, and platform health.", title: "Admin Dashboard" },
  "/ecg-benchmark": { subtitle: "Clinical validation benchmark against PTB-XL, PhysioNet, and CPSC datasets.", title: "ECG Benchmark" },
  "/audit-log": { subtitle: "Enterprise audit trail with actor, action, and old/new clinical values.", title: "Audit Trail" },
  "/clinical-workspace/[caseId]": { subtitle: "Unified split-screen patient, ECG viewer, AI findings, measurements, notes, and timeline.", title: "Clinical Workspace" },
  "/ecg-live-monitor/[caseId]": { subtitle: "Hospital-grade bedside live ECG monitor with diagnostic fullscreen, lead selection, and transport controls.", title: "Live ECG Monitor" },
  "/ecg-monitor/[caseId]": { subtitle: "Enterprise PACS-style ECG image viewer with grid, transforms, and dockable panels.", title: "ECG Monitor Workspace" },
  "/billing-subscription": { subtitle: "Subscription plan, quota, billing, and license status.", title: "Billing & Subscription" },
  "/copilot": { subtitle: "Enterprise medical AI chat workspace with real conversation persistence.", title: "AI Clinical Copilot" },
  "/support": { subtitle: "Contact support and submit operational requests.", title: "Support" },
  "/dashboard": { subtitle: "Executive medical command center for ECG operations.", title: "Dashboard" },
  "/ecg-analysis": { subtitle: "Review cases, AI findings, validation, and report generation.", title: "ECG Analysis" },
  "/ecg-cases": { subtitle: "Enterprise ECG case workflow, review, approval, and reports.", title: "ECG Cases" },
  "/notifications": { subtitle: "Clinical alerts, workflow events, and collaboration updates.", title: "Notifications" },
  "/owner/licenses": { subtitle: "Hidden owner-only license grants, subscription control, and lifetime access.", title: "License Management" },
  "/release-candidate": { subtitle: "Launch readiness score, workflow validation, performance metrics, and defect summary.", title: "Release Candidate" },
  "/patients": { subtitle: "Enterprise patient registry, risk profile, and ECG history.", title: "Patients" },
  "/profile": { subtitle: "Account, role, institution, and secure session details.", title: "Profile" },
  "/reports": { subtitle: "Draft, review, finalize, sign, export, and email reports.", title: "Reports" },
  "/settings": { subtitle: "Workspace preferences, accessibility, and clinical defaults.", title: "Settings" },
  "/team-management": { subtitle: "Manage users, roles, access, and clinical workspace membership.", title: "Team Management" },
  "/upload-ecg": { subtitle: "Capture, upload, preview, analyze, validate, and save ECG records.", title: "Upload ECG" },
  "/ecg-live-monitor": { subtitle: "Dedicated hospital bedside live ECG monitor workspace — separate from the clinical review workstation.", title: "Live ECG Monitor" },
  "/ecg-workspace": { subtitle: "Hospital-grade ECG clinical workstation with digitization, live monitor, measurements, AI review, and export.", title: "Hospital ECG Workstation" },
  "/ecg-viewer": { subtitle: "Professional hospital ECG image viewer with calibrated grid, zoom, pan, and study metadata.", title: "ECG Pro Viewer" },
};

export function resolvePageMeta(pathname: string): AppPageMeta {
  const exact = APP_PAGE_TITLES[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/patients/")) return { title: "Patient Profile", subtitle: "Demographics, ECG history, documents, and timeline." };
  if (pathname.startsWith("/ecg-live-monitor/")) return APP_PAGE_TITLES["/ecg-live-monitor/[caseId]"] ?? { title: "Live ECG Monitor", subtitle: "Hospital bedside live ECG monitor workspace." };
  if (pathname.startsWith("/ecg-cases/")) return { title: "ECG Case", subtitle: "Viewer, measurements, AI findings, doctor review, and report workflow." };
  if (pathname.startsWith("/reports/")) return { title: "Report Detail", subtitle: "Clinical report review, finalization, signing, and export." };
  return { title: "ECG Insight", subtitle: "Enterprise Medical AI Platform." };
}

export function roleRank(role?: string) {
  if (role === "super_admin") return 4;
  if (role === "admin") return 3;
  if (role === "doctor") return 2;
  if (role === "student") return 1;
  return 0;
}
