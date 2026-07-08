import type { EnterpriseReportDocument } from "./types";
import { REPORT_TYPE_LABELS } from "./templates";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfLinesFromDocument(document: EnterpriseReportDocument) {
  const title = REPORT_TYPE_LABELS[document.reportType] ?? "ECG Report";
  return [
    title,
    `${document.header.hospitalName} · ${document.header.department ?? "Department not recorded"}`,
    `Report ${document.reportNumber} · ${document.header.reportDate}`,
    `Patient: ${document.patient.patientName} · ID ${document.patient.patientId ?? "N/A"}`,
    `Doctor: ${document.header.doctorName} · License ${document.header.doctorLicense ?? "N/A"}`,
    `Heart Rate: ${document.ecg.heartRate ?? "—"} · Rhythm: ${document.ecg.rhythm ?? "—"}`,
    `PR ${document.ecg.pr ?? "—"} · QRS ${document.ecg.qrs ?? "—"} · QT ${document.ecg.qt ?? "—"} · QTc ${document.ecg.qtc ?? "—"}`,
    `AI Diagnosis: ${document.ai.diagnosis ?? "Pending"}`,
    `Confidence: ${document.ai.confidence ?? "Pending"} · Urgency: ${document.ai.urgency ?? "—"}`,
    `Physician Impression: ${document.doctor.finalDiagnosis ?? document.doctor.interpretation ?? "Pending"}`,
    `Verification Hash: ${document.verificationHash}`,
    `Report UUID: ${document.reportUuid}`,
    document.readOnly ? "STATUS: FINAL READ ONLY" : `STATUS: ${document.status.toUpperCase()}`,
    ...(document.ai.recommendations ?? []).slice(0, 4).map((item) => `Recommendation: ${item}`),
    `Generated: ${document.generatedAt}`,
    document.branding.reportFooter ?? "ECG Insight Enterprise Medical AI Platform",
  ];
}

export function renderEnterpriseReportPdf(document: EnterpriseReportDocument, watermark = "ECG Insight") {
  const linesPerPage = 18;
  const allLines = [`Watermark: ${watermark}`, ...pdfLinesFromDocument(document)];
  const pages: string[][] = [];
  for (let index = 0; index < allLines.length; index += linesPerPage) {
    pages.push(allLines.slice(index, index + linesPerPage));
  }

  const pageObjects: string[] = [];
  const contentObjects: string[] = [];
  const kids: string[] = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageNumber = 6 + pageIndex * 2;
    const contentNumber = pageNumber + 1;
    kids.push(`${pageNumber} 0 R`);
    const footer = `Page ${pageIndex + 1} of ${pages.length} · ${document.reportNumber}`;
    const content = [
      "BT",
      "/F1 11 Tf",
      "48 760 Td",
      ...pageLines.flatMap((line, lineIndex) => [
        lineIndex === 0 ? "" : "0 -22 Td",
        `(${escapePdfText(line.slice(0, 100))}) Tj`,
      ]),
      "0 -30 Td",
      `(${escapePdfText(footer)}) Tj`,
      "ET",
    ].join("\n");
    contentObjects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    pageObjects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents ${contentNumber} 0 R >>`,
    );
  });

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`,
    ...pageObjects,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ...contentObjects,
  ];

  const bodyParts: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(bodyParts.join("")));
    bodyParts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(bodyParts.join(""));
  bodyParts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) {
    bodyParts.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  }
  bodyParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(bodyParts.join(""), "utf8");
}

export function renderEnterpriseReportSvg(document: EnterpriseReportDocument) {
  const lines = pdfLinesFromDocument(document);
  const rowHeight = 22;
  const height = 120 + lines.length * rowHeight;
  const svgLines = lines
    .map((line, index) => `<text x="24" y="${48 + index * rowHeight}" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="${height}" viewBox="0 0 820 ${height}">
    <rect width="820" height="${height}" fill="#ffffff"/>
    <rect x="0" y="0" width="820" height="40" fill="${document.branding.primaryColor}"/>
    <text x="24" y="26" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${document.reportNumber} — Enterprise ECG Report</text>
    ${svgLines}
  </svg>`;
}
