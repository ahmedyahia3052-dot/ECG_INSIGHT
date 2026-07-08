import type { ApiECGCase } from "@/services/clinical";

export function caseHasImage(ecgCase: ApiECGCase) {
  return Boolean(
    ecgCase.imagePath
    || ecgCase.ecgImage
    || ecgCase.originalFileUrl
    || ecgCase.preprocessedImagePath
    || ecgCase.files.some((file) => file.mimeType.startsWith("image/") || file.mimeType === "application/pdf"),
  );
}

function caseTimestamp(ecgCase: ApiECGCase) {
  const value = ecgCase.acquisitionDate || ecgCase.uploadDate;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortCasesNewestFirst(cases: ApiECGCase[]) {
  return [...cases].sort((left, right) => caseTimestamp(right) - caseTimestamp(left));
}

export function eligibleExaminationCases(cases: ApiECGCase[]) {
  return sortCasesNewestFirst(cases.filter(caseHasImage));
}

export function newestExaminationCaseId(cases: ApiECGCase[]) {
  return eligibleExaminationCases(cases)[0]?.id;
}
