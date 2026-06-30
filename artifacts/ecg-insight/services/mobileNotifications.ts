export type PushPermissionState = "denied" | "default" | "granted" | "unsupported";

export interface PushPermissionSnapshot {
  permission: PushPermissionState;
  supported: boolean;
}

export function pushPermissionSnapshot(): PushPermissionSnapshot {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return { permission: "unsupported", supported: false };
  }
  return { permission: Notification.permission as PushPermissionState, supported: true };
}

export async function requestPushPermission() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return pushPermissionSnapshot();
  }
  const permission = await Notification.requestPermission();
  return { permission: permission as PushPermissionState, supported: true };
}

export async function showLocalNotification(title: string, options: NotificationOptions = {}) {
  const snapshot = pushPermissionSnapshot();
  if (!snapshot.supported || snapshot.permission !== "granted") return false;
  new Notification(title, {
    badge: "/icons/pwa-icon.svg",
    icon: "/icons/pwa-icon.svg",
    ...options,
  });
  return true;
}
