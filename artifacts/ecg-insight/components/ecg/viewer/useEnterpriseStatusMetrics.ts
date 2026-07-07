import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { API_URL } from "@/services/api";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

type MemoryInfo = {
  jsHeapMb?: number;
  jsHeapLimitMb?: number;
};

export type EnterpriseStatusMetrics = {
  aiStatus: string;
  backendStatus: "healthy" | "offline" | "checking";
  cpuUsage: number;
  gpuRenderer: string;
  memory: MemoryInfo;
  renderTimeMs: number;
  transport: string;
};

const DEFAULT_METRICS: EnterpriseStatusMetrics = {
  aiStatus: "Idle",
  backendStatus: "checking",
  cpuUsage: 0,
  gpuRenderer: Platform.OS === "web" ? "Canvas 2D" : "Native",
  memory: {},
  renderTimeMs: 0,
  transport: "REST",
};

/** Sprint 31 — throttled status metrics (max 2 updates/sec). */
export function useEnterpriseStatusMetrics(input: {
  aiOverlayEnabled?: boolean;
  annotationCount?: number;
  viewMode?: string;
}) {
  const [metrics, setMetrics] = useState<EnterpriseStatusMetrics>(DEFAULT_METRICS);
  const latestRef = useRef<Partial<EnterpriseStatusMetrics>>({});
  const lastPublishRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    let frame = 0;
    let last = performance.now();
    const interval = ECG_WORKSTATION_VISUAL.statusBarUpdateIntervalMs;

    const publish = (now: number) => {
      if (now - lastPublishRef.current < interval) return;
      lastPublishRef.current = now;
      setMetrics((current) => ({ ...current, ...latestRef.current }));
    };

    const tick = () => {
      const now = performance.now();
      const renderTimeMs = Math.round(now - last);
      last = now;

      const perf = performance as Performance & {
        memory?: { jsHeapSizeLimit: number; usedJSHeapSize: number };
      };

      latestRef.current = {
        aiStatus: input.aiOverlayEnabled
          ? `Active (${input.annotationCount ?? 0})`
          : input.viewMode === "overlay"
            ? "Review"
            : "Idle",
        cpuUsage: Math.min(100, Math.max(0, Math.round((renderTimeMs / 16.7) * 100))),
        gpuRenderer: input.viewMode === "monitor" ? "Canvas 2D GPU" : "Canvas/SVG",
        memory: perf.memory
          ? {
              jsHeapLimitMb: Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024),
              jsHeapMb: Math.round(perf.memory.usedJSHeapSize / 1024 / 1024),
            }
          : metrics.memory,
        renderTimeMs,
      };
      publish(now);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [input.aiOverlayEnabled, input.annotationCount, input.viewMode, metrics.memory]);

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    let active = true;
    const origin = API_URL.replace(/\/api$/, "");

    const poll = async () => {
      try {
        const response = await fetch(`${origin}/live`, { cache: "no-store" });
        if (!active) return;
        setMetrics((current) => ({ ...current, backendStatus: response.ok ? "healthy" : "offline" }));
      } catch {
        if (active) setMetrics((current) => ({ ...current, backendStatus: "offline" }));
      }
    };

    void poll();
    const timer = window.setInterval(poll, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return metrics;
}
