import React, { createContext, useContext, useMemo, useState } from "react";

import { setThemePreference, useColors, type ThemePreference } from "@/hooks/useColors";
import { resolveTheme } from "../themes/registry";
import type { ThemeEngineContextValue, UiThemeId } from "./types";

const ThemeEngineContext = createContext<ThemeEngineContextValue | null>(null);

function toPreference(themeId: UiThemeId): ThemePreference {
  if (themeId === "light") return "light";
  if (themeId === "system") return "system";
  return "dark";
}

type Props = {
  children: React.ReactNode;
};

export function ThemeEngineProvider({ children }: Props) {
  const colors = useColors();
  const [hospitalMode, setHospitalMode] = useState(false);

  const themeId: UiThemeId = hospitalMode
    ? "hospital"
    : colors.themePreference === "system"
      ? "system"
      : colors.themePreference;

  const resolvedThemeId = hospitalMode ? "hospital" : colors.resolvedScheme;
  const resolvedTheme = useMemo(() => resolveTheme(resolvedThemeId), [resolvedThemeId]);

  const setThemeId = (nextThemeId: UiThemeId) => {
    if (nextThemeId === "hospital") {
      setHospitalMode(true);
      return;
    }
    setHospitalMode(false);
    void setThemePreference(toPreference(nextThemeId));
  };

  const value = useMemo<ThemeEngineContextValue>(
    () => ({
      resolvedTheme,
      resolvedThemeId,
      setThemeId,
      themeId,
    }),
    [resolvedTheme, resolvedThemeId, themeId],
  );

  return <ThemeEngineContext.Provider value={value}>{children}</ThemeEngineContext.Provider>;
}

export function useThemeEngine() {
  const context = useContext(ThemeEngineContext);
  if (!context) {
    throw new Error("useThemeEngine must be used within ThemeEngineProvider.");
  }
  return context;
}

export function useOptionalThemeEngine() {
  return useContext(ThemeEngineContext);
}
