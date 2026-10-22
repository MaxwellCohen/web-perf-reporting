import { queues } from "void/queues";
import type { ApiBindings } from "../bindings";
import { CACHE_DURATION_MS, type PageSpeedStrategy } from "./constants";
import { fetchPageSpeedData } from "./api";
import {
  createPendingRecord,
  getRecordByUrl,
  readStoredRecord,
  writeStoredRecord,
  type RecordResponse,
} from "./storage";
import { pageSpeedResponse, storeStrategyResult } from "./status";

export type PageSpeedMessage = {
  publicId: string;
  url: string;
  strategy: PageSpeedStrategy;
};

type PageSpeedQueue = { send(body: PageSpeedMessage): Promise<void> };

function pageSpeedQueue(): PageSpeedQueue {
  const producer = (queues as { pagespeed?: PageSpeedQueue }).pagespeed;
  if (!producer) throw new Error("pagespeed queue is not bound");
  return producer;
}

export async function enqueuePageSpeed(env: ApiBindings, recordPublicId: string, url: string): Promise<void> {
  const record = await readStoredRecord(env, recordPublicId);
  if (!record || record.queued || record.status === "completed" || record.status === "failed") return;
  await writeStoredRecord(env, { ...record, queued: true });
  try {
    const queue = pageSpeedQueue();
    await queue.send({ publicId: recordPublicId, url, strategy: "mobile" });
    await queue.send({ publicId: recordPublicId, url, strategy: "desktop" });
  } catch (error) {
    await writeStoredRecord(env, { ...record, queued: false });
    throw error;
  }
}

export async function startPageSpeed(env: ApiBindings, requestUrl: string): Promise<RecordResponse | null> {
  const existing = await getRecordByUrl(env, requestUrl, Date.now() - CACHE_DURATION_MS);
  if (existing?.status === "completed" || existing?.status === "pending" || existing?.status === "processing") {
    return pageSpeedResponse(env, existing.publicId);
  }

  const record = await createPendingRecord(env, requestUrl);
  try {
    await enqueuePageSpeed(env, record.publicId, requestUrl);
  } catch (error) {
    await writeStoredRecord(env, {
      ...record,
      status: "failed",
      failure: { error: error instanceof Error ? error.message : String(error) },
    });
  }
  return pageSpeedResponse(env, record.publicId);
}

/** Old pending rows were run inside the poll request. Queue them once instead. */
export async function ensurePageSpeedQueued(env: ApiBindings, publicId: string): Promise<void> {
  const record = await readStoredRecord(env, publicId);
  if (!record || record.queued || record.status === "completed" || record.status === "failed") return;
  await enqueuePageSpeed(env, record.publicId, record.url);
}

export async function runPageSpeedStrategy(env: ApiBindings, message: PageSpeedMessage): Promise<void> {
  const apiKey = env.PAGESPEED_INSIGHTS_API;
  if (!apiKey) throw new Error("PAGESPEED_INSIGHTS_API is not set");
  const result = await fetchPageSpeedData(message.url, message.strategy, apiKey);
  const error =
    result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error
      : null;
  if (error) throw new Error(error);
  await storeStrategyResult(env, message.publicId, message.strategy, result);
}

export async function failPageSpeedStrategy(env: ApiBindings, message: PageSpeedMessage, error: string): Promise<void> {
  await storeStrategyResult(env, message.publicId, message.strategy, { error });
}
