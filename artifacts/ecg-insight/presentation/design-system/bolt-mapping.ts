/**
 * Sprint 78 — Bolt / Penpot → ECG Enterprise component mapping.
 * Swap presentation imports without touching business logic or services.
 */

export type EcgComponentTarget = {
  /** Production ECG component export name */
  ecgExport: string;
  /** Module path (must remain resolvable at build time) */
  modulePath: string;
  /** Domain bucket for Penpot import routing */
  domain: "shared" | "medical" | "viewer" | "monitor" | "assistant" | "dashboard";
  /** Replacement strategy for migration sprints */
  strategy: "direct" | "facade" | "slot";
};

export type BoltComponentId =
  | "Button"
  | "Card"
  | "Sidebar"
  | "Modal"
  | "Dialog"
  | "Form"
  | "Input"
  | "Badge"
  | "Table"
  | "Tabs"
  | "Toast"
  | "Drawer"
  | "CommandPalette"
  | "Navigation"
  | "StatCard"
  | "EmptyState";

/**
 * Canonical Bolt → ECG mapping table.
 * Import sprints replace `modulePath` targets only — services stay untouched.
 */
export const BOLT_TO_ECG_COMPONENT_MAP: Record<BoltComponentId, EcgComponentTarget> = {
  Badge: {
    domain: "shared",
    ecgExport: "Badge",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "direct",
  },
  Button: {
    domain: "shared",
    ecgExport: "PrimaryButton",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "direct",
  },
  Card: {
    domain: "shared",
    ecgExport: "Card",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "direct",
  },
  CommandPalette: {
    domain: "viewer",
    ecgExport: "EcgCommandPalette",
    modulePath: "@/components/ecg/viewer/EcgCommandPalette",
    strategy: "facade",
  },
  Dialog: {
    domain: "shared",
    ecgExport: "PremiumModal",
    modulePath: "@/components/interaction/PremiumInteraction",
    strategy: "direct",
  },
  Drawer: {
    domain: "shared",
    ecgExport: "BottomSheet",
    modulePath: "@/components/interaction/PremiumInteraction",
    strategy: "direct",
  },
  EmptyState: {
    domain: "dashboard",
    ecgExport: "EmptyState",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "direct",
  },
  Form: {
    domain: "medical",
    ecgExport: "Field",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "direct",
  },
  Input: {
    domain: "shared",
    ecgExport: "Field",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "direct",
  },
  Modal: {
    domain: "shared",
    ecgExport: "PremiumModal",
    modulePath: "@/components/interaction/PremiumInteraction",
    strategy: "direct",
  },
  Navigation: {
    domain: "dashboard",
    ecgExport: "EnterpriseShell",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "facade",
  },
  Sidebar: {
    domain: "viewer",
    ecgExport: "EcgWorkstationLeftNav",
    modulePath: "@/components/ecg/viewer/EcgWorkstationLeftNav",
    strategy: "facade",
  },
  StatCard: {
    domain: "dashboard",
    ecgExport: "StatCard",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "direct",
  },
  Table: {
    domain: "dashboard",
    ecgExport: "Card",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "facade",
  },
  Tabs: {
    domain: "shared",
    ecgExport: "PageSection",
    modulePath: "@/components/enterprise/EnterpriseUI",
    strategy: "facade",
  },
  Toast: {
    domain: "shared",
    ecgExport: "ToastProvider",
    modulePath: "@/components/interaction/PremiumInteraction",
    strategy: "direct",
  },
};

export function resolveBoltMapping(boltId: BoltComponentId): EcgComponentTarget {
  return BOLT_TO_ECG_COMPONENT_MAP[boltId];
}

export function boltMappingsForDomain(domain: EcgComponentTarget["domain"]) {
  return Object.entries(BOLT_TO_ECG_COMPONENT_MAP).filter(([, target]) => target.domain === domain);
}

export const BOLT_MAPPING_VERSION = "sprint78-v1";
