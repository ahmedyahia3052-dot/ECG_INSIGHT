import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import {
  getBenchmarkDashboard,
  getBenchmarkRunDetail,
  runClinicalBenchmark,
} from "./benchmark-engine";
import { readBenchmarkArtifact } from "./storage";

export const ecgBenchmarkRouter = Router();

ecgBenchmarkRouter.use(requireAuth, requireRole("ADMIN"));

const runSchema = z.object({
  customManifestPath: z.string().trim().optional(),
  dataset: z.enum(["ptb-xl", "physionet", "cpsc", "custom"]).default("ptb-xl"),
  maxSamples: z.number().int().min(1).max(500).optional(),
});

ecgBenchmarkRouter.get("/dashboard", async (_req, res, next) => {
  try {
    res.json({ dashboard: await getBenchmarkDashboard() });
  } catch (error) {
    next(error);
  }
});

ecgBenchmarkRouter.get("/runs", async (_req, res, next) => {
  try {
    const dashboard = await getBenchmarkDashboard();
    res.json({ runs: dashboard.recentRuns });
  } catch (error) {
    next(error);
  }
});

ecgBenchmarkRouter.get("/runs/:runId", async (req, res, next) => {
  try {
    const detail = await getBenchmarkRunDetail(String(req.params.runId));
    if (!detail) throw new AppError(404, "Benchmark run not found.", "BENCHMARK_RUN_NOT_FOUND");
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

ecgBenchmarkRouter.post("/run", async (req, res, next) => {
  try {
    const body = runSchema.parse(req.body ?? {});
    const result = await runClinicalBenchmark({
      actorId: req.auth!.id,
      customManifestPath: body.customManifestPath,
      dataset: body.dataset,
      maxSamples: body.maxSamples,
    });
    res.status(202).json({
      benchmark: result.run,
      casesProcessed: result.cases.length,
      markdownReport: await readBenchmarkArtifact(result.run.id, "report.md").then((buffer) => buffer.toString("utf8")),
      mode: "benchmark",
    });
  } catch (error) {
    next(error);
  }
});

ecgBenchmarkRouter.get("/runs/:runId/export/:format", async (req, res, next) => {
  try {
    const runId = String(req.params.runId);
    const format = String(req.params.format);
    const detail = await getBenchmarkRunDetail(runId);
    if (!detail) throw new AppError(404, "Benchmark run not found.", "BENCHMARK_RUN_NOT_FOUND");

    if (format === "csv") {
      const csv = await readBenchmarkArtifact(runId, "report.csv");
      res.setHeader("Content-Disposition", `attachment; filename="ecg-benchmark-${runId}.csv"`);
      res.type("text/csv").send(csv);
      return;
    }
    if (format === "pdf") {
      const pdf = await readBenchmarkArtifact(runId, "report.pdf");
      res.setHeader("Content-Disposition", `attachment; filename="ecg-benchmark-${runId}.pdf"`);
      res.type("application/pdf").send(pdf);
      return;
    }
    if (format === "markdown") {
      const markdown = await readBenchmarkArtifact(runId, "report.md");
      res.type("text/markdown").send(markdown);
      return;
    }
    throw new AppError(400, "Supported formats: csv, pdf, markdown.", "UNSUPPORTED_EXPORT");
  } catch (error) {
    next(error);
  }
});

ecgBenchmarkRouter.post("/import", async (req, res, next) => {
  try {
    const body = z.object({
      customManifestPath: z.string().trim(),
      dataset: z.enum(["custom"]).default("custom"),
      maxSamples: z.number().int().min(1).max(500).optional(),
    }).parse(req.body ?? {});
    const result = await runClinicalBenchmark({
      actorId: req.auth!.id,
      customManifestPath: body.customManifestPath,
      dataset: body.dataset,
      maxSamples: body.maxSamples,
    });
    res.status(202).json({ benchmark: result.run, imported: true });
  } catch (error) {
    next(error);
  }
});
