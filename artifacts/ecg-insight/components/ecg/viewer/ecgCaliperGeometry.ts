import type { EcgCaliper, EcgCaliperKind, ImagePoint } from "./measurementTypes";

export function polylineLength(points: ImagePoint[]) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]!;
    const next = points[index]!;
    total += Math.hypot(next.x - prev.x, next.y - prev.y);
  }
  return total;
}

export function caliperPathPoints(caliper: EcgCaliper): ImagePoint[] {
  if (caliper.kind === "multi" && caliper.waypoints?.length) {
    return caliper.waypoints;
  }
  return [caliper.start, caliper.end];
}

export function computeAngleDegrees(vertex: ImagePoint, armA: ImagePoint, armB: ImagePoint) {
  const vectorA = { x: armA.x - vertex.x, y: armA.y - vertex.y };
  const vectorB = { x: armB.x - vertex.x, y: armB.y - vertex.y };
  const magnitudeA = Math.hypot(vectorA.x, vectorA.y);
  const magnitudeB = Math.hypot(vectorB.x, vectorB.y);
  if (magnitudeA <= 0 || magnitudeB <= 0) return 0;
  const dot = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
  const cosine = Math.min(1, Math.max(-1, dot / (magnitudeA * magnitudeB)));
  return Number(((Math.acos(cosine) * 180) / Math.PI).toFixed(1));
}

export function deltaPixelsForCaliper(caliper: EcgCaliper) {
  if (caliper.kind === "multi") {
    return polylineLength(caliperPathPoints(caliper));
  }
  if (caliper.kind === "angle" && caliper.vertex) {
    return computeAngleDegrees(caliper.vertex, caliper.start, caliper.end);
  }
  if (caliper.kind === "horizontal") return Math.abs(caliper.end.x - caliper.start.x);
  if (caliper.kind === "vertical") return Math.abs(caliper.end.y - caliper.start.y);
  return Math.hypot(caliper.end.x - caliper.start.x, caliper.end.y - caliper.start.y);
}

export function caliperPrimaryUnit(kind: EcgCaliperKind, measurementKind?: string) {
  if (kind === "angle") return "deg";
  if (kind === "vertical" && measurementKind !== "st_elevation" && measurementKind !== "st_depression") return "mV";
  if (kind === "vertical") return "mm";
  if (kind === "horizontal" || kind === "multi") return "ms";
  if (kind === "distance") return "px";
  return "ms";
}

export function arcPath(vertex: ImagePoint, armA: ImagePoint, armB: ImagePoint, radius = 28) {
  const angleA = Math.atan2(armA.y - vertex.y, armA.x - vertex.x);
  const angleB = Math.atan2(armB.y - vertex.y, armB.x - vertex.x);
  const startX = vertex.x + Math.cos(angleA) * radius;
  const startY = vertex.y + Math.sin(angleA) * radius;
  const endX = vertex.x + Math.cos(angleB) * radius;
  const endY = vertex.y + Math.sin(angleB) * radius;
  let sweep = angleB - angleA;
  while (sweep <= -Math.PI) sweep += Math.PI * 2;
  while (sweep > Math.PI) sweep -= Math.PI * 2;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${endX} ${endY}`;
}
