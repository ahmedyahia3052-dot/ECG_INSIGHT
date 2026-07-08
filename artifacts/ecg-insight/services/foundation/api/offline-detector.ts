import { foundationEnvironment } from "../config/environment";
import { isFeatureEnabled, FEATURE_FLAGS } from "../config/feature-flags";
import { enterpriseLogger } from "../logging/enterprise-logger";

type OfflineListener = (online: boolean) => void;

class OfflineDetector {
  private listeners = new Set<OfflineListener>();
  private online = typeof navigator !== "undefined" ? navigator.onLine : true;
  private started = false;

  get isOnline() {
    return this.online;
  }

  get isOffline() {
    return !this.online;
  }

  assertOnline() {
    if (!foundationEnvironment.offlineDetectionEnabled) return;
    if (!isFeatureEnabled(FEATURE_FLAGS.offlineQueue)) return;
    if (this.isOffline) {
      throw new Error("NETWORK_OFFLINE");
    }
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.online = navigator.onLine;
    const onOnline = () => this.setOnline(true);
    const onOffline = () => this.setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    enterpriseLogger.info("offline-detector", this.online ? "Network online" : "Network offline");
  }

  subscribe(listener: OfflineListener) {
    this.listeners.add(listener);
    listener(this.online);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setOnline(next: boolean) {
    if (this.online === next) return;
    this.online = next;
    enterpriseLogger.info("offline-detector", next ? "Network restored" : "Network lost");
    this.listeners.forEach((listener) => listener(next));
  }
}

export const offlineDetector = new OfflineDetector();
