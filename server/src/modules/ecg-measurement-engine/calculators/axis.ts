/** Frontal plane electrical axis calculations. */

export function electricalAxisDeg(netI: number, netAvf: number): number {
  const radians = Math.atan2(netAvf, netI);
  const degrees = radians * (180 / Math.PI);
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized > 180 ? Number((normalized - 360).toFixed(1)) : Number(normalized.toFixed(1));
}
