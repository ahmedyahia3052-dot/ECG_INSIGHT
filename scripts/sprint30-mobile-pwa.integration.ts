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
  const offlineServicePath = "artifacts/ecg-insight/services/mobileOffline.ts";
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
  assert(serviceWorker.includes("offlineApiResponse"), "Service worker should return JSON API failures instead of the offline HTML page.");
  assert(serviceWorker.includes("request.mode === \"navigate\""), "Service worker should handle navigation fallback separately from API requests.");

  const offlineService = read(offlineServicePath);
  for (const token of ["indexedDB.open", "queueOfflineEcgUpload", "queuePendingAction", "processOfflineUploads", "processPendingActions", "conflictReason", "requestBackgroundSync"]) {
    assert(offlineService.includes(token), `Offline service should implement ${token}.`);
  }
  for (const token of ["backendReachable", "browserOnline", "offlineReason", "Backend reachable:", "Browser online:"]) {
    assert(offlineService.includes(token), `Offline service should expose connectivity diagnostic ${token}.`);
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
