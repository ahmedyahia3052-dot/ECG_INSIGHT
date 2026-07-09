import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

export function mergeStyles<T extends ViewStyle | TextStyle>(...styles: Array<StyleProp<T> | false | undefined>) {
  return StyleSheet.flatten(styles.filter(Boolean) as StyleProp<T>[]);
}

export function responsiveValue<T>(
  breakpoint: "mobile" | "tablet" | "laptop" | "desktop" | "ultraWide",
  map: Partial<Record<typeof breakpoint | "mobile" | "tablet" | "laptop" | "desktop" | "ultraWide", T>>,
  fallback: T,
): T {
  const order = ["mobile", "tablet", "laptop", "desktop", "ultraWide"] as const;
  const index = order.indexOf(breakpoint);
  for (let i = index; i >= 0; i -= 1) {
    const key = order[i];
    if (map[key] !== undefined) return map[key] as T;
  }
  return fallback;
}
