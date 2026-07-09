import type { DesignTokens } from "@/design-system/hooks/useDesignTokens";
import type { DashboardDiagnosisSlice } from "@/types/screens/dashboard";

export function resolveChartColor(tokens: DesignTokens, colorKey: DashboardDiagnosisSlice["colorKey"]) {
  const palette = {
    accent: tokens.colors.medical.information,
    chart4: tokens.colors.medical.success,
    critical: tokens.colors.medical.critical,
    primary: tokens.colors.medical.primary,
    warning: tokens.colors.medical.warning,
  } as const;
  return palette[colorKey];
}

export function withAlpha(color: string, alpha: number) {
  if (color.startsWith("#") && color.length === 7) {
    const value = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${value}`;
  }
  return color;
}
