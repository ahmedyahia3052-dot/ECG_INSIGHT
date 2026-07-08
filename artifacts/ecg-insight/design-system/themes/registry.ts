import appColors from "@/constants/colors";
import { medicalTheme } from "@/theme/medicalTheme";

import type { UiThemeDefinition, UiThemeId } from "../theme-engine/types";

/** Application light theme — mirrors existing `constants/colors` light palette. */
export const lightTheme: UiThemeDefinition = {
  id: "light",
  label: "Light",
  palette: appColors.light,
  clinical: medicalTheme,
  gradients: appColors.gradients,
  radius: appColors.radius,
};

/** Application dark theme — mirrors existing dark palette + medical shell. */
export const darkTheme: UiThemeDefinition = {
  id: "dark",
  label: "Dark",
  palette: appColors.dark,
  clinical: medicalTheme,
  gradients: appColors.gradients,
  radius: appColors.radius,
};

/** Hospital / clinical workstation theme — phosphor-green enterprise chrome. */
export const hospitalTheme: UiThemeDefinition = {
  id: "hospital",
  label: "Hospital",
  palette: appColors.dark,
  clinical: medicalTheme,
  gradients: appColors.gradients,
  radius: appColors.radius,
};

export const themeRegistry: Record<UiThemeId, UiThemeDefinition> = {
  dark: darkTheme,
  hospital: hospitalTheme,
  light: lightTheme,
  system: darkTheme,
};

export function resolveTheme(themeId: UiThemeId): UiThemeDefinition {
  return themeRegistry[themeId] ?? darkTheme;
}
