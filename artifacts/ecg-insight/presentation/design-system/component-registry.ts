/**
 * Sprint 78 — Component registry (production ECG presentation components).
 */

import type { BoltComponentId } from "./bolt-mapping";
import { BOLT_TO_ECG_COMPONENT_MAP } from "./bolt-mapping";

export type ComponentRegistryEntry = {
  id: string;
  boltAlias?: BoltComponentId;
  description: string;
  exportName: string;
  modulePath: string;
  lazy?: boolean;
  domain: "shared" | "medical" | "viewer" | "monitor" | "assistant" | "dashboard";
};

const enterpriseUi = "@/components/enterprise/EnterpriseUI";
const viewerRoot = "@/components/ecg/viewer";
const interaction = "@/components/interaction/PremiumInteraction";

/** Registered production components available for Bolt/Penpot replacement. */
export const componentRegistry: ComponentRegistryEntry[] = [
  { id: "enterprise.button", boltAlias: "Button", description: "Primary action button", domain: "shared", exportName: "PrimaryButton", modulePath: enterpriseUi },
  { id: "enterprise.card", boltAlias: "Card", description: "Surface card", domain: "shared", exportName: "Card", modulePath: enterpriseUi },
  { id: "enterprise.badge", boltAlias: "Badge", description: "Status badge", domain: "shared", exportName: "Badge", modulePath: enterpriseUi },
  { id: "enterprise.input", boltAlias: "Input", description: "Form field", domain: "shared", exportName: "Field", modulePath: enterpriseUi },
  { id: "enterprise.stat-card", boltAlias: "StatCard", description: "Dashboard metric card", domain: "dashboard", exportName: "StatCard", modulePath: enterpriseUi },
  { id: "enterprise.empty-state", boltAlias: "EmptyState", description: "Empty data state", domain: "dashboard", exportName: "EmptyState", modulePath: enterpriseUi },
  { id: "interaction.modal", boltAlias: "Modal", description: "Modal overlay", domain: "shared", exportName: "PremiumModal", modulePath: interaction },
  { id: "interaction.toast", boltAlias: "Toast", description: "Toast provider", domain: "shared", exportName: "ToastProvider", modulePath: interaction },
  { id: "viewer.foundation", description: "Enterprise workspace viewer shell", domain: "viewer", exportName: "EcgMonitorViewerFoundation", lazy: true, modulePath: `${viewerRoot}/EcgMonitorViewerFoundation` },
  { id: "viewer.command-palette", boltAlias: "CommandPalette", description: "Workstation command palette", domain: "viewer", exportName: "EcgCommandPalette", modulePath: `${viewerRoot}/EcgCommandPalette` },
  { id: "viewer.sidebar", boltAlias: "Sidebar", description: "Workstation left navigation", domain: "viewer", exportName: "EcgWorkstationLeftNav", modulePath: `${viewerRoot}/EcgWorkstationLeftNav` },
  { id: "monitor.shell", description: "Live monitor hospital shell", domain: "monitor", exportName: "EcgLiveMonitorShell", lazy: true, modulePath: `${viewerRoot}/EcgLiveMonitorShell` },
  { id: "monitor.view", description: "Live monitor canvas host", domain: "monitor", exportName: "EcgLiveMonitorView", lazy: true, modulePath: `${viewerRoot}/EcgLiveMonitorView` },
  { id: "assistant.copilot-workspace", description: "AI copilot resizable workspace", domain: "assistant", exportName: "CopilotResizableWorkspace", lazy: true, modulePath: "@/components/copilot/CopilotResizableWorkspace" },
];

export function getComponentRegistryEntry(id: string) {
  return componentRegistry.find((entry) => entry.id === id);
}

export function registryEntriesForDomain(domain: ComponentRegistryEntry["domain"]) {
  return componentRegistry.filter((entry) => entry.domain === domain);
}

/** Validates every Bolt mapping resolves to a registry entry or explicit module path. */
export function validateBoltMappings(): string[] {
  const errors: string[] = [];
  for (const [boltId, target] of Object.entries(BOLT_TO_ECG_COMPONENT_MAP)) {
    const match = componentRegistry.find((entry) => entry.boltAlias === boltId && entry.exportName === target.ecgExport);
    if (!match && !target.modulePath) {
      errors.push(`Missing registry entry for Bolt ${boltId}`);
    }
  }
  return errors;
}

export const COMPONENT_REGISTRY_VERSION = "sprint78-v1";
