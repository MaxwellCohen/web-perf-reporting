export function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function formatTime(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function getRecommendationPriority(
  score: number | null | undefined,
  savings?: number,
): 'high' | 'medium' | 'low' {
  if (score === 0 || score === null || score === undefined) return 'high';
  if (score < 0.5) return 'high';
  if (score < 0.75) return 'medium';
  if (savings && savings > 1000) return 'high';
  if (savings && savings > 500) return 'medium';
  return 'low';
}

