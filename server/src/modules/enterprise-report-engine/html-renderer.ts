import type { EnterpriseReportDocument } from "./types";
import { REPORT_TYPE_LABELS } from "./templates";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kv(label: string, value: unknown) {
  return `<div class="kv"><b>${escapeHtml(label)}</b><span>${escapeHtml(value ?? "—")}</span></div>`;
}

function section(title: string, body: string, full = false) {
  return `<div class="section${full ? " full" : ""}"><h2>${escapeHtml(title)}</h2>${body}</div>`;
}

function list(items: string[]) {
  return items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p class=\"muted\">None recorded</p>";
}

export function renderEnterpriseReportHtml(document: EnterpriseReportDocument) {
  const title = REPORT_TYPE_LABELS[document.reportType] ?? "ECG Report";
  const watermark = document.readOnly ? "FINAL · READ ONLY" : document.branding.watermark ?? "ECG Insight";
  const sections: string[] = [];

  if (document.sections.includes("header")) {
    sections.push(section("Report Header", [
      kv("Hospital", document.header.hospitalName),
      kv("Department", document.header.department),
      kv("Address", document.header.address),
      kv("Phone", document.header.phone),
      kv("Email", document.header.email),
      kv("Doctor", document.header.doctorName),
      kv("Title", document.header.doctorTitle),
      kv("License", document.header.doctorLicense),
      kv("Report Number", document.header.reportNumber),
      kv("Report Date", document.header.reportDate),
      kv("Report UUID", document.header.reportUuid),
      kv("Verification Hash", document.header.verificationHash),
    ].join(""), true));
  }

  if (document.sections.includes("patient")) {
    sections.push(section("Patient Information", [
      kv("Patient Name", document.patient.patientName),
      kv("Patient ID", document.patient.patientId),
      kv("Age", document.patient.age),
      kv("Gender", document.patient.gender),
      kv("Company", document.patient.company),
      kv("Department", document.patient.department),
      kv("Occupation", document.patient.occupation),
      kv("Medical Record Number", document.patient.medicalRecordNumber),
      kv("Case Number", document.patient.caseNumber),
      kv("Study Date", document.patient.studyDate),
      kv("Study Time", document.patient.studyTime),
      kv("Technician", document.patient.technician),
      kv("Ordering Physician", document.patient.orderingPhysician),
    ].join("")));
  }

  if (document.sections.includes("ecg")) {
    sections.push(section("ECG Information", [
      kv("Heart Rate", document.ecg.heartRate),
      kv("Rhythm", document.ecg.rhythm),
      kv("Axis", document.ecg.axis),
      kv("PR", document.ecg.pr),
      kv("QRS", document.ecg.qrs),
      kv("QT", document.ecg.qt),
      kv("QTc", document.ecg.qtc),
      kv("ST", document.ecg.st),
      kv("Voltage", document.ecg.voltage),
      kv("Intervals", document.ecg.intervals),
      kv("Lead Quality", document.ecg.leadQuality),
      kv("Signal Quality", document.ecg.signalQuality),
      kv("Noise", document.ecg.noise),
      kv("Paper Speed", document.ecg.paperSpeed),
      kv("Gain", document.ecg.gain),
      kv("Filter", document.ecg.filter),
      kv("Acquisition Device", document.ecg.acquisitionDevice),
    ].join("")));
  }

  if (document.sections.includes("ai")) {
    sections.push(section("AI Section", [
      `<div class="diagnosis">${escapeHtml(document.ai.diagnosis ?? "Pending")}</div>`,
      kv("Confidence", document.ai.confidence),
      kv("Urgency", document.ai.urgency),
      `<p><b>Clinical Summary</b><br />${escapeHtml(document.ai.clinicalSummary)}</p>`,
      `<p><b>Supporting Findings</b></p>${list(document.ai.supportingFindings ?? [])}`,
      `<p><b>Abnormal Leads</b></p>${list(document.ai.abnormalLeads ?? [])}`,
      document.ai.differentialDiagnosis?.length
        ? `<table class="table"><thead><tr><th>Diagnosis</th><th>Likelihood</th><th>Notes</th></tr></thead><tbody>${document.ai.differentialDiagnosis.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.likelihood)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join("")}</tbody></table>`
        : "",
      `<p><b>Recommendations</b></p>${list(document.ai.recommendations ?? [])}`,
      document.ai.clinicalNotes ? `<p><b>Clinical Notes</b><br />${escapeHtml(document.ai.clinicalNotes)}</p>` : "",
    ].join(""), true));
  }

  if (document.sections.includes("doctor")) {
    sections.push(section("Doctor Section", [
      kv("Interpretation", document.doctor.interpretation),
      kv("Final Diagnosis", document.doctor.finalDiagnosis),
      `<p><b>Recommendations</b></p>${list(document.doctor.recommendation ?? [])}`,
      `<p><b>Restrictions</b></p>${list(document.doctor.restrictions ?? [])}`,
      kv("Fitness Decision", document.doctor.fitnessDecision),
      document.doctor.comments ? `<p><b>Comments</b><br />${escapeHtml(document.doctor.comments)}</p>` : "",
      document.doctor.digitalSignature ? `<div class="signature">Digitally signed · ${escapeHtml(document.doctor.signedAt ?? "Pending timestamp")}</div>` : `<div class="signature muted">Signature pending</div>`,
      document.doctor.stamp ? `<div class="stamp">${escapeHtml(document.doctor.stamp)}</div>` : "",
    ].join("")));
  }

  if (document.sections.includes("attachments")) {
    const attachmentRows = [
      ["Original ECG", document.attachments.originalEcg],
      ["Processed ECG", document.attachments.processedEcg],
      ["Digitized ECG", document.attachments.digitizedEcg],
      ["Measurements", document.attachments.measurements],
      ["Overlay", document.attachments.overlay],
      ["AI Heatmap", document.attachments.aiHeatmap],
    ].filter((row): row is [string, string] => typeof row[1] === "string");
    sections.push(section("Attachments", [
      attachmentRows.length
        ? attachmentRows.map(([label, value]) => kv(label, value)).join("")
        : "<p class=\"muted\">Attachments stored in secured case record.</p>",
      document.attachments.comparisonImages?.length
        ? `<p><b>Comparison Images</b></p>${list(document.attachments.comparisonImages)}`
        : "",
    ].join(""), true));
  }

  if (document.sections.includes("comparison")) {
    sections.push(section("Comparison Report", "<p class=\"muted\">Longitudinal comparison data linked to case history. Refer to longitudinal ECG module for prior study deltas.</p>", true));
  }

  if (document.sections.includes("teaching")) {
    sections.push(section("Teaching Report", "<p>Educational teaching report — findings presented for training purposes. Verify patient identifiers are de-identified per institutional policy.</p>", true));
  }

  if (document.sections.includes("occupational")) {
    sections.push(section("Occupational Medicine", kv("Fitness Decision", document.doctor.fitnessDecision) + kv("Restrictions", (document.doctor.restrictions ?? []).join(", ") || "None"), true));
  }

  if (document.sections.includes("fitness")) {
    sections.push(section("Medical Fitness", kv("Fitness Decision", document.doctor.fitnessDecision ?? "Pending physician review"), true));
  }

  if (document.sections.includes("disclaimer")) {
    sections.push(section("Clinical Disclaimer", "<p>This ECG Insight report is clinical decision support only. Diagnosis, treatment, occupational fitness, and emergency activation require qualified physician review.</p>", true));
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.reportNumber)} — ${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Helvetica, Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    .watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 72px; font-weight: 900; color: rgba(15,23,42,.04); transform: rotate(-24deg); pointer-events: none; z-index: 0; }
    .page { position: relative; z-index: 1; max-width: 1040px; margin: 24px auto; background: #fff; border: 1px solid #cbd5e1; box-shadow: 0 20px 60px rgba(15,23,42,.12); }
    .header { display: grid; grid-template-columns: 96px 1fr 180px; gap: 18px; padding: 28px; border-bottom: 4px solid ${escapeHtml(document.branding.primaryColor)}; align-items: center; }
    .logo { width: 84px; height: 84px; border-radius: 18px; background: ${escapeHtml(document.branding.primaryColor)}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px; overflow: hidden; }
    .logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    h1 { margin: 0; font-size: 28px; letter-spacing: -.03em; color: ${escapeHtml(document.branding.secondaryColor)}; }
    h2 { margin: 0 0 10px; font-size: 15px; color: ${escapeHtml(document.branding.primaryColor)}; text-transform: uppercase; letter-spacing: .08em; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.5; }
    .codes { text-align: center; font-size: 10px; color: #475569; }
    .codes img { max-width: 120px; border: 1px solid #cbd5e1; padding: 4px; background: #fff; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 20px 28px; }
    .section { border: 1px solid #dbe3ef; border-radius: 14px; padding: 16px; break-inside: avoid; }
    .full { grid-column: 1 / -1; }
    .kv { display: grid; grid-template-columns: 180px 1fr; gap: 8px 12px; font-size: 13px; padding: 4px 0; border-bottom: 1px solid #eef2f7; }
    .kv b { color: #334155; }
    .diagnosis { font-size: 22px; color: #b91c1c; font-weight: 900; margin-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .table th, .table td { padding: 6px 0; border-bottom: 1px solid #eef2f7; text-align: left; }
    .signature { min-height: 48px; border-top: 1px solid #94a3b8; margin-top: 16px; padding-top: 8px; }
    .stamp { margin-top: 8px; font-weight: 800; color: ${escapeHtml(document.branding.secondaryColor)}; }
    .footer { padding: 16px 28px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 16px; font-size: 12px; color: #64748b; }
    @media print { body { background: #fff; } .page { margin: 0; border: 0; box-shadow: none; max-width: none; } }
  </style>
</head>
<body>
  <div class="watermark">${escapeHtml(watermark)}</div>
  <main class="page">
    <header class="header">
      <div class="logo">${document.header.hospitalLogo ? `<img src="${escapeHtml(document.header.hospitalLogo)}" alt="Hospital logo" />` : "ECG"}</div>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="muted">
          <strong>${escapeHtml(document.branding.reportHeader ?? document.header.hospitalName)}</strong><br />
          ${escapeHtml(document.header.address ?? "")}<br />
          ${escapeHtml(document.header.phone ?? "")} · ${escapeHtml(document.header.email ?? "")}
        </div>
      </div>
      <div class="codes">
        ${document.header.qrCodeData ? `<img src="${document.header.qrCodeData}" alt="QR verification" />` : ""}
        ${document.header.barcodeData ? `<img src="${document.header.barcodeData}" alt="Barcode" style="margin-top:8px;" />` : ""}
        <div>${escapeHtml(document.reportNumber)}</div>
      </div>
    </header>
    <section class="grid">${sections.join("")}</section>
    <footer class="footer">
      <span>${escapeHtml(document.branding.reportFooter ?? "ECG Insight Enterprise")}</span>
      <span>Page 1 · ${escapeHtml(document.reportNumber)} · ${escapeHtml(document.generatedAt)}</span>
    </footer>
  </main>
</body>
</html>`;
}
