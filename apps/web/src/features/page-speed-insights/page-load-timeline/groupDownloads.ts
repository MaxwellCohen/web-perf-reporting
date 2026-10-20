import type { CombinedRequest } from "./collectTimelineSources";

function requestType(request: CombinedRequest): string {
  return request.resourceType ?? "Request";
}

function requestStart(request: CombinedRequest): number {
  return request.networkRequestTime;
}

function differentTypeStartsBetween(
  requests: CombinedRequest[],
  group: CombinedRequest[],
  start: number,
  type: string,
): boolean {
  const previousStart = requestStart(group[group.length - 1]!);
  if (start <= previousStart) return false;
  return requests.some(
    (other) =>
      requestType(other) !== type &&
      requestStart(other) > previousStart &&
      requestStart(other) < start,
  );
}

/**
 * Group contiguous same-type downloads. A different resource type starting between
 * two of the same type splits the group (matches page-load timeline behavior).
 */
export function groupDownloads(requests: CombinedRequest[]): CombinedRequest[][] {
  const sorted = [...requests].sort(
    (a, b) => requestStart(a) - requestStart(b) || a.url.localeCompare(b.url),
  );
  const groups: CombinedRequest[][] = [];
  const latestByType = new Map<string, CombinedRequest[]>();

  for (const request of sorted) {
    const type = requestType(request);
    const start = requestStart(request);
    const group = latestByType.get(type);

    if (group && !differentTypeStartsBetween(sorted, group, start, type)) {
      group.push(request);
    } else {
      const next = [request];
      groups.push(next);
      latestByType.set(type, next);
    }
  }

  return groups.sort((a, b) => requestStart(a[0]!) - requestStart(b[0]!));
}
