import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import pdfParse from "pdf-parse";
import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";

export type ClinicalOcrStructuredData = {
  age?: number;
  confidence: number;
  engine: "native" | "pdf-parse" | "tesseract";
  heartRate?: number;
  hospital?: string;
  leadLabels: string[];
  measurements: Record<string, string | number>;
  patientName?: string;
  reportDate?: string;
  studyDate?: string;
};

export type ClinicalOcrResult = {
  confidence: number;
  engine: ClinicalOcrStructuredData["engine"];
  structured: ClinicalOcrStructuredData;
  text: string;
  warnings: string[];
};

let sharedWorker: Worker | null = null;

async function getWorker() {
  if (!sharedWorker) {
    sharedWorker = await createWorker("eng+ara", 1, { logger: () => undefined });
  }
  return sharedWorker;
}

export async function terminateClinicalOcrWorker() {
  if (sharedWorker) {
    await sharedWorker.terminate();
    sharedWorker = null;
  }
}

function parseStructuredFields(text: string): Omit<ClinicalOcrStructuredData, "confidence" | "engine"> {
  const measurements: Record<string, string | number> = {};
  const leadLabels: string[] = [];
  const normalized = text.replace(/\s+/g, " ").trim();

  const patientName =
    normalized.match(/(?:patient(?:\s*name)?|name)\s*[:-]\s*([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.'-]{1,80})/i)?.[1]?.trim()
    ?? normalized.match(/(?:^|\n)([A-Z][a-z]+,\s*[A-Z][a-z]+)/)?.[1]?.trim();

  const hospital =
    normalized.match(/(?:hospital|facility|clinic|centre|center|institution)\s*[:-]\s*([^\n\r]{3,80})/i)?.[1]?.trim();

  const ageMatch = normalized.match(/(?:age|\bage\b)\s*[:-]?\s*(\d{1,3})\s*(?:y(?:rs)?|years?)?/i);
  const hrMatch = normalized.match(/(?:heart rate|hr|\brate\b)\s*[:-]?\s*(\d{2,3})\b/i);
  const prMatch = normalized.match(/\bpr\s*[:-]?\s*(\d{2,3})\s*ms?/i);
  const qrsMatch = normalized.match(/\bqrs\s*[:-]?\s*(\d{2,3})\s*ms?/i);
  const qtMatch = normalized.match(/\bqt[c]?\s*[:-]?\s*(\d{2,3})\s*ms?/i);
  const reportDate =
    normalized.match(/(?:report date|date|study date)\s*[:-]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9{2,4}]+)/i)?.[1]?.trim();

  if (ageMatch) measurements.age = Number(ageMatch[1]);
  if (hrMatch) measurements.heartRate = Number(hrMatch[1]);
  if (prMatch) measurements.prIntervalMs = Number(prMatch[1]);
  if (qrsMatch) measurements.qrsDurationMs = Number(qrsMatch[1]);
  if (qtMatch) measurements.qtIntervalMs = Number(qtMatch[1]);

  for (const lead of ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]) {
    if (new RegExp(`\\b${lead}\\b`).test(normalized)) leadLabels.push(lead);
  }

  return {
    age: ageMatch ? Number(ageMatch[1]) : undefined,
    heartRate: hrMatch ? Number(hrMatch[1]) : undefined,
    hospital,
    leadLabels,
    measurements,
    patientName,
    reportDate,
    studyDate: reportDate,
  };
}

async function preprocessForOcr(inputPath: string, page = 0) {
  const image = sharp(inputPath, inputPath.toLowerCase().endsWith(".pdf") ? { density: 300, page } : undefined);
  const metadata = await image.metadata();
  const isLikelyDocument = (metadata.width ?? 0) > 400;
  let pipeline = image.rotate().grayscale();
  if (isLikelyDocument) {
    pipeline = pipeline.normalize().sharpen({ sigma: 1.2 }).linear(1.15, -12);
  } else {
    pipeline = pipeline.normalize().sharpen();
  }
  return pipeline.threshold(180, { grayscale: false }).png().toBuffer();
}

async function ocrImageBuffer(buffer: Buffer) {
  const worker = await getWorker();
  const result = await worker.recognize(buffer);
  return {
    confidence: Math.max(0, Math.min(1, (result.data.confidence ?? 0) / 100)),
    text: result.data.text.replace(/\s+/g, " ").trim(),
  };
}

async function extractPdfText(filePath: string) {
  try {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return {
      pages: parsed.numpages,
      text: parsed.text.replace(/\s+/g, " ").trim(),
    };
  } catch {
    return { pages: 0, text: "" };
  }
}

async function ocrPdfPages(filePath: string, maxPages = 5) {
  const metadata = await sharp(filePath, { density: 300 }).metadata();
  const pages = Math.min(metadata.pages ?? 1, maxPages);
  const chunks: string[] = [];
  let confidenceTotal = 0;

  for (let page = 0; page < pages; page += 1) {
    const imageBuffer = await preprocessForOcr(filePath, page);
    const pageResult = await ocrImageBuffer(imageBuffer);
    if (pageResult.text) chunks.push(pageResult.text);
    confidenceTotal += pageResult.confidence;
  }

  return {
    confidence: pages ? confidenceTotal / pages : 0,
    text: chunks.join("\n").trim(),
  };
}

function readNativeText(filePath: string, ext: string) {
  if (![".txt", ".csv", ".json"].includes(ext)) return "";
  return fsSync.readFileSync(filePath, "utf8").slice(0, 12000);
}

export async function extractClinicalText(filePath: string, mimeType: string, originalName: string): Promise<ClinicalOcrResult> {
  const ext = path.extname(originalName).toLowerCase();
  const warnings: string[] = [];

  if (process.env["PLAYWRIGHT_E2E_FAST"] === "1") {
    const nativeText = readNativeText(filePath, ext);
    const fallback = nativeText.trim().length > 20
      ? nativeText
      : fsSync.readFileSync(filePath).toString("latin1").replace(/[^\x20-\x7E\r\n\u0600-\u06FF]+/g, " ").replace(/\s+/g, " ").trim();
    const structured = parseStructuredFields(fallback);
    return {
      confidence: fallback.length > 40 ? 0.82 : 0.55,
      engine: "native",
      structured: { ...structured, confidence: fallback.length > 40 ? 0.82 : 0.55, engine: "native" },
      text: fallback.slice(0, 12_000),
      warnings,
    };
  }

  const nativeText = readNativeText(filePath, ext);
  if (nativeText.trim().length > 40) {
    const structured = parseStructuredFields(nativeText);
    return {
      confidence: 0.95,
      engine: "native",
      structured: { ...structured, confidence: 0.95, engine: "native" },
      text: nativeText.slice(0, 12000),
      warnings,
    };
  }

  const isPdf = ext === ".pdf" || mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"].includes(ext);

  if (isPdf) {
    const pdfText = await extractPdfText(filePath);
    if (pdfText.text.length > 60) {
      const structured = parseStructuredFields(pdfText.text);
      return {
        confidence: 0.88,
        engine: "pdf-parse",
        structured: { ...structured, confidence: 0.88, engine: "pdf-parse" },
        text: pdfText.text.slice(0, 12000),
        warnings,
      };
    }

    try {
      const scanned = await ocrPdfPages(filePath, Math.min(pdfText.pages || 1, 5));
      if (scanned.text.length > 20) {
        const structured = parseStructuredFields(scanned.text);
        if (scanned.confidence < 0.65) warnings.push("OCR confidence is below threshold — physician verification required.");
        return {
          confidence: scanned.confidence,
          engine: "tesseract",
          structured: { ...structured, confidence: scanned.confidence, engine: "tesseract" },
          text: scanned.text.slice(0, 12000),
          warnings,
        };
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Scanned PDF OCR failed.");
    }
  }

  if (isImage) {
    try {
      const imageBuffer = await preprocessForOcr(filePath);
      const scanned = await ocrImageBuffer(imageBuffer);
      if (scanned.text.length > 10) {
        const structured = parseStructuredFields(scanned.text);
        if (scanned.confidence < 0.65) warnings.push("OCR confidence is below threshold — physician verification required.");
        return {
          confidence: scanned.confidence,
          engine: "tesseract",
          structured: { ...structured, confidence: scanned.confidence, engine: "tesseract" },
          text: scanned.text.slice(0, 12000),
          warnings,
        };
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Image OCR failed.");
    }
  }

  const fallback = fsSync.readFileSync(filePath)
    .toString("latin1")
    .replace(/[^\x20-\x7E\r\n\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const structured = parseStructuredFields(fallback);
  warnings.push("Limited OCR extraction — manual review recommended.");
  return {
    confidence: fallback.length > 40 ? 0.45 : 0.2,
    engine: "native",
    structured: { ...structured, confidence: fallback.length > 40 ? 0.45 : 0.2, engine: "native" },
    text: fallback.slice(0, 12000),
    warnings,
  };
}

export { parseStructuredFields };
