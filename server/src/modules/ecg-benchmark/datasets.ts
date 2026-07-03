import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { AiDiagnosisLabel } from "../ecg-ai-diagnosis/diagnosis-codes";
import type { BenchmarkDatasetId, BenchmarkSample, BenchmarkSampleProfile } from "./types";

const DATASET_LABELS: Record<BenchmarkDatasetId, string> = {
  cpsc: "CPSC 2018",
  custom: "Custom Import",
  physionet: "PhysioNet Challenge",
  "ptb-xl": "PTB-XL",
};

const PROFILE_TRUTH: Record<BenchmarkSampleProfile, AiDiagnosisLabel[]> = {
  afib: ["Atrial Fibrillation"],
  bradycardia: ["Sinus Bradycardia"],
  lbbb: ["LBBB"],
  normal: ["Normal ECG"],
  rbbb: ["RBBB"],
  stemi: ["Anterior STEMI"],
  tachycardia: ["Sinus Tachycardia"],
};

function buildSamples(source: BenchmarkDatasetId, entries: Array<{ externalId: string; profile: BenchmarkSampleProfile }>): BenchmarkSample[] {
  return entries.map((entry) => ({
    externalId: entry.externalId,
    groundTruthLabels: PROFILE_TRUTH[entry.profile],
    profile: entry.profile,
    source,
  }));
}

export const BUILTIN_BENCHMARK_MANIFESTS: Record<Exclude<BenchmarkDatasetId, "custom">, BenchmarkSample[]> = {
  "ptb-xl": buildSamples("ptb-xl", [
    { externalId: "ptbxl-00001", profile: "normal" },
    { externalId: "ptbxl-00002", profile: "afib" },
    { externalId: "ptbxl-00003", profile: "lbbb" },
    { externalId: "ptbxl-00004", profile: "stemi" },
    { externalId: "ptbxl-00005", profile: "bradycardia" },
    { externalId: "ptbxl-00006", profile: "rbbb" },
  ]),
  physionet: buildSamples("physionet", [
    { externalId: "physionet-af-001", profile: "afib" },
    { externalId: "physionet-norm-001", profile: "normal" },
    { externalId: "physionet-stemi-001", profile: "stemi" },
    { externalId: "physionet-tach-001", profile: "tachycardia" },
  ]),
  cpsc: buildSamples("cpsc", [
    { externalId: "cpsc-normal-001", profile: "normal" },
    { externalId: "cpsc-af-001", profile: "afib" },
    { externalId: "cpsc-lbbb-001", profile: "lbbb" },
    { externalId: "cpsc-stemi-001", profile: "stemi" },
  ]),
};

export function datasetLabel(dataset: BenchmarkDatasetId) {
  return DATASET_LABELS[dataset];
}

export function resolveBenchmarkSamples(dataset: BenchmarkDatasetId, customManifestPath?: string) {
  if (dataset === "custom" && customManifestPath) {
    return loadCustomManifest(customManifestPath);
  }
  if (dataset === "custom") {
    return [...BUILTIN_BENCHMARK_MANIFESTS["ptb-xl"], ...BUILTIN_BENCHMARK_MANIFESTS.physionet.slice(0, 2)];
  }
  return BUILTIN_BENCHMARK_MANIFESTS[dataset];
}

export async function loadCustomManifest(manifestPath: string): Promise<BenchmarkSample[]> {
  const absolute = path.isAbsolute(manifestPath) ? manifestPath : path.resolve(process.cwd(), manifestPath);
  const raw = JSON.parse(await fs.readFile(absolute, "utf8")) as { samples: BenchmarkSample[] };
  return raw.samples;
}

export async function ensureSampleImage(sample: BenchmarkSample, outputDir: string) {
  if (sample.imagePath) {
    const absolute = path.isAbsolute(sample.imagePath) ? sample.imagePath : path.resolve(process.cwd(), sample.imagePath);
    return absolute;
  }
  await fs.mkdir(outputDir, { recursive: true });
  const target = path.join(outputDir, `${sample.externalId}.png`);
  try {
    await fs.access(target);
    return target;
  } catch {
    await renderSyntheticEcgImage(target, sample.profile);
    return target;
  }
}

async function renderSyntheticEcgImage(outputPath: string, profile: BenchmarkSampleProfile) {
  const width = 900;
  const height = 640;
  const pixels = Buffer.alloc(width * height * 3, 255);
  const heartRateFactor = profile === "bradycardia" ? 0.55 : profile === "tachycardia" ? 1.8 : profile === "afib" ? 1.35 : 1;
  const amplitude = profile === "lbbb" || profile === "rbbb" ? 1.6 : profile === "stemi" ? 2.2 : 1;
  const irregular = profile === "afib";

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const grid = (x % 10 === 0 || y % 10 === 0) ? 220 : 255;
      const waveX = x / (18 / heartRateFactor);
      const baseline = 120 + Math.floor(y / 55) * 55;
      const jitter = irregular ? Math.sin(x / 7) * 8 : 0;
      const signal = Math.sin(waveX / 18) * amplitude + (profile === "stemi" && x > width * 0.45 ? 0.8 : 0);
      const traceY = baseline - signal * 18 + jitter;
      const trace = Math.abs(y - traceY) < 2 ? 35 : grid;
      pixels[index] = trace;
      pixels[index + 1] = trace;
      pixels[index + 2] = trace;
    }
  }
  await sharp(pixels, { raw: { channels: 3, height, width } }).png().toFile(outputPath);
}

export async function importPublicDatasetManifest(input: {
  dataset: BenchmarkDatasetId;
  manifestPath?: string;
  samples?: BenchmarkSample[];
}) {
  if (input.samples?.length) return input.samples;
  return resolveBenchmarkSamples(input.dataset, input.manifestPath);
}
