import type { EcgRenderViewport, EcgTwelveLeadRegion, EcgVectorModel } from "./types";
import { subPixel } from "./viewport";

/** Optional WebGL renderer for huge ECG signals — falls back gracefully when unavailable */

export type WebGLRenderState = {
  gl: WebGLRenderingContext | null;
  program: WebGLProgram | null;
  supported: boolean;
};

export function detectWebGLSupport(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

const VERTEX_SHADER = `
attribute vec2 a_position;
uniform vec2 u_resolution;
void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip * vec2(1, -1), 0, 1);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec4 u_color;
void main() { gl_FragColor = u_color; }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createWebGLRenderer(canvas: HTMLCanvasElement): WebGLRenderState {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, preserveDrawingBuffer: false });
  if (!gl) return { gl: null, program: null, supported: false };
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return { gl, program: null, supported: false };
  const program = gl.createProgram();
  if (!program) return { gl, program: null, supported: false };
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return { gl, program: null, supported: false };
  }
  return { gl, program, supported: true };
}

export function drawWaveformWebGL(
  state: WebGLRenderState,
  model: EcgVectorModel,
  regions: EcgTwelveLeadRegion[],
  viewport: EcgRenderViewport,
  width: number,
  height: number,
  color: [number, number, number, number] = [0.11, 0.31, 0.85, 1],
) {
  const { gl, program } = state;
  if (!gl || !program) return 0;
  gl.viewport(0, 0, width, height);
  gl.clearColor(1, 0.99, 0.97, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  const resLoc = gl.getUniformLocation(program, "u_resolution");
  const colorLoc = gl.getUniformLocation(program, "u_color");
  gl.uniform2f(resLoc, width, height);
  gl.uniform4f(colorLoc, color[0], color[1], color[2], color[3]);
  const posLoc = gl.getAttribLocation(program, "a_position");
  let drawCalls = 0;

  for (const segment of model.leads) {
    const region = regions.find((r) => r.lead === segment.lead);
    if (!region || segment.points.length < 2) continue;
    const positions = new Float32Array(segment.points.length * 2);
    segment.points.forEach((point, i) => {
      positions[i * 2] = subPixel(point.x + region.x);
      positions[i * 2 + 1] = subPixel(point.y + region.y);
    });
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, segment.points.length);
    gl.deleteBuffer(buffer);
    drawCalls += 1;
  }
  void viewport;
  return drawCalls;
}
