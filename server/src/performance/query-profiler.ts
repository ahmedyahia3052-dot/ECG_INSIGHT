export type QueryTimingSample = {
  durationMs: number;
  label: string;
};

export async function profileQuery<T>(label: string, operation: () => Promise<T>): Promise<{ result: T; sample: QueryTimingSample }> {
  const started = performance.now();
  const result = await operation();
  return {
    result,
    sample: {
      durationMs: performance.now() - started,
      label,
    },
  };
}

export function summarizeTimings(samples: QueryTimingSample[]) {
  const durations = samples.map((sample) => sample.durationMs).sort((left, right) => left - right);
  const totalMs = durations.reduce((sum, value) => sum + value, 0);
  const p95Index = Math.max(0, Math.floor(durations.length * 0.95) - 1);
  return {
    count: durations.length,
    maxMs: durations.at(-1) ?? 0,
    meanMs: durations.length ? totalMs / durations.length : 0,
    minMs: durations[0] ?? 0,
    p95Ms: durations[p95Index] ?? 0,
    totalMs,
  };
}
