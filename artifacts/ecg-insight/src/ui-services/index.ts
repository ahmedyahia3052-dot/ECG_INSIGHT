import { Alert, Platform } from "react-native";

import { isFeatureEnabled, type FeatureFlagKey } from "../core/feature-flags";

export const navigationService = {
  goBack(router: { back: () => void }) {
    router.back();
  },
  push(router: { push: (href: string) => void }, href: string) {
    router.push(href as never);
  },
  replace(router: { replace: (href: string) => void }, href: string) {
    router.replace(href as never);
  },
};

export const toastService = {
  show(message: string, title = "ECG Insight") {
    if (Platform.OS === "web") {
      console.info(`[toast] ${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  },
};

export const dialogService = {
  confirm(message: string, title = "Confirm") {
    return new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { onPress: () => resolve(false), style: "cancel", text: "Cancel" },
        { onPress: () => resolve(true), text: "OK" },
      ]);
    });
  },
};

export const themeService = {
  getMode(): "dark" | "light" | "system" {
    return "system";
  },
};

export const permissionService = {
  can(role: string | undefined, permission: string) {
    if (!role) return false;
    if (role === "super_admin" || role === "owner") return true;
    if (permission === "view_cases") return ["doctor", "admin", "technician"].includes(role);
    return false;
  },
};

export const featureFlagService = {
  isEnabled(key: FeatureFlagKey, context?: { developer?: boolean; enterprise?: boolean }) {
    return isFeatureEnabled(key, context);
  },
};

export const downloadService = {
  downloadUrl(url: string, filename: string) {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  },
};

export const exportService = {
  exportJson(filename: string, payload: unknown) {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadService.downloadUrl(url, filename);
    URL.revokeObjectURL(url);
  },
};

export const printService = {
  printUrl(url: string) {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    opened?.addEventListener("load", () => opened.print(), { once: true });
  },
};

export const clipboardService = {
  async copy(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  },
};
