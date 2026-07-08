/** Enterprise QA infrastructure configuration (no production runtime impact). */
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(root, "..", "..");

export const QA_DIRS = {
  artifacts: path.join(REPO_ROOT, "test-results", "qa-artifacts"),
  dashboard: path.join(REPO_ROOT, "test-results", "qa-dashboard"),
  history: path.join(REPO_ROOT, "test-results", "qa-history"),
  performance: path.join(REPO_ROOT, "test-results", "performance"),
  visualBaselines: path.join(REPO_ROOT, "test-results", "visual-baselines"),
  visualDiffs: path.join(REPO_ROOT, "test-results", "visual-diffs"),
};

export const THRESHOLDS = {
  coverageTargetPct: 95,
  criticalWorkflowCoveragePct: 100,
  maxFlakyRetries: 0,
  performanceMs: {
    apiHealth: 500,
    apiLogin: 3000,
    viewerReady: 60_000,
  },
};

/** Critical enterprise workflows mapped to Playwright coverage tags/specs. */
export const WORKFLOW_MATRIX = [
  { id: "auth", label: "Authentication", specs: ["auth-navigation.spec.ts", "auth-logout-regression.spec.ts", "login-screen-stability.spec.ts"], tags: ["@smoke"] },
  { id: "dashboard", label: "Dashboard", specs: ["auth-navigation.spec.ts", "enterprise-full-validation.spec.ts"], tags: ["@smoke"] },
  { id: "patients", label: "Patients", specs: ["clinical-workflows.spec.ts"], tags: ["@smoke"] },
  { id: "patient-details", label: "Patient Details", specs: ["clinical-workflows.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "ecg-upload", label: "ECG Upload", specs: ["clinical-workflows.spec.ts", "enterprise-full-validation.spec.ts"], tags: ["@smoke", "@enterprise"] },
  { id: "image-processing", label: "Image Processing", specs: ["sprint16-ecg-digitization.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "grid-detection", label: "Grid Detection", specs: ["sprint14-clinical-calipers.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "lead-detection", label: "Lead Detection", specs: ["sprint13-ecg-monitor.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "digitization", label: "Digitization", specs: ["sprint16-ecg-digitization.spec.ts"], tags: ["@sprint16"] },
  { id: "signal-reconstruction", label: "Signal Reconstruction", specs: ["sprint27-ecg-rendering-engine.spec.ts", "sprint28-clinical-visualization.spec.ts"], tags: ["@enterprise"] },
  { id: "viewer", label: "Viewer", specs: ["ecg-workspace-restoration.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@restoration", "@qa-matrix"] },
  { id: "zoom", label: "Zoom", specs: ["enterprise-workflow-matrix.spec.ts", "sprint29-zero-chrome-clinical-workspace.spec.ts"], tags: ["@qa-matrix"] },
  { id: "pan", label: "Pan", specs: ["enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "measurements", label: "Measurements", specs: ["sprint15-clinical-measurement-engine.spec.ts", "sprint34-professional-measurement-engine.spec.ts"], tags: ["@sprint34-measurement"] },
  { id: "ai-findings", label: "AI Findings", specs: ["sprint14-ai-clinical-overlay.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "ai-cardiologist", label: "AI Cardiologist", specs: ["sprint38-ai-cardiologist.spec.ts"], tags: ["@sprint38"], parallelExcluded: true },
  { id: "live-monitor", label: "Live Monitor", specs: ["sprint37-live-monitor.spec.ts", "sprint13-ecg-monitor.spec.ts"], tags: ["@sprint37"] },
  { id: "fullscreen", label: "Fullscreen", specs: ["sprint29-zero-chrome-clinical-workspace.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "overlay", label: "Overlay", specs: ["sprint14-ai-clinical-overlay.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "compare", label: "Compare", specs: ["sprint18-ecg-clinical-workstation.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "reports", label: "Reports", specs: ["clinical-workflows.spec.ts", "auth-navigation.spec.ts"], tags: ["@smoke"] },
  { id: "export", label: "Export", specs: ["clinical-workflows.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "settings", label: "Settings", specs: ["auth-navigation.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@smoke"] },
  { id: "history", label: "History", specs: ["sprint30-clinical-workflow.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"] },
  { id: "dark-theme", label: "Dark Theme", specs: ["enterprise-workflow-matrix.spec.ts"], tags: ["@qa-matrix"], note: "Validates enterprise dark shell; dedicated theme toggle not exposed in settings yet" },
  { id: "responsive", label: "Responsive Layout", specs: ["mobile-responsive.spec.ts", "sprint36-clinical-validation.spec.ts"], tags: ["@mobile"] },
  { id: "error-recovery", label: "Error Recovery", specs: ["enterprise-full-validation.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@enterprise"] },
  { id: "empty-states", label: "Empty States", specs: ["ecg-workspace-restoration.spec.ts", "enterprise-workflow-matrix.spec.ts"], tags: ["@restoration"] },
];

export const UNIT_TEST_GLOB = "scripts/**/*.test.ts";

export const INTEGRATION_DOMAINS = [
  "API",
  "Medical Intelligence Core",
  "ECG Analysis",
  "Measurement Engine",
  "Viewer",
  "Report Engine",
  "Authentication",
  "Database",
  "Caching",
  "Session",
];
