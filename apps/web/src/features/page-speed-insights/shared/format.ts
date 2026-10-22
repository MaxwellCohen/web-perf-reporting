export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  const abs = Math.abs(ms);
  if (abs < 1000) return `${Math.round(ms)} ms`;
  if (abs >= 10000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${Math.round(bytes)} B`;
}

export function formatMsOptional(ms?: number | null): string {
  if (!ms) return "";
  return formatMs(ms);
}

export function formatBytesOptional(bytes?: number | null): string {
  if (!bytes) return "";
  return formatBytes(bytes);
}

/** Chrome DevTools network priority labels (VeryHigh, VeryLow, …). */
export function formatNetworkPriority(priority: string): string {
  if (priority === "VeryHigh") return "Very High";
  if (priority === "VeryLow") return "Very Low";
  return priority;
}

export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 40 ? `${u.pathname.slice(0, 37)}…` : u.pathname;
    return `${u.host}${path}`;
  } catch {
    return url.length > 60 ? `${url.slice(0, 57)}…` : url;
  }
}

type CoverageAmounts = { totalBytes: number; wastedBytes: number };

export function formatCoverage(coverage: CoverageAmounts): string {
  const wastedBytes = Math.max(0, coverage.wastedBytes);
  const totalBytes = Math.max(coverage.totalBytes, wastedBytes);
  const usedBytes = totalBytes - wastedBytes;
  const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
  if (wastedBytes <= 0) return `${usedPercent}% used · ${formatBytes(totalBytes)}`;
  return `${usedPercent}% used · ${formatBytes(usedBytes)} used of ${formatBytes(totalBytes)} · ${formatBytes(wastedBytes)} unused`;
}

export function coverageLabel<T extends { coverage?: CoverageAmounts }>(
  item: T,
): string | undefined {
  return item.coverage ? formatCoverage(item.coverage) : undefined;
}
