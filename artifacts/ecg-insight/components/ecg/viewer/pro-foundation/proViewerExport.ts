import { Platform } from "react-native";

export function downloadJson(filename: string, payload: unknown) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function captureCanvasSnapshot(canvasId: string, filename: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") return false;
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return false;
  const url = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  return true;
}
