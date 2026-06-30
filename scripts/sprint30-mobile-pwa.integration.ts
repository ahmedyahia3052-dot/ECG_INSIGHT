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
  const offlineServicePath = "artifacts/ecg-insight/services/mobileOffline.ts";
  const notificationPath = "artifacts/ecg-insight/services/mobileNotifications.ts";
  const syncHookPath = "artifacts/ecg-insight/hooks/useMobileSync.ts";
  const syncStatusPath = "artifacts/ecg-insight/components/mobile/MobileSyncStatus.tsx";
  const uploadPath = "artifacts/ecg-insight/app/(protected)/upload-ecg.tsx";
  const viewerPath = "artifacts/ecg-insight/components/ecg/EcgProViewer.tsx";
  const backendSyncPath = "server/src/modules/collaboration/collaboration.routes.ts";

  for (const path of [manifestPath, offlineServicePath, notificationPath, syncHookPath, syncStatusPath]) {
    assert(existsSync(join(root, path)), `${path} should exist.`);
  }

  assert(!existsSync(join(root, "artifacts/ecg-insight/public/offline.html")), "offline.html must be removed.");
  assert(!existsSync(join(root, "artifacts/ecg-insight/public/sw.js")), "sw.js must be removed.");

  const manifest = JSON.parse(read(manifestPath)) as Record<string, unknown>;
  assert(manifest["display"] === "standalone", "PWA manifest should be installable in standalone display mode.");
  assert(Array.isArray(manifest["icons"]) && manifest["icons"].length > 0, "PWA manifest should include app icons.");
  assert(manifest["start_url"] === "/", "PWA manifest should include a root start URL.");

  const offlineService = read(offlineServicePath);
  for (const token of ["indexedDB.open", "queueOfflineEcgUpload", "queuePendingAction", "processOfflineUploads", "processPendingActions", "conflictReason", "backendHealthCheck", "removeOfflineRuntime"]) {
    assert(offlineService.includes(token), `Sync service should implement ${token}.`);
  }
  for (const token of ["apiUrl", "backendHealthStatus", "lastHealthCheckAt", "backendReachable"]) {
    assert(offlineService.includes(token), `Sync service should expose connectivity diagnostic ${token}.`);
  }
  for (const removed of ["registerPwaRuntime", "subscribeNetworkStatus", "navigator.onLine", "offlineReason", "disableOffline", "offline.html"]) {
    assert(!offlineService.includes(removed), `Offline mode artifact must be removed: ${removed}`);
  }

  const notifications = read(notificationPath);
  assert(notifications.includes("requestPushPermission"), "Notification service should provide a permission flow.");
  assert(notifications.includes("showLocalNotification"), "Notification service should abstract local push notification display.");
  assert(!notifications.includes("serviceWorker"), "Notification service must not depend on service workers.");

  const syncHook = read(syncHookPath);
  assert(syncHook.includes("removeOfflineRuntime"), "Mobile sync hook should remove legacy offline runtime on startup.");
  assert(syncHook.includes("mobileSyncSnapshot"), "Mobile sync hook should refresh backend health snapshot.");
  assert(!syncHook.includes("registerPwaRuntime"), "Service worker registration must be removed.");
  assert(!syncHook.includes("subscribeNetworkStatus"), "Online/offline subscription must be removed.");

  const syncStatus = read(syncStatusPath);
  assert(syncStatus.includes("pendingUploads"), "Global sync status should show pending uploads.");
  assert(syncStatus.includes("Sync now"), "Global sync status should expose manual sync.");
  assert(syncStatus.includes("Connection lost. Some features may be unavailable."), "Backend failures must toast without redirecting offline.");
  assert(!syncStatus.includes("wifi-off"), "Offline mode UI must be removed.");

  const upload = read(uploadPath);
  assert(upload.includes("uploadClinicalEcgFile"), "Unified protected upload screen should execute real ECG uploads.");
  assert(upload.includes("createCase"), "Unified protected upload screen should create ECG cases through the API.");
  assert(offlineService.includes("cachePatientSnapshot"), "Sync service should cache patient drafts for recovery.");
  assert(notifications.includes("requestPushPermission"), "Notification service should expose notification permission flow.");
  assert(offlineService.includes("listOfflineUploads"), "Sync service should list local queued uploads.");

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
