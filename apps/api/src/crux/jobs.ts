import { queues } from "void/queues";
import type { ApiBindings } from "../bindings";
import { CURRENT_CACHE_SECONDS } from "./freshness";
import { GoogleCruxError, queryCruxCurrent, queryCruxHistory } from "./google";
import { readHistory, saveHistoryReports } from "./history-store";
import {
  cruxSlots,
  currentCacheKey,
  historyEmptyKey,
  inflightKey,
  slotFailureKey,
  type CruxSlot,
  type CruxSlotKey,
} from "./slots";

export type CruxMessage = {
  kind: "current" | "history";
  jobId: string;
  pageUrl: string;
  slotKey: CruxSlotKey;
  scope: CruxSlot["scope"];
  formFactor: CruxSlot["formFactor"];
};

export type CruxSlotResult = {
  key: CruxSlotKey;
  status: "pending" | "ready" | "failed";
  report?: unknown;
  reports?: unknown[] | null;
  error?: string;
};

export type CruxJobResponse = {
  jobId: string;
  pageUrl: string;
  kind: "current" | "history";
  slots: CruxSlotResult[];
};

type CruxJobRecord = {
  jobId: string;
  pageUrl: string;
  kind: "current" | "history";
};

type CruxQueue = { send(body: CruxMessage): Promise<void> };

const JOB_PREFIX = "crux-job:";
const INFLIGHT_SECONDS = 120;
const EMPTY_HISTORY_SECONDS = 86_400;
const INLINE_FETCH_TIMEOUT_MS = 8_000;

function cruxQueue(): CruxQueue {
  const producer = (queues as { crux?: CruxQueue }).crux;
  if (!producer) throw new Error("crux queue is not bound");
  return producer;
}

function slotFromMessage(message: CruxMessage): CruxSlot {
  return { key: message.slotKey, scope: message.scope, formFactor: message.formFactor };
}

async function readJob(env: ApiBindings, jobId: string): Promise<CruxJobRecord | null> {
  const raw = await env.KV.get(`${JOB_PREFIX}${jobId}`);
  if (!raw) return null;
  return JSON.parse(raw) as CruxJobRecord;
}

/**
 * Fetches every uncached slot from Google in parallel inside the request, so a cold lookup
 * returns in about a second. The queue is only a retry path for slots that time out or hit
 * retryable errors; the client keeps polling for those.
 */
export async function startCruxJob(
  env: ApiBindings,
  kind: "current" | "history",
  pageUrl: string,
): Promise<CruxJobResponse> {
  const job: CruxJobRecord = { jobId: crypto.randomUUID(), pageUrl, kind };
  const [slots] = await Promise.all([
    Promise.all(cruxSlots().map((slot) => startSlot(env, job, slot))),
    env.KV.put(`${JOB_PREFIX}${job.jobId}`, JSON.stringify(job)),
  ]);
  return { jobId: job.jobId, pageUrl, kind, slots };
}

async function startSlot(env: ApiBindings, job: CruxJobRecord, slot: CruxSlot): Promise<CruxSlotResult> {
  if (!(await shouldEnqueue(env, job.kind, job.pageUrl, slot))) return resolveSlot(env, job, slot);
  const lock = inflightKey(job.kind, job.pageUrl, slot);
  // Another job is already fetching this slot; report it pending and let the client poll.
  if (await env.KV.get(lock)) return resolveSlot(env, job, slot);
  await env.KV.put(lock, job.jobId, { expirationTtl: INFLIGHT_SECONDS });

  const message: CruxMessage = {
    kind: job.kind,
    jobId: job.jobId,
    pageUrl: job.pageUrl,
    slotKey: slot.key,
    scope: slot.scope,
    formFactor: slot.formFactor,
  };
  try {
    return await runCruxMessage(env, message, AbortSignal.timeout(INLINE_FETCH_TIMEOUT_MS));
  } catch (error) {
    if (isRetryableCruxError(error)) {
      await cruxQueue().send(message);
    } else {
      await failCruxMessage(env, message, error instanceof Error ? error.message : String(error));
    }
    return resolveSlot(env, job, slot);
  }
}

export async function readCruxJob(env: ApiBindings, jobId: string): Promise<CruxJobResponse> {
  const job = await readJob(env, jobId);
  if (!job) {
    return { jobId, pageUrl: "", kind: "current", slots: [] };
  }
  const slots = await Promise.all(cruxSlots().map((slot) => resolveSlot(env, job, slot)));
  return { jobId: job.jobId, pageUrl: job.pageUrl, kind: job.kind, slots };
}

async function shouldEnqueue(
  env: ApiBindings,
  kind: "current" | "history",
  pageUrl: string,
  slot: CruxSlot,
): Promise<boolean> {
  if (kind === "current") {
    return !(await env.KV.get(currentCacheKey(pageUrl, slot)));
  }
  const history = await readHistory(env, pageUrl, slot);
  if (history.fresh) return false;
  if (history.reports.length === 0 && (await env.KV.get(historyEmptyKey(pageUrl, slot)))) return false;
  return true;
}

async function resolveSlot(env: ApiBindings, job: CruxJobRecord, slot: CruxSlot): Promise<CruxSlotResult> {
  if (job.kind === "current") return resolveCurrentSlot(env, job, slot);
  return resolveHistorySlot(env, job, slot);
}

async function resolveCurrentSlot(
  env: ApiBindings,
  job: CruxJobRecord,
  slot: CruxSlot,
): Promise<CruxSlotResult> {
  const cached = await env.KV.get(currentCacheKey(job.pageUrl, slot));
  if (cached) {
    const parsed = JSON.parse(cached) as { report: unknown };
    return { key: slot.key, status: "ready", report: parsed.report };
  }
  const failure = await env.KV.get(slotFailureKey(job.jobId, slot.key));
  if (failure) return { key: slot.key, status: "failed", report: null, error: failure };
  return { key: slot.key, status: "pending", report: null };
}

async function resolveHistorySlot(
  env: ApiBindings,
  job: CruxJobRecord,
  slot: CruxSlot,
): Promise<CruxSlotResult> {
  const history = await readHistory(env, job.pageUrl, slot);
  if (history.reports.length > 0) {
    return { key: slot.key, status: "ready", reports: history.reports };
  }
  if (await env.KV.get(historyEmptyKey(job.pageUrl, slot))) {
    return { key: slot.key, status: "ready", reports: [] };
  }
  const failure = await env.KV.get(slotFailureKey(job.jobId, slot.key));
  if (failure) return { key: slot.key, status: "failed", reports: null, error: failure };
  return { key: slot.key, status: "pending", reports: null };
}

export async function runCruxMessage(
  env: ApiBindings,
  message: CruxMessage,
  signal?: AbortSignal,
): Promise<CruxSlotResult> {
  const apiKey = env.PAGESPEED_INSIGHTS_API;
  if (!apiKey) throw new Error("PAGESPEED_INSIGHTS_API is not set");
  const slot = slotFromMessage(message);

  if (message.kind === "current") {
    const report = await queryCruxCurrent(
      apiKey,
      message.pageUrl,
      message.scope,
      message.formFactor,
      signal,
    );
    await Promise.all([
      env.KV.put(
        currentCacheKey(message.pageUrl, slot),
        JSON.stringify({ report, fetchedAt: Date.now() }),
        { expirationTtl: CURRENT_CACHE_SECONDS },
      ),
      env.KV.delete(inflightKey("current", message.pageUrl, slot)),
    ]);
    return { key: slot.key, status: "ready", report };
  }

  const raw = await queryCruxHistory(apiKey, message.pageUrl, message.scope, message.formFactor, signal);
  const saved = raw ? await saveHistoryReports(env, message.pageUrl, slot, raw) : 0;
  if (saved === 0) {
    await env.KV.put(historyEmptyKey(message.pageUrl, slot), "1", { expirationTtl: EMPTY_HISTORY_SECONDS });
  }
  await env.KV.delete(inflightKey("history", message.pageUrl, slot));
  if (saved === 0) return { key: slot.key, status: "ready", reports: [] };
  const history = await readHistory(env, message.pageUrl, slot);
  return { key: slot.key, status: "ready", reports: history.reports };
}

export async function failCruxMessage(env: ApiBindings, message: CruxMessage, error: string): Promise<void> {
  await env.KV.put(slotFailureKey(message.jobId, message.slotKey), error.slice(0, 500));
  await env.KV.delete(inflightKey(message.kind, message.pageUrl, slotFromMessage(message)));
}

export function isRetryableCruxError(error: unknown): boolean {
  if (error instanceof GoogleCruxError) return error.status >= 500 || error.status === 429;
  return true;
}
