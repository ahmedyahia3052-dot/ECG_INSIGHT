import { useReducedMotion } from "./useReducedMotion";

export function useAccessibilityPreferences() {
  const reducedMotion = useReducedMotion();
  return {
    highContrast: false,
    reducedMotion,
  };
}
