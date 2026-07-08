export { caseManagementEngineRouter } from "./case-management.routes";
export {
  archiveManagedCase,
  createCaseVersion,
  findCaseForManagement,
  listCaseHistory,
  onCaseCreated,
  recordCaseAudit,
  recordCaseHistory,
  restoreManagedCase,
  runDuplicateDetection,
  updateManagedCase,
} from "./case-management.service";
export { nextEnterpriseCaseNumber, nextPublicCaseId } from "./case-number";
export { detectDuplicateCases } from "./duplicate-detection";
