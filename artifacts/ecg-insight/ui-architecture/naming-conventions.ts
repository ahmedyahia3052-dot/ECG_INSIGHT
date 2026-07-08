/**
 * Sprint 75 — enterprise UI naming conventions.
 * Physical files remain in legacy paths; new Bolt/Penpot components should follow these rules.
 */
export const UI_NAMING_CONVENTIONS = {
  cards: "Ecg{Domain}Card | Premium{Feature}Card",
  charts: "Ecg{Metric}Chart | {Domain}VisualizationCanvas",
  dialogs: "Ecg{Feature}Dialog | PremiumModal",
  featureScreens: "Ecg{Domain}WorkspaceScreen | Ecg{Domain}Shell",
  forms: "Ecg{Feature}Form | {Feature}FieldGroup",
  hooks: "useEcg{Domain}{Concern} | use{Feature}{Concern}",
  medical: "Ecg{ClinicalConcept}{Surface}",
  pages: "Route files under app/ — thin delegates only",
  tokens: "ecg{Domain}Tokens | ECG_{DOMAIN}_{TOKEN}",
  widgets: "Ecg{Feature}{Widget} | {Domain}StatusBar",
} as const;

export type UiLayer =
  | "cards"
  | "charts"
  | "dialogs"
  | "forms"
  | "medical"
  | "navigation"
  | "pages"
  | "widgets";

export type UiFeatureSurface = "monitor" | "viewer" | "workspace";

export const UI_COMPLEXITY_BUDGET = {
  maxHookLines: 180,
  maxPresentationComponentLines: 320,
  maxScreenOrchestrationLines: 240,
} as const;

export function componentNameFor(layer: UiLayer, domain: string, surface: string) {
  const prefix = layer === "pages" ? "" : "Ecg";
  return `${prefix}${domain}${surface}`;
}
