import type { GridCalibration, LeadSegment } from "../types";

export function buildGridOverlaySvg(input: {
  calibration: GridCalibration;
  height: number;
  leadSegments: LeadSegment[];
  width: number;
}) {
  const smallSquare = input.calibration.pixelsPerSmallSquare ?? Math.max(8, Math.round(input.width / 120));
  const largeSquare = smallSquare * 5;
  const lines: string[] = [];

  for (let x = 0; x <= input.width; x += smallSquare) {
    const major = x % largeSquare === 0;
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${input.height}" stroke="${major ? "#fca5a5" : "#fecaca"}" stroke-width="${major ? 1.2 : 0.6}" opacity="0.8"/>`);
  }
  for (let y = 0; y <= input.height; y += smallSquare) {
    const major = y % largeSquare === 0;
    lines.push(`<line x1="0" y1="${y}" x2="${input.width}" y2="${y}" stroke="${major ? "#fca5a5" : "#fecaca"}" stroke-width="${major ? 1.2 : 0.6}" opacity="0.8"/>`);
  }

  const leadBoxes = input.leadSegments.map((segment) => {
    const x = (segment.xPercent / 100) * input.width;
    const y = (segment.yPercent / 100) * input.height;
    const w = (segment.widthPercent / 100) * input.width;
    const h = (segment.heightPercent / 100) * input.height;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.85"/><text x="${x + 6}" y="${y + 16}" fill="#38bdf8" font-size="12" font-family="Arial">${segment.lead}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}">${lines.join("")}${leadBoxes}</svg>`;
}

export function buildComparisonLayout() {
  return {
    modes: ["original", "processed", "comparison"] as const,
    panels: ["Original Image", "Processed Image", "Detected Leads + Grid"],
  };
}
