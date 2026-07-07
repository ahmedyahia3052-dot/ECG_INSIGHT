import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { API_ROOT_URL } from "@/services/api";

export type MonitorTelemetry = {
  batteryLevel: number | null;
  batteryStatus: "charging" | "full" | "normal" | "unknown";
  clock: string;
  connection: "offline" | "online" | "unknown";
};

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

async function probeBackendLive() {
  if (typeof fetch === "undefined") return true;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${API_ROOT_URL}/live`, {
        cache: "no-store",
        credentials: "include",
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        const payload = (await response.json()) as { ok?: boolean };
        if (payload.ok === true) return true;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  return false;
}

export function useMonitorTelemetry(tickMs = 1000): MonitorTelemetry {
  const [telemetry, setTelemetry] = useState<MonitorTelemetry>({
    batteryLevel: null,
    batteryStatus: "unknown",
    clock: formatClock(new Date()),
    connection: Platform.OS === "web" && typeof navigator !== "undefined" && navigator.onLine ? "online" : "unknown",
  });
  const offlineStreakRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    let battery: { level: number; charging: boolean } | null = null;
    const updateBattery = () => {
      if (!battery) return;
      setTelemetry((prev) => ({
        ...prev,
        batteryLevel: Math.round(battery!.level * 100),
        batteryStatus: battery!.charging ? "charging" : battery!.level >= 0.98 ? "full" : "normal",
      }));
    };

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ addEventListener: (e: string, fn: () => void) => void; charging: boolean; level: number }>;
    };

    nav.getBattery?.().then((b) => {
      battery = b;
      updateBattery();
      b.addEventListener("levelchange", updateBattery);
      b.addEventListener("chargingchange", updateBattery);
    }).catch(() => undefined);

    const setConnection = (online: boolean) => {
      if (online) {
        offlineStreakRef.current = 0;
        setTelemetry((p) => ({ ...p, connection: "online" }));
        return;
      }
      offlineStreakRef.current += 1;
      if (offlineStreakRef.current >= 2) {
        setTelemetry((p) => ({ ...p, connection: "offline" }));
      }
    };

    const onOnline = () => {
      void probeBackendLive().then((ok) => setConnection(ok));
    };
    const onOffline = () => setConnection(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const clockTimer = window.setInterval(() => {
      setTelemetry((p) => ({ ...p, clock: formatClock(new Date()) }));
    }, tickMs);

    const healthTimer = window.setInterval(() => {
      void probeBackendLive().then((ok) => setConnection(ok));
    }, 12_000);

    void probeBackendLive().then((ok) => setConnection(ok));

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(clockTimer);
      window.clearInterval(healthTimer);
    };
  }, [tickMs]);

  return telemetry;
}
