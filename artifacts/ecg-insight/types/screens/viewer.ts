import type { ScreenContract } from "./common";

export type ViewerScreenData = {
  caseId?: string;
  compareEnabled: boolean;
  imageUrl?: string;
  studyLabel?: string;
};

export type ViewerScreenActions = {
  onCompareToggle: () => void;
  onExport: () => void;
  onOpenCase: (caseId: string) => void;
  onSnapshot: () => void;
};

export type ViewerScreenContract = ScreenContract<ViewerScreenData, ViewerScreenActions>;
