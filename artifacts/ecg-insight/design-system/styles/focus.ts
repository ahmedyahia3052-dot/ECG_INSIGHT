import type { DesignTokens } from "../hooks/useDesignTokens";

export function focusRingStyle(tokens: DesignTokens) {
  return {
    borderColor: tokens.colors.border.focus,
    borderWidth: 2,
    outlineStyle: "solid" as const,
  };
}

export function highContrastBorder(tokens: DesignTokens) {
  return {
    borderColor: tokens.colors.text.primary,
    borderWidth: 2,
  };
}
