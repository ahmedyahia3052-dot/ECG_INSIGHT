/** ECG interval and QT correction calculations. */

export function clampInterval(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function qtcBazettMs(qtIntervalMs: number, rrIntervalMs: number): number {
  const rrSeconds = Math.max(rrIntervalMs / 1000, 0.2);
  return Math.round(qtIntervalMs / Math.sqrt(rrSeconds));
}

export function qtcFridericiaMs(qtIntervalMs: number, rrIntervalMs: number): number {
  const rrSeconds = Math.max(rrIntervalMs / 1000, 0.2);
  return Math.round(qtIntervalMs / Math.cbrt(rrSeconds));
}

export function qtDispersionMs(qtValues: number[]): number {
  if (!qtValues.length) return 0;
  return Math.max(...qtValues) - Math.min(...qtValues);
}
