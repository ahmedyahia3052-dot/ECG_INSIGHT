import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";

export type EcgSeverity = "normal" | "abnormal" | "critical";

interface VisualExperienceSettings {
  animatedBackgrounds: boolean;
  haptics: boolean;
  motionEffects: boolean;
  notificationSounds: boolean;
}

interface VisualExperienceContextType {
  effectiveMotionEnabled: boolean;
  reducedMotionEnabled: boolean;
  severity: EcgSeverity;
  settings: VisualExperienceSettings;
  setSeverity: (severity: EcgSeverity) => void;
  triggerHaptic: (type?: "error" | "selection" | "success" | "upload" | "warning") => Promise<void>;
  updateSettings: (patch: Partial<VisualExperienceSettings>) => Promise<void>;
}

const STORAGE_KEY = "ecg-insight-visual-experience";
const defaultSettings: VisualExperienceSettings = {
  animatedBackgrounds: true,
  haptics: true,
  motionEffects: true,
  notificationSounds: false,
};

const VisualExperienceContext = createContext<VisualExperienceContextType>({
  effectiveMotionEnabled: true,
  reducedMotionEnabled: false,
  severity: "normal",
  settings: defaultSettings,
  setSeverity: () => {},
  triggerHaptic: async () => {},
  updateSettings: async () => {},
});

export function severityAccent(severity: EcgSeverity) {
  if (severity === "critical") return "#EF4444";
  if (severity === "abnormal") return "#F59E0B";
  return "#00E5FF";
}

export function VisualExperienceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [severity, setSeverity] = useState<EcgSeverity>("normal");
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotionEnabled).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotionEnabled);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback(async (patch: Partial<VisualExperienceSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, [settings]);

  const triggerHaptic = useCallback(
    async (type: "error" | "selection" | "success" | "upload" | "warning" = "selection") => {
      if (!settings.haptics) return;
      if (type === "success" || type === "upload") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        return;
      }
      if (type === "error") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }
      if (type === "warning") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }
      await Haptics.selectionAsync().catch(() => {});
    },
    [settings.haptics],
  );

  const value = useMemo(
    () => ({
      effectiveMotionEnabled: settings.motionEffects && !reducedMotionEnabled,
      reducedMotionEnabled,
      severity,
      settings,
      setSeverity,
      triggerHaptic,
      updateSettings,
    }),
    [reducedMotionEnabled, settings, severity, triggerHaptic, updateSettings],
  );

  return <VisualExperienceContext.Provider value={value}>{children}</VisualExperienceContext.Provider>;
}

export function useVisualExperience() {
  return useContext(VisualExperienceContext);
}

