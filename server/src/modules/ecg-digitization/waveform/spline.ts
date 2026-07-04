export function catmullRomSpline(points: Array<{ x: number; y: number }>, samplesPerSegment = 4): Array<{ x: number; y: number }> {
  if (points.length < 2) return points;
  const output: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    for (let step = 0; step < samplesPerSegment; step += 1) {
      const t = step / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      output.push({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
    }
  }
  output.push(points[points.length - 1]);
  return output;
}

export function recoverGaps(values: number[], maxGap = 6): { gapRecovered: number; values: number[] } {
  const output = [...values];
  let gapRecovered = 0;
  for (let index = 1; index < output.length; index += 1) {
    if (output[index] === 0 && output[index - 1] !== 0) {
      let end = index;
      while (end < output.length && output[end] === 0 && end - index < maxGap) end += 1;
      if (end < output.length && output[end] !== 0 && end - index <= maxGap) {
        const startValue = output[index - 1];
        const endValue = output[end];
        for (let gap = index; gap < end; gap += 1) {
          const ratio = (gap - index + 1) / (end - index + 1);
          output[gap] = startValue + (endValue - startValue) * ratio;
          gapRecovered += 1;
        }
      }
    }
  }
  return { gapRecovered, values: output };
}
