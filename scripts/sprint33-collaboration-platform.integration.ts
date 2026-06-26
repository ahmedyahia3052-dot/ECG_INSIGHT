import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source: string, token: string, label: string) {
  if (!source.includes(token)) {
    throw new Error(`Sprint 33 validation failed: missing ${label}`);
  }
}

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260626172500_sprint33_collaboration_platform/migration.sql");
const routes = read("server/src/modules/collaboration/case-collaboration.routes.ts");
const realtime = read("server/src/realtime/realtime.service.ts");
const casesRoutes = read("server/src/cases/cases.routes.ts");
const aiService = read("server/src/ai/ai.service.ts");
const frontendService = read("artifacts/ecg-insight/services/collaboration.ts");
const collaborationPanel = read("artifacts/ecg-insight/components/collaboration/CaseCollaborationPanel.tsx");
const caseDetail = read("artifacts/ecg-insight/app/(protected)/ecg-cases/[id].tsx");
const report = read("SPRINT_33_COLLABORATION_PLATFORM_REPORT.md");

[
  "CasePresence",
  "CaseClinicalNote",
  "CaseClinicalNoteEdit",
  "CaseActivity",
  "CaseDiscussionThread",
  "CaseDiscussionMessage",
  "CaseDiscussionReadReceipt",
  "CaseAssignment",
  "CaseLock",
  "CaseVersion",
  "AWAITING_SECOND_OPINION",
  "ESCALATED",
  "SIGNED",
  "ARCHIVED",
].forEach((token) => assertIncludes(schema, token, `schema token ${token}`));

[
  "CREATE TABLE \"CasePresence\"",
  "CREATE TABLE \"CaseClinicalNote\"",
  "CREATE TABLE \"CaseDiscussionMessage\"",
  "CREATE TABLE \"CaseAssignment\"",
  "CREATE TABLE \"CaseLock\"",
  "CREATE TABLE \"CaseVersion\"",
].forEach((token) => assertIncludes(migration, token, `migration token ${token}`));

[
  "/cases/:caseId/presence",
  "/cases/:caseId/notes",
  "/cases/:caseId/discussions",
  "/cases/:caseId/assignments",
  "/cases/:caseId/status",
  "/cases/:caseId/locks",
  "/cases/:caseId/versions/:versionId/restore",
  "COLLABORATION_NOTE_CREATED",
  "COLLABORATION_MESSAGE_SENT",
  "COLLABORATION_VERSION_RESTORED",
].forEach((token) => assertIncludes(routes, token, `route token ${token}`));

[
  "io.use",
  "verifyAccessToken",
  "join:case",
  "case.presence.updated",
  "case.discussion.message.created",
  "case.version.restored",
].forEach((token) => assertIncludes(realtime, token, `realtime token ${token}`));

assertIncludes(casesRoutes, "collaborationActivity", "case lifecycle collaboration activities");
assertIncludes(aiService, "AI analysis completed", "AI completion activity");

[
  "getCaseCollaborationState",
  "updateCasePresence",
  "createCaseNote",
  "sendCaseDiscussionMessage",
  "createCaseAssignment",
  "acquireCaseLock",
  "restoreCaseVersion",
].forEach((token) => assertIncludes(frontendService, token, `frontend service ${token}`));

[
  "Real-Time Collaboration Workspace",
  "Active Users",
  "Clinical Notes",
  "Discussion Thread",
  "Assignments & Workflow",
  "Activity Timeline",
].forEach((token) => assertIncludes(collaborationPanel, token, `frontend panel ${token}`));

assertIncludes(caseDetail, "CaseCollaborationPanel", "case detail collaboration panel mount");
assertIncludes(report, "Sprint 33", "Sprint 33 report");

console.log("Sprint 33 collaboration platform integration checks passed.");
