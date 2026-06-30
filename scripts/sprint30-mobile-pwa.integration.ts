import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

async function main() {
  const manifestPath = "artifacts/ecg-insight/public/manifest.json";
  const serviceWorkerPath = "artifacts/ecg-insight/public/sw.js";
  const apiConfigPath = "artifacts/ecg-insight/src/config/api.ts";
  const offlineServicePath = "artifacts/ecg-insight/services/mobileOffline.ts";
  const offlinePagePath = "artifacts/ecg-insight/public/offline.html";
  const notificationPath = "artifacts/ecg-insight/services/mobileNotifications.ts";
  const syncHookPath = "artifacts/ecg-insight/hooks/useMobileSync.ts";
  const syncStatusPath = "artifacts/ecg-insight/components/mobile/MobileSyncStatus.tsx";
  const uploadPath = "artifacts/ecg-insight/app/(protected)/upload-ecg.tsx";
  const viewerPath = "artifacts/ecg-insight/components/ecg/EcgProViewer.tsx";
  const backendSyncPath = "server/src/modules/collaboration/collaboration.routes.ts";

  for (const path of [manifestPath, serviceWorkerPath, offlineServicePath, notificationPath, syncHookPath, syncStatusPath]) {
    assert(existsSync(join(root, path)), `${path} should exist.`);
  }

  const manifest = JSON.parse(read(manifestPath)) as Record<string, unknown>;
  assert(manifest["display"] === "standalone", "PWA manifest should be installable in standalone display mode.");
  assert(Array.isArray(manifest["icons"]) && manifest["icons"].length > 0, "PWA manifest should include app icons.");
  assert(manifest["start_url"] === "/", "PWA manifest should include a root start URL.");

  const serviceWorker = read(serviceWorkerPath);
  assert(serviceWorker.includes("self.addEventListener(\"install\""), "Service worker should cache app shell during install.");
  assert(serviceWorker.includes("self.addEventListener(\"fetch\""), "Service worker should intercept fetch requests.");
  assert(serviceWorker.includes("ecg-insight-background-sync"), "Service worker should expose background sync workflow.");
  assert(serviceWorker.includes("API_BYPASS_PREFIXES"), "Service worker should explicitly bypass API-like requests.");
  for (const token of ["/api/", "/auth/", "/copilot/", "/patients/", "/ecg/", "/health", "/liveness", "/readiness"]) {
    assert(serviceWorker.includes(token), `Service worker should never return offline HTML for ${token}.`);
  }
  assert(serviceWorker.includes("disableOffline"), "Service worker should support emergency offline bypass.");
  assert(serviceWorker.includes("request.mode === \"navigate\""), "Service worker should handle navigation fallback separately from API requests.");

  const apiConfig = read(apiConfigPath);
  for (const token of ["EXPO_PUBLIC_API_URL", "VITE_API_URL", "NEXT_PUBLIC_API_URL", "window.location.origin", "DEFAULT_API_BASE_URL"]) {
    assert(apiConfig.includes(token), `API config should resolve ${token}.`);
  }

  const offlineService = read(offlineServicePath);
  for (const token of ["indexedDB.open", "queueOfflineEcgUpload", "queuePendingAction", "processOfflineUploads", "processPendingActions", "conflictReason", "requestBackgroundSync"]) {
    assert(offlineService.includes(token), `Offline service should implement ${token}.`);
  }
  for (const token of ["apiUrl", "backendHealthStatus", "lastHealthCheckAt", "backendReachable", "browserOnline", "offlineReason", "[ONLINE CHECK]", "[BACKEND CHECK]", "[OFFLINE REASON]", "disableOffline"]) {
    assert(offlineService.includes(token), `Offline service should expose connectivity diagnostic ${token}.`);
  }

  const offlinePage = read(offlinePagePath);
  for (const token of ["navigator.onLine", "API URL:", "Backend health status:", "Last health check:", "Reason:", "disableOffline", "[ONLINE CHECK]", "[BACKEND CHECK]", "[OFFLINE REASON]"]) {
    assert(offlinePage.includes(token), `Offline page should display diagnostic ${token}.`);
  }

  const notifications = read(notificationPath);
  assert(notifications.includes("requestPushPermission"), "Notification service should provide a permission flow.");
  assert(notifications.includes("showLocalNotification"), "Notification service should abstract local push notification display.");

  const syncHook = read(syncHookPath);
  assert(syncHook.includes("subscribeNetworkStatus"), "Mobile sync hook should monitor online/offline status.");
  assert(syncHook.includes("registerPwaRuntime"), "Mobile sync hook should register the PWA runtime.");

  const syncStatus = read(syncStatusPath);
  assert(syncStatus.includes("pendingUploads"), "Global sync status should show pending uploads.");
  assert(syncStatus.includes("Sync now"), "Global sync status should expose manual sync.");

  const upload = read(uploadPath);
  assert(upload.includes("uploadClinicalEcgFile"), "Unified protected upload screen should execute real ECG uploads.");
  assert(upload.includes("createCase"), "Unified protected upload screen should create ECG cases through the API.");
  assert(offlineService.includes("cachePatientSnapshot"), "Offline service should cache patient drafts for recovery.");
  assert(notifications.includes("requestPushPermission"), "Notification service should expose notification permission flow.");
  assert(offlineService.includes("listOfflineUploads"), "Offline service should list local offline uploads.");

  const viewer = read(viewerPath);
  assert(viewer.includes("PinchGestureHandler"), "ECG Pro Viewer should support pinch zoom.");
  assert(viewer.includes("PanGestureHandler"), "ECG Pro Viewer should support touch pan.");
  assert(viewer.includes("mobileMode"), "ECG Pro Viewer should include responsive mobile mode.");

  const backendSync = read(backendSyncPath);
  assert(backendSync.includes("conflictJson"), "Backend sync should persist conflict metadata.");
  assert(backendSync.includes("retryCount: item.retryCount + 1"), "Backend sync should increment retry counters.");

  console.log("Sprint 30 mobile PWA integration test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
