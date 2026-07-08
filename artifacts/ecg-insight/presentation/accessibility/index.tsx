/**
 * Sprint 78 — Accessibility layer (presentation concerns only).
 */

import React, { createContext, useContext, useMemo } from "react";
import { AccessibilityInfo, View } from "react-native";

export type AccessibilityPreferences = {
  boldText: boolean;
  reduceMotion: boolean;
  screenReaderEnabled: boolean;
};

export type AccessibilityLayerValue = AccessibilityPreferences & {
  announce: (message: string) => void;
};

const AccessibilityLayerContext = createContext<AccessibilityLayerValue | null>(null);

export function AccessibilityLayerProvider({
  children,
  preferences,
}: {
  children: React.ReactNode;
  preferences?: Partial<AccessibilityPreferences>;
}) {
  const value = useMemo<AccessibilityLayerValue>(
    () => ({
      announce: (message: string) => {
        AccessibilityInfo.announceForAccessibility(message);
      },
      boldText: preferences?.boldText ?? false,
      reduceMotion: preferences?.reduceMotion ?? false,
      screenReaderEnabled: preferences?.screenReaderEnabled ?? false,
    }),
    [preferences?.boldText, preferences?.reduceMotion, preferences?.screenReaderEnabled],
  );

  return (
    <AccessibilityLayerContext.Provider value={value}>
      {children}
      <View
        accessibilityLiveRegion="polite"
        importantForAccessibility="no-hide-descendants"
        style={{ height: 1, opacity: 0, position: "absolute", width: 1 }}
      />
    </AccessibilityLayerContext.Provider>
  );
}

export function useAccessibilityLayer() {
  const ctx = useContext(AccessibilityLayerContext);
  if (!ctx) throw new Error("useAccessibilityLayer requires AccessibilityLayerProvider");
  return ctx;
}

export const accessibilityRoles = {
  button: "button",
  header: "header",
  image: "image",
  link: "link",
  main: "main",
  navigation: "navigation",
  summary: "summary",
} as const;
