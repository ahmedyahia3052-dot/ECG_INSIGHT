import type { DigitalEcgLead } from "@/services/ecgProcessing";

import type { MonitorCanvasState } from "../ecgMonitorCanvas";
import { drawMultiLeadMonitorCanvas } from "../ecgMonitorCanvas";
import {
  drawRenderEngine2MonitorFrame,
  HospitalRealtimeEngine,
  isRenderEngine2GpuReady,
  RENDER_ENGINE_2_VERSION,
} from "../render-engine-2";

/** Singleton RE2 engine — one offscreen buffer per monitor canvas host. */
let sharedRealtimeEngine: HospitalRealtimeEngine | null = null;

function getRealtimeEngine() {
  if (!sharedRealtimeEngine) {
    sharedRealtimeEngine = new HospitalRealtimeEngine();
  }
  return sharedRealtimeEngine;
}

export function hospitalMonitorRendererVersion() {
  return isRenderEngine2GpuReady() ? RENDER_ENGINE_2_VERSION : "ecgMonitorCanvas-v1";
}

export function paintHospitalMonitorFrame(
  ctx: CanvasRenderingContext2D,
  leads: DigitalEcgLead[],
  width: number,
  height: number,
  state: MonitorCanvasState,
) {
  if (width < 8 || height < 8 || !leads.length) return;

  if (isRenderEngine2GpuReady()) {
    drawRenderEngine2MonitorFrame(ctx, leads, width, height, state);
    return;
  }

  drawMultiLeadMonitorCanvas(ctx, leads, width, height, state);
}

export function resetHospitalMonitorRenderer() {
  sharedRealtimeEngine?.stopLoop();
  sharedRealtimeEngine = null;
}

export { getRealtimeEngine };
