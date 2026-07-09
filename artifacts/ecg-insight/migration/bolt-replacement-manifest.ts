/**
 * Bolt UI replacement manifest.
 * When Bolt UI is imported, DELETE every path listed here — do not merge or keep duplicates.
 * Routes and URLs are preserved; only presentation modules are replaced.
 */
export const BOLT_REPLACEMENT_MANIFEST = {
  /** Legacy enterprise shell — replaced by Bolt layout/navigation */
  layouts: [
    "artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx",
    "artifacts/ecg-insight/presentation/layouts/",
  ],
  /** Legacy shared UI primitives — replaced by Bolt component library */
  sharedComponents: [
    "artifacts/ecg-insight/components/ui/Premium.tsx",
    "artifacts/ecg-insight/components/interaction/PremiumInteraction.tsx",
    "artifacts/ecg-insight/legacy-ui/",
  ],
  /** Duplicate navigation sources — Bolt owns navigation exclusively */
  duplicateNavigation: [
    "artifacts/ecg-insight/components/ecg/viewer/EcgWorkstationLeftNav.tsx",
  ],
  /** Duplicate theme/token systems — Bolt owns design tokens */
  duplicateThemes: [
    "artifacts/ecg-insight/theme/medicalTheme.ts",
    "artifacts/ecg-insight/design-system/",
    "artifacts/ecg-insight/presentation/tokens/",
    "artifacts/ecg-insight/presentation/theme/",
  ],
  /** Experimental viewer stacks — replaced by Bolt medical workspace/viewer/monitor */
  experimentalViewerStacks: [
    "artifacts/ecg-insight/components/ecg/viewer/render-engine-2/",
    "artifacts/ecg-insight/components/ecg/viewer/live-monitor-v2/",
    "artifacts/ecg-insight/components/ecg/viewer/live-monitor-pro/",
    "artifacts/ecg-insight/components/ecg/viewer/live-monitor-audio/",
  ],
  /** Duplicate route aliases to consolidate after Bolt import */
  duplicateRoutes: [
    "artifacts/ecg-insight/app/(protected)/patients/new.tsx",
    "artifacts/ecg-insight/app/(protected)/ecg-monitor/[caseId].tsx",
  ],
} as const;

/** Paths that must NEVER be modified during Bolt UI import */
export const BOLT_PRESERVE_MANIFEST = [
  "server/",
  "prisma/",
  "artifacts/ecg-insight/services/",
  "artifacts/ecg-insight/services/domain/",
  "artifacts/ecg-insight/hooks/domain/",
  "artifacts/ecg-insight/adapters/",
  "artifacts/ecg-insight/store/",
  "artifacts/ecg-insight/context/AuthContext.tsx",
  "artifacts/ecg-insight/routes/registry.ts",
  "artifacts/ecg-insight/types/",
] as const;

export const BOLT_UI_OWNERSHIP = {
  bolt: [
    "pages",
    "layouts",
    "navigation",
    "sidebar",
    "header",
    "dashboard",
    "cards",
    "buttons",
    "inputs",
    "forms",
    "tables",
    "charts",
    "dialogs",
    "animations",
    "typography",
    "spacing",
    "colors",
    "theme",
    "icons",
    "medical-workspace",
    "live-monitor",
    "ecg-viewer",
    "upload-wizard",
    "history",
    "profile",
    "settings",
    "subscription-ui",
    "developer-ui",
    "organization-ui",
  ],
  cursor: [
    "backend",
    "database",
    "authentication",
    "rbac",
    "api",
    "state",
    "business-logic",
    "hooks",
    "services",
    "repository-layer",
    "validation",
    "caching",
    "ai-engine",
    "payments",
    "notifications",
    "logging",
    "analytics",
    "storage",
  ],
} as const;
