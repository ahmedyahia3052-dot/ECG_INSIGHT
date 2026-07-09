import type { EcgCaseDetailView, EcgCaseListItemView } from "@/types/clinical";

import { toEcgCaseDetailView, toEcgCaseListItemView } from "./ecg-case.adapter";

export { toDashboardKpiView, toEcgCaseDetailView, toEcgCaseListItemView } from "./ecg-case.adapter";

export function mapEcgCaseList(records: Parameters<typeof toEcgCaseListItemView>[0][]): EcgCaseListItemView[] {
  return records.map(toEcgCaseListItemView);
}

export function mapEcgCaseDetail(record: Parameters<typeof toEcgCaseDetailView>[0], imageUrl?: string): EcgCaseDetailView {
  return toEcgCaseDetailView(record, imageUrl);
}
