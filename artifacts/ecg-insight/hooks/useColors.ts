import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

/**
 * Returns design tokens for the current color scheme plus radius helpers.
 * Falls back to light when the device preference is undetected.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
