export type WorkerJobEnvelope = { status: string; url?: string; data?: unknown };

export type ResolvedWorkerEnvelope =
  | { kind: "missing" }
  | { kind: "pending"; envelope: WorkerJobEnvelope }
  | { kind: "failed"; error: string; url?: string }
  | { kind: "ready"; body: string }
  | { kind: "ready_envelope"; envelope: WorkerJobEnvelope };

export function getTestUrlFromEnvelope(data: WorkerJobEnvelope): string | undefined {
  if (typeof data.url === "string" && data.url.length > 0) {
    return data.url;
  }
  return undefined;
}

export function getFailureMessageFromEnvelope(data: WorkerJobEnvelope): string {
  const payload = data.data;
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  if (typeof payload === "string" && payload.length > 0) {
    return payload;
  }
  return "The PageSpeed Insights report could not be generated.";
}

/** Single resolver for worker job envelope → pending | failed | ready. */
export function resolveWorkerEnvelope(
  data: WorkerJobEnvelope | null | undefined,
): ResolvedWorkerEnvelope {
  if (!data) {
    return { kind: "missing" };
  }

  const status = data.status.toLowerCase();
  if (status === "failed") {
    const url = getTestUrlFromEnvelope(data);
    return {
      kind: "failed",
      error: getFailureMessageFromEnvelope(data),
      ...(url ? { url } : {}),
    };
  }

  if (status !== "completed") {
    return { kind: "pending", envelope: data };
  }

  if (typeof data.data === "string" && data.data.length > 0) {
    return { kind: "ready", body: data.data };
  }

  if (data.data !== undefined && data.data !== null) {
    return { kind: "ready", body: JSON.stringify(data.data) };
  }

  return { kind: "ready_envelope", envelope: data };
}

export type CompletedPayloadResult =
  | { ok: true; payload: string }
  | { ok: false; reason: "not_ready" | "failed" | "empty" };

export function getCompletedPayloadFromEnvelope(
  data: WorkerJobEnvelope | null | undefined,
): CompletedPayloadResult {
  const resolved = resolveWorkerEnvelope(data);
  switch (resolved.kind) {
    case "ready":
      return { ok: true, payload: resolved.body };
    case "failed":
      return { ok: false, reason: "failed" };
    case "pending":
      return { ok: false, reason: "not_ready" };
    case "missing":
    case "ready_envelope":
      return { ok: false, reason: "empty" };
  }
}
