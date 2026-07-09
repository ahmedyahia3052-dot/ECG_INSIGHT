import { Platform } from "react-native";

import { downloadReportPdf, generateReport, getReport, listReports, reportHtmlUrl, reportPrintUrl } from "@/services/reports";

export class ReportsDomainService {
  listDashboardReports(accessToken: string) {
    return listReports(accessToken, new URLSearchParams({ pageSize: "8" }));
  }

  listReports(accessToken: string, params = new URLSearchParams()) {
    return listReports(accessToken, params);
  }

  getReport(accessToken: string, reportId: string) {
    return getReport(accessToken, reportId);
  }

  generateReport(accessToken: string, caseId: string) {
    return generateReport(accessToken, caseId);
  }

  async openReportHtml(accessToken: string, url: string) {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const response = await fetch(url, {
      credentials: "include",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const html = await response.text();
    const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  async openReportPdf(accessToken: string, reportId: string, mode: "download" | "preview" = "preview") {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const blob = await downloadReportPdf(accessToken, reportId);
    const url = URL.createObjectURL(blob);
    if (mode === "download") {
      const link = document.createElement("a");
      link.href = url;
      link.download = "ecg-medical-report.pdf";
      link.click();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async shareReport(reportNumber: string, verificationUrl?: string) {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const url = verificationUrl ? `${window.location.origin}${verificationUrl}` : window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `ECG Report ${reportNumber}`, text: "Secure ECG report verification link", url });
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  reportHtmlUrl(reportId: string) {
    return reportHtmlUrl(reportId);
  }

  reportPrintUrl(reportId: string) {
    return reportPrintUrl(reportId);
  }
}

export const reportsDomainService = new ReportsDomainService();
