import type { ECGFollowUpStatus, ECGTrendDirection } from "@prisma/client";

export const LONGITUDINAL_TIMELINE_ENGINE_VERSION = "sprint63-ecg-longitudinal-timeline-v1";

export type TimelineEntryDto = {
  id: string;
  patientId: string;
  caseId: string;
  organizationId: string | null;
  branchId: string | null;
  physicianId: string | null;
  studyDate: string;
  acquisitionDate: string;
  reportUuid: string | null;
  diagnosis: string | null;
  interpretation: string | null;
  aiConfidence: number | null;
  heartRate: number | null;
  prInterval: number | null;
  qrsDuration: number | null;
  qtInterval: number | null;
  qtcInterval: number | null;
  axis: number | null;
  rhythm: string | null;
  measurements: unknown;
  attachments: unknown;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type MeasurementDeltaDto = {
  heartRate: number | null;
  prInterval: number | null;
  qrsDuration: number | null;
  qtInterval: number | null;
  qtcInterval: number | null;
  axis: number | null;
};

export type TextDeltaDto = {
  previous: string | null;
  current: string | null;
  changed: boolean;
  summary: string;
};

export type TrendSnapshotDto = {
  trendType: string;
  direction: ECGTrendDirection;
  metric: string | null;
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  threshold: number | null;
  statement: string;
  significance: string | null;
};

export type ComparisonResultDto = {
  patientId: string;
  currentCaseId: string;
  previousCaseId: string;
  measurementDelta: MeasurementDeltaDto & { details: Record<string, { previous: number | null; current: number | null; delta: number | null }> };
  diagnosisDelta: TextDeltaDto;
  interpretationDelta: TextDeltaDto;
  confidenceDelta: { previous: number | null; current: number | null; delta: number | null; summary: string };
  clinicalSignificance: string;
  trendSummary: TrendSnapshotDto[];
  followUpSummary: string;
  comparisonId: string;
  createdAt: string;
};

export type FollowUpDto = {
  id: string;
  patientId: string;
  caseId: string | null;
  timelineId: string | null;
  recommendation: string;
  summary: string | null;
  status: ECGFollowUpStatus;
  dueDate: string | null;
  createdAt: string;
};

export type CaseNavigationDto = {
  caseId: string;
  patientId: string;
  acquisitionDate: string;
  sequenceNumber: number;
  timelineEntry: TimelineEntryDto | null;
};
