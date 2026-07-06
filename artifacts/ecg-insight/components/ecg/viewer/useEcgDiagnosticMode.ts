import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

/** Sprint 29 — fullscreen diagnostic / zero-chrome mode (F11 toggle, ESC exit). */
export function useEcgDiagnosticMode() {
  const [diagnosticMode, setDiagnosticMode] = useState(false);

  const enterDiagnostic = useCallback(() => setDiagnosticMode(true), []);
  const exitDiagnostic = useCallback(() => setDiagnosticMode(false), []);
  const toggleDiagnostic = useCallback(() => setDiagnosticMode((value) => !value), []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;

      if (event.key === "F11") {
        event.preventDefault();
        toggleDiagnostic();
        return;
      }
      if (event.key === "Escape" && diagnosticMode) {
        event.preventDefault();
        exitDiagnostic();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [diagnosticMode, exitDiagnostic, toggleDiagnostic]);

  return { diagnosticMode, enterDiagnostic, exitDiagnostic, toggleDiagnostic };
}
