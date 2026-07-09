import { generateReport, getReport, listReports } from "@/services/reports";

import { BaseRepository } from "./base-repository";

export class ReportRepository extends BaseRepository {
  list(accessToken: string, params = new URLSearchParams()) {
    return listReports(accessToken, params);
  }

  getById(accessToken: string, reportId: string) {
    return getReport(accessToken, reportId);
  }

  generate(accessToken: string, caseId: string) {
    return generateReport(accessToken, caseId);
  }
}

export const reportRepository = new ReportRepository();
