import { useEffect } from "react";
import { Platform } from "react-native";

import type { EcgLiveMonitorEngine } from "./useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "./useEcgViewerControls";

export function useEcgLiveMonitorShortcuts({
  controls,
  enabled = true,
  engine,
  onExitMonitor,
}: {
  controls: EcgViewerControls;
  enabled?: boolean;
  engine: EcgLiveMonitorEngine;
  onExitMonitor: () => void;
}) {
  useEffect(() => {
    if (!enabled || Platform.OS !== "web" || typeof window === "undefined") return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          engine.togglePlay();
          break;
        case "f":
        case "F":
          event.preventDefault();
          engine.setFrozen(!engine.frozen);
          break;
        case "r":
        case "R":
          event.preventDefault();
          engine.toggleRecord();
          break;
        case "l":
        case "L":
          event.preventDefault();
          engine.setLoop(!engine.loop);
          break;
        case "Escape":
          event.preventDefault();
          onExitMonitor();
          break;
        case "+":
        case "=":
          event.preventDefault();
          controls.zoomBy(1);
          break;
        case "-":
        case "_":
          event.preventDefault();
          controls.zoomBy(-1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          engine.frameStepBackward();
          break;
        case "ArrowRight":
          event.preventDefault();
          engine.frameStepForward();
          break;
        case "ArrowUp":
          event.preventDefault();
          controls.cycleGain();
          break;
        case "ArrowDown":
          event.preventDefault();
          controls.cycleGain();
          break;
        case "Home":
          event.preventDefault();
          engine.jumpToStart();
          break;
        case "End":
          event.preventDefault();
          engine.jumpToEnd();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controls, enabled, engine, onExitMonitor]);
}
