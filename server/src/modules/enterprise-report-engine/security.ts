import { createHash, randomUUID } from "node:crypto";
import type { EnterpriseReportDocument } from "./types";

export function computeContentHash(document: Pick<EnterpriseReportDocument, "header" | "patient" | "ecg" | "ai" | "doctor" | "reportNumber" | "status">) {
  const payload = JSON.stringify({
    ai: document.ai,
    doctor: document.doctor,
    ecg: document.ecg,
    header: {
      doctorLicense: document.header.doctorLicense,
      doctorName: document.header.doctorName,
      reportDate: document.header.reportDate,
      reportNumber: document.header.reportNumber,
    },
    patient: document.patient,
    reportNumber: document.reportNumber,
    status: document.status,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function computeVerificationHash(reportUuid: string, contentHash: string, verificationToken: string) {
  return createHash("sha256").update(`${reportUuid}:${contentHash}:${verificationToken}`).digest("hex");
}

export function verifyReportIntegrity(
  storedContentHash: string | null | undefined,
  storedVerificationHash: string | null | undefined,
  document: EnterpriseReportDocument,
  verificationToken: string,
) {
  const contentHash = computeContentHash(document);
  const verificationHash = computeVerificationHash(document.reportUuid, contentHash, verificationToken);
  const contentMatch = !storedContentHash || storedContentHash === contentHash;
  const verificationMatch = !storedVerificationHash || storedVerificationHash === verificationHash;
  return {
    contentHash,
    contentMatch,
    tampered: !contentMatch,
    valid: contentMatch && verificationMatch,
    verificationHash,
    verificationMatch,
  };
}

export function newReportUuid() {
  return randomUUID();
}

export function pseudoBarcodeSvg(payload: string) {
  const width = 240;
  const height = 48;
  const bars: string[] = [];
  const chars = [...payload].map((char) => char.charCodeAt(0));
  let x = 8;
  for (let index = 0; index < 48; index += 1) {
    const seed = chars[index % Math.max(chars.length, 1)] ?? 11;
    const barWidth = (seed % 3) + 1;
    if ((seed + index) % 2 === 0) {
      bars.push(`<rect x="${x}" y="6" width="${barWidth}" height="${height - 12}" fill="#0f172a"/>`);
    }
    x += barWidth + 1;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#fff"/>${bars.join("")}<text x="8" y="${height - 2}" font-size="8" fill="#334155">${payload.slice(0, 28)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function pseudoQrSvg(payload: string) {
  const size = 148;
  const modules = 21;
  const cell = size / modules;
  const chars = [...payload].map((char) => char.charCodeAt(0));
  const blocks: string[] = [];
  function finder(x: number, y: number) {
    blocks.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell * 7}" height="${cell * 7}" fill="#0f172a"/>`);
    blocks.push(`<rect x="${(x + 1) * cell}" y="${(y + 1) * cell}" width="${cell * 5}" height="${cell * 5}" fill="#ffffff"/>`);
    blocks.push(`<rect x="${(x + 2) * cell}" y="${(y + 2) * cell}" width="${cell * 3}" height="${cell * 3}" fill="#0f172a"/>`);
  }
  finder(0, 0);
  finder(14, 0);
  finder(0, 14);
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      const inFinder = (row < 7 && col < 7) || (row < 7 && col >= 14) || (row >= 14 && col < 7);
      if (inFinder) continue;
      const seed = chars[(row * modules + col) % Math.max(chars.length, 1)] ?? 17;
      if ((seed + row * 7 + col * 11) % 5 < 2) {
        blocks.push(`<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="#0f172a"/>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/>${blocks.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
