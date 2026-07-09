export { medicalTheme, type MedicalTheme } from "./medicalTheme";

export { clinicalUiAdapter } from "@/adapters/ui";
export { useColors } from "@/hooks/useColors";

export const themeTokens = {
  colors: {
    background: "#06111F",
    border: "#1E3A4A",
    card: "#0C1A2D",
    cardAlt: "#10243A",
    critical: "#F43F5E",
    muted: "#8EA5B8",
    primary: "#14DDE6",
    primaryDark: "#0891B2",
    success: "#22C55E",
    surface: "#081625",
    text: "#F8FAFC",
    warning: "#F59E0B",
  },
  radius: {
    lg: 16,
    md: 12,
    sm: 8,
    xl: 20,
  },
  shadows: {
    card: {
      elevation: 4,
      shadowColor: "#000000",
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
    },
  },
  spacing: {
    lg: 24,
    md: 16,
    sm: 8,
    xl: 32,
    xs: 4,
  },
  typography: {
    body: { fontSize: 14, fontWeight: "600" as const },
    caption: { fontSize: 11, fontWeight: "700" as const },
    heading: { fontSize: 20, fontWeight: "900" as const },
    label: { fontSize: 12, fontWeight: "800" as const },
  },
} as const;
