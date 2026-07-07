import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export type DiagnosticLayoutSnapshot = {
  leftCollapsed: boolean;
  leftSize?: number;
  rightCollapsed: boolean;
  rightSize?: number;
  scrollY?: number;
};

/** Sprint 31 — true diagnostic mode: fullscreen viewer, layout restore on exit. */
export function useEcgDiagnosticMode() {
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const snapshotRef = useRef<DiagnosticLayoutSnapshot | null>(null);

  const enterDiagnostic = useCallback((snapshot?: DiagnosticLayoutSnapshot) => {
    if (snapshot) snapshotRef.current = snapshot;
    setDiagnosticMode(true);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const root = document.documentElement;
      root.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  const popLayoutSnapshot = useCallback((): DiagnosticLayoutSnapshot | null => {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    return snapshot;
  }, []);

  const exitDiagnostic = useCallback(() => {
    setDiagnosticMode(false);
    if (Platform.OS === "web" && typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => undefined);
    }
  }, []);

  const toggleDiagnostic = useCallback(
    (snapshot?: DiagnosticLayoutSnapshot) => {
      setDiagnosticMode((value) => {
        if (value) {
          if (Platform.OS === "web" && typeof document !== "undefined" && document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => undefined);
          }
          return false;
        }
        if (snapshot) snapshotRef.current = snapshot;
        if (Platform.OS === "web" && typeof document !== "undefined") {
          document.documentElement.requestFullscreen?.().catch(() => undefined);
        }
        return true;
      });
    },
    [],
  );

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
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleDiagnostic]);

  return {
    diagnosticMode,
    enterDiagnostic,
    exitDiagnostic,
    layoutSnapshot: snapshotRef.current,
    popLayoutSnapshot,
    toggleDiagnostic,
  };
}
