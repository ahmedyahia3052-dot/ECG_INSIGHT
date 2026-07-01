import type { ToolPlan } from "./types";

// Legacy shim — tool orchestration is handled inside Clinical AI Core V2 pipeline.
export const ToolOrchestrator = {
  buildPlan(): ToolPlan {
    throw new Error("ToolOrchestrator is deprecated in Clinical AI Core V2. Use runClinicalCopilotEngine.");
  },
};
