import { useCallback, useMemo, useState } from "react";

import type { AIAnalysisResult } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { ClinicalReport } from "@/services/reports";

import {
  buildCaseTimelineEvents,
  buildClinicalAlerts,
  buildWorkflowSteps,
  canNavigateToStep,
  navigateWorkflowStep,
  workflowProgress,
  type ClinicalWorkflowStepId,
} from "./clinical-workflow";
import type { EcgWorkstationViewMode } from "./types";

type RightPanelTab = "patient" | "measurements" | "ai" | "reports" | "history";

export function useClinicalWorkflowEngine(input: {
  analysis?: AIAnalysisResult | null;
  caseRecord: ApiECGCase;
  clinicalNotes?: string | null;
  currentViewMode: EcgWorkstationViewMode;
  digitizing?: boolean;
  digitalEcg?: DigitalEcg | null;
  exported?: boolean;
  hasCompareStudy?: boolean;
  measurementCount?: number;
  onCompareMode?: (enabled: boolean) => void;
  onFocusPanel?: (tab: RightPanelTab, section?: "notes") => void;
  onOpenReview?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  reports?: ClinicalReport[];
}) {
  const [activeStepId, setActiveStepId] = useState<ClinicalWorkflowStepId | null>(null);

  const context = useMemo(
    () => ({
      analysis: input.analysis,
      caseRecord: input.caseRecord,
      clinicalNotes: input.clinicalNotes,
      currentViewMode: input.currentViewMode,
      digitizing: input.digitizing,
      digitalEcg: input.digitalEcg,
      exported: input.exported,
      hasCompareStudy: input.hasCompareStudy,
      measurementCount: input.measurementCount,
      reports: input.reports,
    }),
    [
      input.analysis,
      input.caseRecord,
      input.clinicalNotes,
      input.currentViewMode,
      input.digitizing,
      input.digitalEcg,
      input.exported,
      input.hasCompareStudy,
      input.measurementCount,
      input.reports,
    ],
  );

  const steps = useMemo(() => buildWorkflowSteps(context), [context]);
  const progress = useMemo(() => workflowProgress(steps), [steps]);
  const currentStep = useMemo(() => steps.find((s) => s.status === "current") ?? steps.find((s) => !s.disabled && s.status !== "complete"), [steps]);
  const timelineEvents = useMemo(() => buildCaseTimelineEvents(context), [context]);
  const alerts = useMemo(() => buildClinicalAlerts(context), [context]);

  const goToStep = useCallback(
    (id: ClinicalWorkflowStepId) => {
      const step = steps.find((s) => s.id === id);
      if (!step || !canNavigateToStep(step)) return false;
      setActiveStepId(id);
      const nav = navigateWorkflowStep(id);
      if (nav.patientTab) input.onFocusPanel?.("patient");
      if (nav.notesTab) input.onFocusPanel?.("patient", "notes");
      if (nav.measurementsTab) input.onFocusPanel?.("measurements");
      if (nav.aiTab) input.onFocusPanel?.("ai");
      if (nav.historyTab) input.onFocusPanel?.("history");
      if (nav.reportsTab) input.onFocusPanel?.("reports");
      if (nav.compareMode) input.onCompareMode?.(true);
      if (nav.openReview) input.onOpenReview?.();
      if (nav.viewMode) input.onViewModeChange?.(nav.viewMode);
      return true;
    },
    [input, steps],
  );

  return {
    activeStepId,
    alerts,
    currentStep,
    goToStep,
    progress,
    steps,
    timelineEvents,
  };
}

export type ClinicalWorkflowEngine = ReturnType<typeof useClinicalWorkflowEngine>;
