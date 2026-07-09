import type { EcgCaseListItemView } from "@/types/clinical";

import type { ScreenContract } from "./common";

export type HistoryScreenData = {
  cases: EcgCaseListItemView[];
  filters: {
    query: string;
    severity: string;
    status: string;
  };
  total: number;
};

export type HistoryScreenActions = {
  onAnalyze: (caseId: string) => void;
  onApprove: (caseId: string) => void;
  onOpenCase: (caseId: string) => void;
  onProcess: (caseId: string) => void;
  onReject: (caseId: string) => void;
  onReport: (caseId: string) => void;
  onSetQuery: (value: string) => void;
  onSetSeverity: (value: string) => void;
  onSetStatus: (value: string) => void;
};

export type HistoryScreenContract = ScreenContract<HistoryScreenData, HistoryScreenActions>;
