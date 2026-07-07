import { Platform, type ViewProps } from "react-native";

/** React Native Web rejects `nativeID` on DOM nodes — omit on web, keep for native builds. */
export function ecgNativeId(nativeID?: string): Pick<ViewProps, "nativeID"> | Record<string, never> {
  if (!nativeID || Platform.OS === "web") return {};
  return { nativeID };
}

/** Anchor id for DOM queries (tooltips) — uses HTML `id` on web, `nativeID` on native. */
export function ecgAnchorId(id: string): { id?: string; nativeID?: string } {
  if (Platform.OS === "web") return { id };
  return { nativeID: id };
}
