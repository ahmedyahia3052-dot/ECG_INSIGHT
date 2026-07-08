import type { MedicalTheme } from "@/theme/medicalTheme";

export type UiThemeId = "dark" | "hospital" | "light" | "system";

export type UiThemePalette = Record<string, string>;

export type UiThemeDefinition = {
  clinical: MedicalTheme;
  gradients: Record<string, string[]>;
  id: UiThemeId;
  label: string;
  palette: UiThemePalette;
  radius: Record<string, number>;
};

export type ThemeEngineContextValue = {
  resolvedTheme: UiThemeDefinition;
  resolvedThemeId: Exclude<UiThemeId, "system">;
  setThemeId: (themeId: UiThemeId) => void;
  themeId: UiThemeId;
};
