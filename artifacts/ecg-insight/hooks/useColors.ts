import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

export type ThemePreference = "dark" | "light" | "system";

const THEME_STORAGE_KEY = "ecg-insight-theme";
const listeners = new Set<(preference: ThemePreference) => void>();
let currentPreference: ThemePreference = "dark";
let loaded = false;

async function loadThemePreference() {
  if (loaded) return;
  loaded = true;
  const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY).catch(() => null);
  if (stored === "dark" || stored === "light" || stored === "system") {
    currentPreference = stored;
    listeners.forEach((listener) => listener(currentPreference));
  }
}

export async function setThemePreference(preference: ThemePreference) {
  currentPreference = preference;
  listeners.forEach((listener) => listener(currentPreference));
  await AsyncStorage.setItem(THEME_STORAGE_KEY, preference).catch(() => {});
}

export function useThemePreference() {
  const [themePreference, setPreference] = useState<ThemePreference>(currentPreference);

  useEffect(() => {
    void loadThemePreference();
    listeners.add(setPreference);
    return () => {
      listeners.delete(setPreference);
    };
  }, []);

  return { setThemePreference, themePreference };
}

/**
 * Returns design tokens for the current color scheme plus radius helpers.
 * Defaults to dark unless the user chooses light or system.
 */
export function useColors() {
  const scheme = useColorScheme();
  const { themePreference } = useThemePreference();
  const resolvedScheme = themePreference === "system" ? (scheme ?? "dark") : themePreference;
  const palette = resolvedScheme === "dark" ? colors.dark : colors.light;
  return { ...palette, gradients: colors.gradients, radius: colors.radius, resolvedScheme, themePreference };
}
