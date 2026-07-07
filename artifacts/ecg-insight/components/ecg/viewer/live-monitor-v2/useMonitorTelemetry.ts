import { useEffect, useState } from "react";
import { Platform } from "react-native";

export type MonitorTelemetry = {
  batteryLevel: number | null;
  batteryStatus: "charging" | "full" | "normal" | "unknown";
  clock: string;
  connection: "offline" | "online" | "unknown";
};

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function useMonitorTelemetry(tickMs = 1000): MonitorTelemetry {
  const [telemetry, setTelemetry] = useState<MonitorTelemetry>({
    batteryLevel: null,
    batteryStatus: "unknown",
    clock: formatClock(new Date()),
    connection: Platform.OS === "web" && typeof navigator !== "undefined" && navigator.onLine ? "online" : "unknown",
  });

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

    const onOnline = () => setTelemetry((p) => ({ ...p, connection: "online" }));
    const onOffline = () => setTelemetry((p) => ({ ...p, connection: "offline" }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const clockTimer = window.setInterval(() => {
      setTelemetry((p) => ({ ...p, clock: formatClock(new Date()) }));
    }, tickMs);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(clockTimer);
    };
  }, [tickMs]);

  return telemetry;
}
