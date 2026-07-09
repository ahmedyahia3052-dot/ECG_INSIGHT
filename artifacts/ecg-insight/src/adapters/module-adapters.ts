import { BaseAdapter } from "../core/base-adapter";
import {
  AnalyticsMapper,
  AuthMapper,
  CaseMapper,
  DashboardMapper,
  DeveloperMapper,
  ECGMapper,
  HistoryMapper,
  MonitorMapper,
  NotificationMapper,
  OrganizationMapper,
  PatientMapper,
  ProfileMapper,
  SettingsMapper,
  SubscriptionMapper,
  UploadMapper,
} from "../mappers";
import {
  clinicalDomainService,
  collaborationDomainService,
  ecgProcessingDomainService,
  enterpriseDomainService,
  ownerLicensesDomainService,
  reportsDomainService,
  usersDomainService,
} from "@/services/domain";
import { getPreferences } from "@/services/preferences";
import { listWorkforceOrganizations } from "@/services/workforce";
import { safeArray } from "@/utils/collections";

export class DashboardAdapter extends BaseAdapter {
  constructor() {
    super("dashboard");
  }

  async load(accessToken: string) {
    this.assertEnabled();
    const [cases, patients, reports, notifications, subscription, enterprise] = await Promise.all([
      clinicalDomainService.listDashboardCases(accessToken),
      clinicalDomainService.listDashboardPatients(accessToken),
      reportsDomainService.listDashboardReports(accessToken),
      collaborationDomainService.listDashboardNotifications(accessToken),
      enterpriseDomainService.getMySubscription(accessToken),
      enterpriseDomainService.getClinicalDashboard(accessToken),
    ]);
    return DashboardMapper.toViewModel({
      cases: safeArray(cases.cases),
      enterprise: enterprise.dashboard,
      notifications: safeArray(notifications.notifications),
      patients: safeArray(patients.patients),
      reports: safeArray(reports.reports),
      subscription,
    });
  }
}

export class PatientAdapter extends BaseAdapter {
  constructor() {
    super("patients");
  }

  async list(accessToken: string, params = new URLSearchParams()) {
    this.assertEnabled();
    const response = await clinicalDomainService.listPatients(accessToken, params);
    return safeArray(response.patients).map(PatientMapper.toListItem);
  }

  async getHistory(accessToken: string, patientId: string) {
    this.assertEnabled();
    const response = await clinicalDomainService.getPatientHistory(accessToken, patientId);
    return safeArray(response.cases).map(CaseMapper.toListItem);
  }
}

export class CaseAdapter extends BaseAdapter {
  constructor() {
    super("cases");
  }

  async list(accessToken: string, params = new URLSearchParams()) {
    this.assertEnabled();
    const response = await clinicalDomainService.listCases(accessToken, params);
    return {
      cases: safeArray(response.cases).map(CaseMapper.toListItem),
      total: response.total ?? safeArray(response.cases).length,
    };
  }

  async get(accessToken: string, caseId: string) {
    this.assertEnabled();
    const response = await clinicalDomainService.getCase(accessToken, caseId);
    return CaseMapper.toDetail(response.case);
  }

  async approve(accessToken: string, caseId: string) {
    return clinicalDomainService.approve(accessToken, caseId);
  }

  async reject(accessToken: string, caseId: string, reason: string) {
    return clinicalDomainService.reject(accessToken, caseId, reason);
  }
}

/** Sprint 103 alias — Bolt Cases screen adapter */
export const CasesAdapter = CaseAdapter;

export class ReportsAdapter extends BaseAdapter {
  constructor() {
    super("cases");
  }

  async list(accessToken: string, params = new URLSearchParams()) {
    this.assertEnabled();
    const response = await reportsDomainService.listReports(accessToken, params);
    return safeArray(response.reports);
  }

  async get(accessToken: string, reportId: string) {
    this.assertEnabled();
    const response = await reportsDomainService.getReport(accessToken, reportId);
    return response.report;
  }

  async generate(accessToken: string, caseId: string) {
    this.assertEnabled();
    return reportsDomainService.generateReport(accessToken, caseId);
  }
}

export class HistoryAdapter extends BaseAdapter {
  constructor() {
    super("history");
  }

  async load(accessToken: string, filters: { query: string; severity: string; status: string }) {
    const params = new URLSearchParams();
    if (filters.query) params.set("search", filters.query);
    if (filters.severity !== "all") params.set("severity", filters.severity);
    if (filters.status !== "all") params.set("status", filters.status);
    const response = await clinicalDomainService.listCases(accessToken, params);
    return HistoryMapper.toViewModel({
      cases: safeArray(response.cases),
      filters,
      total: response.total ?? safeArray(response.cases).length,
    });
  }
}

export class ECGWorkspaceAdapter extends BaseAdapter {
  constructor() {
    super("workspace");
  }

  async load(accessToken: string, caseId: string) {
    this.assertEnabled();
    const digital = await ecgProcessingDomainService.getDigitalEcg(accessToken, caseId);
    return ECGMapper.toViewModel({ caseId, digital: digital.digitalEcg });
  }
}

export class ECGViewerAdapter extends BaseAdapter {
  constructor() {
    super("viewer");
  }

  async load(accessToken: string, caseId: string) {
    this.assertEnabled();
    const digital = await ecgProcessingDomainService.getDigitalEcg(accessToken, caseId);
    return ECGMapper.toViewModel({ caseId, digital: digital.digitalEcg });
  }
}

export class LiveMonitorAdapter extends BaseAdapter {
  constructor() {
    super("liveMonitor");
  }

  async load(input: {
    accessToken: string;
    caseId: string;
    filter: string;
    heartRate?: number;
    layoutMode: string;
    playback: string;
    rhythm?: string;
    signalQuality?: string;
  }) {
    this.assertEnabled();
    await ecgProcessingDomainService.getDigitalEcg(input.accessToken, input.caseId);
    return MonitorMapper.toViewModel(input);
  }
}

export class UploadAdapter extends BaseAdapter {
  constructor() {
    super("upload");
  }

  toQueued(file: { fileName: string; id: string; mimeType: string; progress?: number; sizeBytes?: number; status: string }) {
    return UploadMapper.toViewModel(file);
  }
}

export class ProfileAdapter extends BaseAdapter {
  constructor() {
    super("profile");
  }

  async load(accessToken: string, userId: string) {
    this.assertEnabled();
    const directory = await usersDomainService.listDirectory(accessToken);
    const user = safeArray(directory.users).find((item) => item.id === userId);
    if (!user) throw this.normalizeError("Profile not found");
    return ProfileMapper.toViewModel(user);
  }
}

export class SettingsAdapter extends BaseAdapter {
  constructor() {
    super("settings");
  }

  async load(accessToken: string) {
    this.assertEnabled();
    const prefs = await getPreferences(accessToken);
    return SettingsMapper.toViewModel({
      locale: "en-US",
      notificationsEnabled: prefs.preferences.criticalAlertSound,
      theme: prefs.preferences.highContrastMode ? "high-contrast" : "system",
      timezone: "UTC",
    });
  }
}

export class OrganizationAdapter extends BaseAdapter {
  constructor() {
    super("organizations");
  }

  async list(accessToken: string) {
    this.assertEnabled();
    const response = await listWorkforceOrganizations(accessToken);
    return safeArray(response.organizations).map((org) =>
      OrganizationMapper.toViewModel({
        id: org.id,
        name: org.name,
        plan: org.type,
        region: org.address,
      }),
    );
  }
}

export class SubscriptionAdapter extends BaseAdapter {
  constructor() {
    super("subscriptions");
  }

  async load(accessToken: string) {
    this.assertEnabled();
    const subscription = await enterpriseDomainService.getMySubscription(accessToken);
    return SubscriptionMapper.toViewModel(subscription);
  }

  async listLicenses(accessToken: string) {
    return ownerLicensesDomainService.listLicenses(accessToken);
  }
}

export class DeveloperAdapter extends BaseAdapter {
  constructor() {
    super("developer");
  }

  async load() {
    this.assertEnabled();
    return DeveloperMapper.toViewModel({ apiUsage: 0, environment: "production", keyCount: 0, webhookCount: 0 });
  }
}

export class NotificationAdapter extends BaseAdapter {
  constructor() {
    super("notifications");
  }

  async list(accessToken: string, params = new URLSearchParams({ pageSize: "20" })) {
    this.assertEnabled();
    const response = await collaborationDomainService.listDashboardNotifications(accessToken);
    return NotificationMapper.toList(safeArray(response.notifications));
  }
}

export class AnalyticsAdapter extends BaseAdapter {
  constructor() {
    super("analytics");
  }

  async load(accessToken: string) {
    this.assertEnabled();
    const response = await enterpriseDomainService.getClinicalDashboard(accessToken);
    return AnalyticsMapper.toViewModel(response.dashboard ?? {});
  }
}

export class AuthAdapter extends BaseAdapter {
  constructor() {
    super("auth");
  }

  toSession(input: { email: string; role?: string; token?: string; userId: string; userName: string }) {
    return AuthMapper.toViewModel(input);
  }
}

export const dashboardAdapter = new DashboardAdapter();
export const patientAdapter = new PatientAdapter();
export const caseAdapter = new CaseAdapter();
export const casesAdapter = caseAdapter;
export const historyAdapter = new HistoryAdapter();
export const reportsAdapter = new ReportsAdapter();
export const ecgWorkspaceAdapter = new ECGWorkspaceAdapter();
export const ecgViewerAdapter = new ECGViewerAdapter();
export const liveMonitorAdapter = new LiveMonitorAdapter();
export const uploadAdapter = new UploadAdapter();
export const profileAdapter = new ProfileAdapter();
export const settingsAdapter = new SettingsAdapter();
export const organizationAdapter = new OrganizationAdapter();
export const subscriptionAdapter = new SubscriptionAdapter();
export const developerAdapter = new DeveloperAdapter();
export const notificationAdapter = new NotificationAdapter();
export const analyticsAdapter = new AnalyticsAdapter();
export const authAdapter = new AuthAdapter();
