export interface LatencyStats {
  count: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
}

export function computeStats(samplesMs: number[]): LatencyStats {
  if (samplesMs.length === 0) {
    return { count: 0, min: 0, p50: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    min: sorted[0]!,
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    max: sorted[sorted.length - 1]!,
    mean: sum / sorted.length,
  };
}

export function formatStats(label: string, stats: LatencyStats): string {
  return (
    `${label}: n=${stats.count} min=${stats.min.toFixed(1)}ms mean=${stats.mean.toFixed(1)}ms ` +
    `p50=${stats.p50.toFixed(1)}ms p95=${stats.p95.toFixed(1)}ms p99=${stats.p99.toFixed(1)}ms max=${stats.max.toFixed(1)}ms`
  );
}
