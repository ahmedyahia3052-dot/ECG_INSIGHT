import { medicalTheme } from "@/theme/medicalTheme";
import appColors from "@/constants/colors";

import type { UiThemeDefinition } from "../theme-engine/types";

/** Organization branding overlay — extends hospital chrome with org accent. */
export const organizationBrandingTheme: UiThemeDefinition = {
  id: "hospital",
  label: "Organization",
  palette: appColors.dark,
  clinical: {
    ...medicalTheme,
    primary: "#00E5FF",
    primaryDark: "#0891B2",
  },
  gradients: appColors.gradients,
  radius: appColors.radius,
};

/** Developer diagnostics theme — high-contrast cyan on deep navy. */
export const developerTheme: UiThemeDefinition = {
  id: "dark",
  label: "Developer",
  palette: appColors.dark,
  clinical: {
    ...medicalTheme,
    background: "#030712",
    card: "#0A1628",
    cardAlt: "#0F1D32",
    primary: "#22D3EE",
    border: "#164E63",
  },
  gradients: appColors.gradients,
  radius: appColors.radius,
};

/** Accessibility theme — elevated contrast for clinical readability. */
export const accessibilityTheme: UiThemeDefinition = {
  id: "dark",
  label: "Accessibility",
  palette: appColors.dark,
  clinical: {
    ...medicalTheme,
    background: "#000000",
    text: "#FFFFFF",
    muted: "#D1D5DB",
    border: "#FFFFFF",
    primary: "#FFFF00",
    critical: "#FF0000",
    success: "#00FF00",
    warning: "#FFA500",
  },
  gradients: appColors.gradients,
  radius: appColors.radius,
};

export const extendedThemeVariants = {
  accessibility: accessibilityTheme,
  developer: developerTheme,
  organization: organizationBrandingTheme,
} as const;
