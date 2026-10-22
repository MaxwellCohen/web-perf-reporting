import type { ApiBindings } from "../bindings";
import { RESULTS_BUCKET_PREFIX, RESULTS_EXPIRY_DAYS, type PageSpeedStrategy } from "./constants";

const KV_PREFIX_RECORD = "record:";
const KV_PREFIX_URL = "url:";

export type StoredRecord = {
  publicId: string;
  url: string;
  formFactor: string;
  date: number;
  status: string;
  dataUrl: string;
  processingStartedAt: number | null;
  queued?: boolean;
  failure?: { error: string; stack?: string } | null;
};

export type StrategyState = {
  status: "completed" | "failed";
  dataUrl?: string;
  error?: string;
};

export type RecordResponse = {
  publicId: string;
  url: string;
  status: string;
  dataUrl: string;
  data: unknown;
  processingStartedAt: number | null;
};

function recordKey(publicId: string): string {
  return `${KV_PREFIX_RECORD}${publicId}`;
}

function urlKey(url: string): string {
  return `${KV_PREFIX_URL}${url}`;
}

export function strategyKey(publicId: string, strategy: PageSpeedStrategy): string {
  return `${KV_PREFIX_RECORD}${publicId}:strategy:${strategy}`;
}

export async function readStoredRecord(env: ApiBindings, publicId: string): Promise<StoredRecord | null> {
  const raw = await env.KV.get(recordKey(publicId));
  if (!raw) return null;
  return JSON.parse(raw) as StoredRecord;
}

export async function writeStoredRecord(env: ApiBindings, record: StoredRecord): Promise<void> {
  await env.KV.put(recordKey(record.publicId), JSON.stringify(record));
}

export async function createPendingRecord(env: ApiBindings, requestUrl: string): Promise<StoredRecord> {
  const record: StoredRecord = {
    publicId: crypto.randomUUID(),
    url: requestUrl,
    formFactor: "ALL",
    date: Date.now(),
    status: "pending",
    dataUrl: "",
    processingStartedAt: null,
    queued: false,
  };
  await writeStoredRecord(env, record);
  await env.KV.put(urlKey(requestUrl), record.publicId);
  return record;
}

export async function getRecordByUrl(
  env: ApiBindings,
  requestUrl: string,
  timeThreshold: number,
): Promise<StoredRecord | null> {
  const publicId = await env.KV.get(urlKey(requestUrl));
  if (!publicId) return null;
  const record = await readStoredRecord(env, publicId);
  if (!record || record.date < timeThreshold) return null;
  return record;
}

export async function readStrategy(
  env: ApiBindings,
  publicId: string,
  strategy: PageSpeedStrategy,
): Promise<StrategyState | null> {
  const raw = await env.KV.get(strategyKey(publicId, strategy));
  if (!raw) return null;
  return JSON.parse(raw) as StrategyState;
}

export async function writeStrategy(
  env: ApiBindings,
  publicId: string,
  strategy: PageSpeedStrategy,
  state: StrategyState,
): Promise<void> {
  await env.KV.put(strategyKey(publicId, strategy), JSON.stringify(state));
}

export function strategyObjectKey(publicId: string, strategy: PageSpeedStrategy): string {
  return `${RESULTS_BUCKET_PREFIX}${publicId}-${strategy}.json`;
}

export function combinedObjectKey(publicId: string, url: string): string {
  return `${RESULTS_BUCKET_PREFIX}${publicId}-${encodeURIComponent(url)}.json`;
}

export async function saveJson(env: ApiBindings, key: string, value: unknown): Promise<void> {
  const expiresAt = new Date(Date.now() + RESULTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.RESULTS_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { expiresAt },
  });
}

export async function readJson(env: ApiBindings, key: string): Promise<unknown> {
  const object = await env.RESULTS_BUCKET.get(key);
  if (!object) return null;
  const text = await object.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function deleteOldRecords(env: ApiBindings, daysOld = 10): Promise<{ deletedCount: number }> {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const list = await env.KV.list({ prefix: KV_PREFIX_RECORD, cursor, limit: 1000 });
    keys.push(...list.keys.map((key) => key.name));
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  let deletedCount = 0;
  for (const key of keys) {
    if (key.includes(":strategy:")) continue;
    const raw = await env.KV.get(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as StoredRecord;
    if (record.date >= cutoff) continue;
    await env.KV.delete(key);
    await env.KV.delete(strategyKey(record.publicId, "mobile"));
    await env.KV.delete(strategyKey(record.publicId, "desktop"));
    const urlVal = await env.KV.get(urlKey(record.url));
    if (urlVal === record.publicId) await env.KV.delete(urlKey(record.url));
    deletedCount++;
  }
  return { deletedCount };
}
