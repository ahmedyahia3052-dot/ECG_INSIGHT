import { drawMonitorCanvas, type MonitorCanvasState } from "../ecgMonitorCanvas";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { drawGridCanvas2d } from "./gridRenderer";
import type { EcgInteractionState, EcgRenderGridSettings, EcgRenderViewport, EcgTwelveLeadRegion, EcgVectorModel } from "./types";
import { vectorPointsToSmoothPath } from "./vectorModel";
import { effectiveDpr, subPixel } from "./viewport";

export type Canvas2dRenderContext = {
  ctx: CanvasRenderingContext2D;
  height: number;
  width: number;
};

export function configureCanvas2d(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  viewport: EcgRenderViewport,
) {
  const dpr = effectiveDpr(viewport);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

export function drawWaveformCanvas2d(
  ctx: CanvasRenderingContext2D,
  model: EcgVectorModel,
  regions: EcgTwelveLeadRegion[],
  viewport: EcgRenderViewport,
  interaction: EcgInteractionState,
) {
  const dpr = effectiveDpr(viewport);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const segment of model.leads) {
    const region = regions.find((r) => r.lead === segment.lead);
    if (!region || segment.points.length < 2) continue;
    const highlighted =
      interaction.highlightedLead === segment.lead ||
      interaction.hoverLead === segment.lead ||
      interaction.selectedLeads.includes(segment.lead);
    ctx.strokeStyle = highlighted ? "#FACC15" : "#1D4ED8";
    ctx.lineWidth = highlighted ? 2.2 : 1.6;
    ctx.beginPath();
    segment.points.forEach((point, index) => {
      const x = subPixel(point.x + region.x);
      const y = subPixel(point.y + region.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

export function drawMonitorLeadCanvas2d(
  ctx: CanvasRenderingContext2D,
  lead: DigitalEcgLead,
  width: number,
  height: number,
  state: MonitorCanvasState,
) {
  drawMonitorCanvas(ctx, lead, width, height, state);
}

export function drawDigitizedCanvas2d(
  ctx: CanvasRenderingContext2D,
  model: EcgVectorModel,
  regions: EcgTwelveLeadRegion[],
  grid: EcgRenderGridSettings,
  viewport: EcgRenderViewport,
  interaction: EcgInteractionState,
  width: number,
  height: number,
) {
  const dpr = effectiveDpr(viewport);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#FFFDF8";
  ctx.fillRect(0, 0, width, height);

  for (const region of regions) {
    drawGridCanvas2d(ctx, { grid, height: region.height, offsetX: region.x, offsetY: region.y, viewport, width: region.width });
    ctx.fillStyle = "#991B1B";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillText(String(region.lead), region.x + 8, region.y + 16);
  }

  drawWaveformCanvas2d(ctx, model, regions, viewport, interaction);

  if (interaction.crosshair) {
    ctx.strokeStyle = "rgba(29, 78, 216, 0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(interaction.crosshair.x, 0);
    ctx.lineTo(interaction.crosshair.x, height);
    ctx.moveTo(0, interaction.crosshair.y);
    ctx.lineTo(width, interaction.crosshair.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (interaction.beatCursorMs != null && model.samplingRate > 0) {
    const sampleIndex = Math.round((interaction.beatCursorMs / 1000) * model.samplingRate);
    const maxSamples = Math.max(...model.leads.map((l) => l.sampleEnd), 1);
    const x = (sampleIndex / maxSamples) * width;
    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

export function waveformPathForCanvas(model: EcgVectorModel, region: EcgTwelveLeadRegion) {
  const segment = model.leads.find((l) => l.lead === region.lead);
  if (!segment) return "";
  return vectorPointsToSmoothPath(segment.points, region.x, region.y);
}
