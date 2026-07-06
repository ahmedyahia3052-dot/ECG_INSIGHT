import type { DigitalEcg } from "@/services/ecgProcessing";

import { gridSpacingPx } from "../ecgCalibrationMath";
import type { EcgRenderGridSettings } from "../rendering-engine/types";
import { screenToSignal } from "../rendering-engine/viewport";
import type { EcgTwelveLeadRegion } from "../rendering-engine/types";
import type { EcgCrosshairTelemetry } from "./types";

export function computeCrosshairTelemetry(
  x: number,
  y: number,
  regions: EcgTwelveLeadRegion[],
  digitalEcg: DigitalEcg,
  grid: EcgRenderGridSettings,
  viewport: { containerHeight: number; containerWidth: number; dpr: number; panX: number; panY: number; signalHeight: number; signalWidth: number; zoom: number },
): EcgCrosshairTelemetry {
  const region = regions.find((r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) ?? null;
  const lead = region?.lead ?? null;
  const localX = region ? x - region.x : x;
  const localY = region ? y - region.y : y;
  const leadData = lead ? digitalEcg.leads.find((l) => l.lead === lead) : digitalEcg.leads[0];
  const rate = leadData?.samplingRate ?? 500;
  const sampleCount = leadData?.samples.length ?? 0;
  const durationMs = sampleCount > 0 ? (sampleCount / rate) * 1000 : 0;
  const regionW = region?.width ?? viewport.signalWidth;
  const ms = (localX / Math.max(regionW, 1)) * durationMs;
  const sampleIndex = Math.round((ms / 1000) * rate);
  const spacing = gridSpacingPx(grid.speed, grid.gain) * viewport.zoom;
  const smallBoxesY = (localY - (region?.height ?? viewport.signalHeight) / 2) / Math.max(spacing, 1);
  const mv = smallBoxesY * (0.1 * (10 / grid.gain)) * -1;
  const signal = screenToSignal(viewport, x, y);

  return {
    beatMs: ms,
    lead,
    milliseconds: Number(ms.toFixed(1)),
    sampleIndex: Math.max(0, Math.min(sampleCount - 1, sampleIndex)),
    timeLabel: `${ms.toFixed(1)} ms`,
    voltageLabel: `${mv.toFixed(3)} mV`,
    x: signal.x,
    y: signal.y,
  };
}
