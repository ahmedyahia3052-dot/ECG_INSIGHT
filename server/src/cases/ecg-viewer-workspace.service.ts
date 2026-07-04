import type { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

export const ECG_VIEWER_WORKSPACE_MARKER = "__Sprint13EcgViewerWorkspace__";

export async function loadEcgViewerWorkspace(caseId: string) {
  const note = await prisma.caseClinicalNote.findFirst({
    orderBy: { updatedAt: "desc" },
    where: { caseId, plainText: ECG_VIEWER_WORKSPACE_MARKER },
  });
  return (note?.metadata as Record<string, unknown> | null | undefined)?.workspace ?? null;
}

export async function persistEcgViewerWorkspace(caseId: string, authorId: string, workspace: Prisma.InputJsonValue) {
  const existing = await prisma.caseClinicalNote.findFirst({
    where: { caseId, plainText: ECG_VIEWER_WORKSPACE_MARKER },
  });
  if (existing) {
    await prisma.caseClinicalNote.update({
      data: {
        authorId,
        metadata: { workspace, version: 3 },
      },
      where: { id: existing.id },
    });
    return;
  }
  await prisma.caseClinicalNote.create({
    data: {
      authorId,
      caseId,
      metadata: { workspace, version: 3 },
      plainText: ECG_VIEWER_WORKSPACE_MARKER,
      richText: ECG_VIEWER_WORKSPACE_MARKER,
    },
  });
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildMeasurementWorkspacePdf(input: {
  caseNumber?: string;
  doctorName?: string;
  measurements: Array<{ lead?: string; name: string; unit: string; value: number }>;
  patientName?: string;
  studyDate?: string;
}) {
  const lines = [
    "ECG Insight Enterprise — Clinical Measurement Workspace Export",
    `Patient: ${input.patientName ?? "Unknown"}`,
    `Case: ${input.caseNumber ?? "Unknown"}`,
    `Study Date: ${input.studyDate ?? new Date().toISOString()}`,
    `Doctor: ${input.doctorName ?? "Unknown"}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Measurement Table",
    ...input.measurements.map((item) => `${item.name} | ${item.value} ${item.unit}${item.lead ? ` | Lead ${item.lead}` : ""}`),
  ];
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    ...lines.map((line, index) => `${index === 0 ? "" : "0 -18 Td"}(${escapePdfText(line).slice(0, 110)}) Tj`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
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
