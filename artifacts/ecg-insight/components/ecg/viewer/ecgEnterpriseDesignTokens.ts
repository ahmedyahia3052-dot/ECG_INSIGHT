/** Sprint 29 — unified enterprise design system for hospital ECG workstation. */
export const ECG_ENTERPRISE_DESIGN = {
  animation: {
    fast: 120,
    normal: 160,
    slow: 180,
  },
  border: {
    hairline: "rgba(30,58,74,0.55)",
    strong: "rgba(34,197,94,0.45)",
  },
  color: {
    chrome: "#040E1A",
    panel: "rgba(8,20,36,0.96)",
    phosphor: "#22C55E",
    surface: "rgba(12,26,45,0.92)",
  },
  glow: {
    phosphor: "0 0 12px rgba(34,197,94,0.35)",
    primary: "0 0 8px rgba(34,197,94,0.25)",
  },
  radius: {
    lg: 8,
    md: 6,
    sm: 4,
    xl: 10,
  },
  shadow: {
    elevation: "0 2px 10px rgba(0,0,0,0.45)",
    floating: "0 4px 18px rgba(0,0,0,0.55)",
  },
  spacing: {
    lg: 12,
    md: 8,
    sm: 4,
    xl: 16,
    xs: 2,
  },
  typography: {
    label: { fontSize: 10, fontWeight: "800" as const },
    micro: { fontSize: 8, fontWeight: "900" as const },
    title: { fontSize: 12, fontWeight: "900" as const },
  },
} as const;
