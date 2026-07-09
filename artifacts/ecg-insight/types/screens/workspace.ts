import type { ScreenContract } from "./common";

export type WorkspaceScreenData = {
  caseId?: string;
  caseNumber?: string;
  mode: "review" | "workspace";
  patientLabel?: string;
  studyDate?: string;
};

export type WorkspaceScreenActions = {
  onOpenLiveMonitor: (caseId: string) => void;
  onOpenViewer: (caseId: string) => void;
  onResolveCase: (caseId?: string) => void;
};

export type WorkspaceScreenContract = ScreenContract<WorkspaceScreenData, WorkspaceScreenActions>;
