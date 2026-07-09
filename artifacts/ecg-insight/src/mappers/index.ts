import { toEcgCaseDetailView, toEcgCaseListItemView, toDashboardKpiView } from "../../adapters/clinical/ecg-case.adapter";
import type { ApiECGCase, ApiPatient } from "@/services/clinical";
import type { NotificationRecord } from "@/services/collaboration";
import type { ClinicalReport } from "@/services/reports";
import type { MySubscription } from "@/services/subscriptions";
import type { UserDirectoryEntry } from "@/services/domain";

import { datePresenter, measurementPresenter, statusPresenter } from "../presenters";
import type {
  AnalyticsVM,
  AuthVM,
  CaseListItemVM,
  CaseVM,
  DashboardVM,
  DeveloperVM,
  EcgVM,
  HistoryVM,
  MonitorVM,
  NotificationVM,
  OrganizationVM,
  PatientListItemVM,
  PatientVM,
  ProfileVM,
  SettingsVM,
  SubscriptionVM,
  UploadVM,
} from "../view-models";

export const PatientMapper = {
  toListItem(patient: ApiPatient): PatientListItemVM {
    return {
      ageLabel: patient.age != null ? `${patient.age}y` : "—",
      genderLabel: patient.gender ?? "—",
      id: patient.id,
      mrnLabel: patient.medicalRecordNumber ?? "—",
      name: `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Unknown patient",
      statusBadge: statusPresenter.patientStatus(patient.archivedAt ? "archived" : patient.status ?? "active"),
    };
  },
  toDetail(patient: ApiPatient, caseCount?: number): PatientVM {
    return {
      ...PatientMapper.toListItem(patient),
      caseCount,
      lastStudyLabel: datePresenter.formatDate(patient.dateOfBirth),
    };
  },
};

export const CaseMapper = {
  toListItem(record: ApiECGCase): CaseListItemVM {
    const base = toEcgCaseListItemView(record);
    return {
      acquisitionLabel: datePresenter.formatDate(base.acquisitionDate),
      aiStatusBadge: statusPresenter.aiStatus(base.aiStatus),
      caseId: base.caseId,
      caseNumber: base.caseNumber ?? base.caseId,
      heartRateLabel: measurementPresenter.heartRate(base.heartRate),
      id: base.id,
      patientName: base.patientLabel,
      priorityBadge: statusPresenter.priority(base.priority),
      rhythmLabel: base.rhythm ?? "—",
      statusBadge: statusPresenter.caseStatus(base.status),
      uploadLabel: datePresenter.formatDate(base.uploadDate),
    };
  },
  toDetail(record: ApiECGCase, imageUrl?: string): CaseVM {
    const detail = toEcgCaseDetailView(record, imageUrl);
    return {
      ...CaseMapper.toListItem(record),
      aiDiagnosis: detail.aiDiagnosis,
      confidenceLabel: measurementPresenter.confidence(detail.confidence),
      doctorDiagnosis: detail.doctorDiagnosis,
      imageUrl: detail.imageUrl,
      measurements: [
        { label: "PR", unit: "ms", value: measurementPresenter.interval(detail.prInterval) },
        { label: "QRS", unit: "ms", value: measurementPresenter.interval(detail.qrsDuration) },
        { label: "QT", unit: "ms", value: measurementPresenter.interval(detail.qtInterval) },
      ],
      prLabel: measurementPresenter.interval(detail.prInterval),
      qrsLabel: measurementPresenter.interval(detail.qrsDuration),
      qtLabel: measurementPresenter.interval(detail.qtInterval),
    };
  },
};

export const DashboardMapper = {
  toViewModel(input: {
    cases: ApiECGCase[];
    enterprise?: {
      criticalEcgs?: number;
      pendingReviews?: number;
      todaysEcgs?: number;
      aiMetrics?: { accuracy?: number | null };
      avgProcessingTimeMs?: number;
    };
    notifications: NotificationRecord[];
    patients: ApiPatient[];
    reports: ClinicalReport[];
    subscription?: MySubscription;
  }): DashboardVM {
    const kpisRaw = toDashboardKpiView(input);
    return {
      kpis: [
        { label: "Total Cases", value: String(kpisRaw.totalCases), tone: "primary" },
        { label: "Critical Cases", value: String(kpisRaw.criticalCases), tone: "critical" },
        { label: "Pending Reviews", value: String(input.enterprise?.pendingReviews ?? kpisRaw.pendingReviews), tone: "warning" },
        { label: "Active Patients", value: String(kpisRaw.totalPatients), tone: "success" },
      ],
      notifications: NotificationMapper.toList(input.notifications),
      pendingReports: kpisRaw.pendingReports,
      pendingReviews: input.enterprise?.pendingReviews ?? kpisRaw.pendingReviews,
      recentCases: input.cases.slice(0, 8).map(CaseMapper.toListItem),
      recentPatients: input.patients.slice(0, 8).map(PatientMapper.toListItem),
      subscriptionLabel: input.subscription?.lifetimeAccess.granted
        ? "Lifetime Premium"
        : input.subscription?.plan.name ?? "Subscription Active",
      summary: [
        { label: "Today's ECGs", value: String(input.enterprise?.todaysEcgs ?? input.cases.length) },
        { label: "Critical Findings", value: String(input.enterprise?.criticalEcgs ?? kpisRaw.criticalCases) },
        { label: "Pending Reviews", value: String(input.enterprise?.pendingReviews ?? kpisRaw.pendingReviews) },
        { label: "Reports Pending", value: String(kpisRaw.pendingReports) },
      ],
    };
  },
};

export const NotificationMapper = {
  toList(records: NotificationRecord[]): NotificationVM[] {
    return records.map((item) => ({
      id: item.id,
      message: item.message,
      read: item.read,
      severityBadge: statusPresenter.notificationSeverity(item.type),
      timestampLabel: datePresenter.formatDateTime(item.timestamp),
      title: item.title,
    }));
  },
};

export const ECGMapper = {
  toViewModel(input: {
    caseId: string;
    digital?: {
      enhancedImageUrl?: string;
      leads?: Array<unknown>;
      originalImageUrl?: string;
      quality?: { score?: number };
      validation?: { signalContinuityPercent?: number };
      measurementEngine?: { heartRate?: number; prInterval?: number; qrsDuration?: number; qtInterval?: number };
    } | null;
  }): EcgVM {
    const engine = input.digital?.measurementEngine;
    return {
      caseId: input.caseId,
      enhancedImageUrl: input.digital?.enhancedImageUrl,
      leadCount: input.digital?.leads?.length ?? 0,
      measurementSummary: [
        { label: "HR", unit: "bpm", value: measurementPresenter.heartRate(engine?.heartRate) },
        { label: "PR", unit: "ms", value: measurementPresenter.interval(engine?.prInterval) },
        { label: "QRS", unit: "ms", value: measurementPresenter.interval(engine?.qrsDuration) },
        { label: "QT", unit: "ms", value: measurementPresenter.interval(engine?.qtInterval) },
      ],
      originalImageUrl: input.digital?.originalImageUrl,
      qualityLabel: input.digital?.quality?.score != null ? `${Math.round(input.digital.quality.score * 100)}%` : "Unknown",
      signalContinuityLabel:
        input.digital?.validation?.signalContinuityPercent != null
          ? `${Math.round(input.digital.validation.signalContinuityPercent)}%`
          : undefined,
    };
  },
};

export const MonitorMapper = {
  toViewModel(input: {
    caseId: string;
    filter: string;
    heartRate?: number;
    layoutMode: string;
    playback: string;
    rhythm?: string;
    signalQuality?: string;
  }): MonitorVM {
    return {
      caseId: input.caseId,
      filterLabel: input.filter,
      heartRateLabel: measurementPresenter.heartRate(input.heartRate),
      layoutLabel: input.layoutMode,
      playbackLabel: input.playback,
      rhythmLabel: input.rhythm ?? "Pending",
      signalQualityLabel: input.signalQuality ?? "Unknown",
    };
  },
};

export const SubscriptionMapper = {
  toViewModel(subscription: MySubscription): SubscriptionVM {
    return {
      billingLabel: subscription.plan.billingCycle ?? "Monthly",
      id: subscription.plan.id ?? subscription.plan.name,
      planName: subscription.plan.name,
      renewalLabel: datePresenter.formatDate(subscription.quota.nextResetAt),
      seatsLabel: String(subscription.quota.limits?.maxUsers ?? 1),
      statusBadge: statusPresenter.subscriptionStatus(subscription.lifetimeAccess.granted ? "active" : "inactive"),
    };
  },
};

export const OrganizationMapper = {
  toViewModel(input: { id: string; memberCount?: number; name: string; plan?: string; region?: string }): OrganizationVM {
    return {
      id: input.id,
      memberCountLabel: String(input.memberCount ?? 0),
      name: input.name,
      planBadge: statusPresenter.planTier(input.plan),
      regionLabel: input.region ?? "Global",
    };
  },
};

export const ProfileMapper = {
  toViewModel(user: UserDirectoryEntry & { organization?: string; role?: string }): ProfileVM {
    return {
      email: user.email,
      id: user.id,
      name: user.name,
      organizationLabel: user.organization ?? "ECG Insight",
      roleBadge: statusPresenter.role(user.role),
    };
  },
};

export const DeveloperMapper = {
  toViewModel(input: { apiUsage?: number; environment?: string; keyCount?: number; webhookCount?: number }): DeveloperVM {
    return {
      apiUsageLabel: String(input.apiUsage ?? 0),
      environmentLabel: input.environment ?? "production",
      keyCountLabel: String(input.keyCount ?? 0),
      webhookCountLabel: String(input.webhookCount ?? 0),
    };
  },
};

export const HistoryMapper = {
  toViewModel(input: { cases: ApiECGCase[]; filters: HistoryVM["filters"]; total: number }): HistoryVM {
    return {
      cases: input.cases.map(CaseMapper.toListItem),
      filters: input.filters,
      total: input.total,
    };
  },
};

export const AnalyticsMapper = {
  toViewModel(input: {
    accuracy?: number | null;
    avgProcessingTimeMs?: number;
    criticalEcgs?: number;
    pendingReviews?: number;
    todaysEcgs?: number;
  }): AnalyticsVM {
    return {
      accuracyLabel: input.accuracy != null ? `${Math.round(input.accuracy * 100)}%` : "Pending",
      avgProcessingLabel: `${input.avgProcessingTimeMs ?? 0} ms`,
      criticalCasesLabel: String(input.criticalEcgs ?? 0),
      pendingReviewsLabel: String(input.pendingReviews ?? 0),
      todaysEcgsLabel: String(input.todaysEcgs ?? 0),
    };
  },
};

export const AuthMapper = {
  toViewModel(input: { email: string; role?: string; token?: string; userId: string; userName: string }): AuthVM {
    return {
      email: input.email,
      isAuthenticated: Boolean(input.token),
      roleBadge: statusPresenter.role(input.role),
      sessionLabel: input.token ? "Active" : "Signed out",
      userId: input.userId,
      userName: input.userName,
    };
  },
};

export const SettingsMapper = {
  toViewModel(input: { locale?: string; notificationsEnabled?: boolean; theme?: string; timezone?: string }): SettingsVM {
    return {
      localeLabel: input.locale ?? "en-US",
      notificationsEnabled: Boolean(input.notificationsEnabled),
      themeLabel: input.theme ?? "system",
      timezoneLabel: input.timezone ?? "UTC",
    };
  },
};

export const UploadMapper = {
  toViewModel(input: {
    fileName: string;
    id: string;
    mimeType: string;
    progress?: number;
    sizeBytes?: number;
    status: string;
  }): UploadVM {
    return {
      fileName: input.fileName,
      id: input.id,
      mimeType: input.mimeType,
      progressLabel: input.progress != null ? `${Math.round(input.progress)}%` : "0%",
      sizeLabel: input.sizeBytes != null ? `${Math.round(input.sizeBytes / 1024)} KB` : "—",
      statusBadge: statusPresenter.uploadStatus(input.status),
    };
  },
};
