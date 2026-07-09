/**
 * Font configuration aligned with Bolt UI (Inter) and Expo Google Fonts loading.
 * Application loads Inter via @expo-google-fonts/inter in app/_layout — not modified in P1.2.
 */
export const fontConfiguration = {
  primary: {
    family: "Inter",
    expoModule: "@expo-google-fonts/inter",
    weights: ["400", "500", "600", "700", "800", "900"] as const,
  },
  mono: {
    family: "monospace",
    use: ["code", "monitor", "ecgLabel"] as const,
  },
} as const;

export const fontFamilyTokens = {
  sans: "Inter",
  sansFallback: "System",
  mono: "monospace",
} as const;
