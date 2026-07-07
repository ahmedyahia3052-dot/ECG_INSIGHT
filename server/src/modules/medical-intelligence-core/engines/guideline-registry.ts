import { MIC_GUIDELINE_BY_ID, MIC_GUIDELINE_REGISTRY } from "../data/guidelines";
import type { MicDiagnosisCategory, MicGuidelineEntry, MicGuidelineOrganization } from "../types";

/** Module 8 — Guideline lookup */
export function listGuidelines(filters?: {
  organization?: MicGuidelineOrganization;
  category?: MicDiagnosisCategory;
}): MicGuidelineEntry[] {
  let results = MIC_GUIDELINE_REGISTRY;
  if (filters?.organization) {
    results = results.filter((entry) => entry.organization === filters.organization);
  }
  if (filters?.category) {
    results = results.filter((entry) => entry.applicableCategories.includes(filters.category!));
  }
  return results;
}

export function getGuidelineById(id: string): MicGuidelineEntry | undefined {
  return MIC_GUIDELINE_BY_ID.get(id);
}

export function getGuidelinesForDiagnosisCategory(category: MicDiagnosisCategory): MicGuidelineEntry[] {
  return listGuidelines({ category });
}
