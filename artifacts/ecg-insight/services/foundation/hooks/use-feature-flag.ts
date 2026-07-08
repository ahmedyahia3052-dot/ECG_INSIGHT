import { isFeatureEnabled, type FeatureFlagKey } from "../config/feature-flags";

export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  return isFeatureEnabled(flag);
}
