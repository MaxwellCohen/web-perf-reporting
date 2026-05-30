/**
 * Storage operations using Cloudflare Workers KV
 * Keys: record:{publicId}, url:{url} -> publicId
 */

import type {
  CreateRecordRequest,
  UpdateRecordRequest,
  RecordResponse,
} from "../types";
import { RESULTS_BUCKET_PREFIX, RESULTS_EXPIRY_DAYS } from "../constants";

const KV_PREFIX_RECORD = "record:";
const KV_PREFIX_URL = "url:";

export interface RecordFailure {
  error: string;
  stack?: string;
}

export interface StoredRecord {
  publicId: string;
  url: string;
  formFactor: string;
  date: number;
  status: string;
  dataUrl: string;
  processingStartedAt: number | null;
  failure?: RecordFailure | null;
}

function recordKey(publicId: string): string {
  return `${KV_PREFIX_RECORD}${publicId}`;
}

function urlKey(url: string): string {
  return `${KV_PREFIX_URL}${url}`;
}

/**
 * Creates a new pending record in KV
 * Returns publicId (primary key)
 */
export async function createPendingRecord(
  request: CreateRecordRequest,
  env: Env
): Promise<{ id: number; publicId: string }> {
  const publicId = crypto.randomUUID();
  const record: StoredRecord = {
    publicId,
    url: request.requestUrl,
    formFactor: request.formFactor,
    date: Date.now(),
    status: request.status,
    dataUrl: "",
    processingStartedAt: null,
  };

  await env.KV.put(recordKey(publicId), JSON.stringify(record));
  await env.KV.put(urlKey(request.requestUrl), publicId);

  return { id: 0, publicId };
}

/**
 * Updates an existing record in KV (by publicId)
 */
export async function updateRecord(
  request: UpdateRecordRequest,
  env: Env
): Promise<number | null> {
  const existing = await env.KV.get(recordKey(request.publicId));
  if (!existing) return null;

  const record: StoredRecord = {
    ...JSON.parse(existing),
    status: request.status,
    dataUrl: request.dataUrl,
    processingStartedAt: request.processingStartedAt ?? null,
  };

  if (request.status === "failed" && request.data) {
    record.failure = request.data as RecordFailure;
  } else if (request.status !== "failed") {
    record.failure = null;
  }

  await env.KV.put(recordKey(request.publicId), JSON.stringify(record));
  return 1;
}

async function recordToResponse(
  record: StoredRecord,
  env: Env
): Promise<RecordResponse> {
  let data: any = null;
  if (record.status === "failed" && record.failure) {
    data = record.failure;
  } else if (record.dataUrl) {
    const bucketData = await env.RESULTS_BUCKET.get(record.dataUrl);
    if (bucketData) {
      const text = await bucketData.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  }
  return {
    publicId: record.publicId,
    url: record.url,
    status: record.status,
    dataUrl: record.dataUrl,
    data,
    processingStartedAt: record.processingStartedAt ?? null,
  };
}

/**
 * Retrieves a record by URL and time threshold (most recent for URL with date >= threshold)
 */
export async function getRecordByUrl(
  requestUrl: string,
  timeThreshold: number,
  env: Env
): Promise<RecordResponse | null> {
  const publicId = await env.KV.get(urlKey(requestUrl));
  if (!publicId) return null;

  const raw = await env.KV.get(recordKey(publicId));
  if (!raw) return null;

  const record: StoredRecord = JSON.parse(raw);
  if (record.date < timeThreshold) return null;

  return recordToResponse(record, env);
}

/**
 * Retrieves a record by publicId (replaces getRecordById when using publicId as primary)
 */
export async function getRecordByPublicId(
  publicId: string,
  env: Env
): Promise<RecordResponse | null> {
  const raw = await env.KV.get(recordKey(publicId));
  if (!raw) return null;

  const record: StoredRecord = JSON.parse(raw);
  return recordToResponse(record, env);
}

/**
 * Lists all records (lists KV keys with prefix record:)
 */
export async function listAllRecords(env: Env): Promise<{
  total: number;
  nextId: number;
  records: Array<{
    publicId: string;
    url: string;
    formFactor: string;
    date: number;
    status: string;
    dataUrl: string;
    hasData: boolean;
  }>;
}> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const list = await env.KV.list({ prefix: KV_PREFIX_RECORD, cursor, limit: 1000 });
    keys.push(...list.keys.map((k) => k.name));
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  const records: Array<{
    publicId: string;
    url: string;
    formFactor: string;
    date: number;
    status: string;
    dataUrl: string;
    hasData: boolean;
  }> = [];

  for (const key of keys) {
    const raw = await env.KV.get(key);
    if (!raw) continue;
    const r: StoredRecord = JSON.parse(raw);
    records.push({
      publicId: r.publicId,
      url: r.url,
      formFactor: r.formFactor,
      date: r.date,
      status: r.status,
      dataUrl: r.dataUrl,
      hasData: !!r.dataUrl,
    });
  }

  records.sort((a, b) => b.date - a.date);

  return {
    total: records.length,
    nextId: 1,
    records,
  };
}

/**
 * Saves PageSpeed results to R2 bucket
 */
export async function saveResultsToBucket(
  _recordId: number,
  url: string,
  results: any[],
  env: Env,
  publicId?: string
): Promise<string> {
  const idPart = publicId ?? _recordId;
  const key = `${RESULTS_BUCKET_PREFIX}${idPart}-${encodeURIComponent(url)}.json`;
  const expiresAt = new Date(
    Date.now() + RESULTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await env.RESULTS_BUCKET.put(key, JSON.stringify(results), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { expiresAt },
  });

  return key;
}

/**
 * Deletes old records from KV (older than daysOld)
 */
export async function deleteOldRecordsFromStorage(
  daysOld: number = 10,
  env: Env
): Promise<{ success: boolean; deletedCount: number; daysOld: number }> {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const list = await env.KV.list({ prefix: KV_PREFIX_RECORD, cursor, limit: 1000 });
    keys.push(...list.keys.map((k) => k.name));
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  let deletedCount = 0;
  for (const key of keys) {
    const raw = await env.KV.get(key);
    if (!raw) continue;
    const r: StoredRecord = JSON.parse(raw);
    if (r.date < cutoff) {
      await env.KV.delete(key);
      const urlVal = await env.KV.get(urlKey(r.url));
      if (urlVal === r.publicId) await env.KV.delete(urlKey(r.url));
      deletedCount++;
    }
  }

  return { success: true, deletedCount, daysOld };
}

/**
 * Gets records stuck in processing longer than maxProcessingDurationMs
 */
export async function getStuckProcessingRecords(
  maxProcessingDurationMs: number,
  env: Env
): Promise<
  Array<{
    id: number;
    publicId: string;
    url: string;
    formFactor: string;
    date: number;
    status: string;
    processingStartedAt: number | null;
    data: any;
  }>
> {
  const cutoff = Date.now() - maxProcessingDurationMs;
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const list = await env.KV.list({ prefix: KV_PREFIX_RECORD, cursor, limit: 1000 });
    keys.push(...list.keys.map((k) => k.name));
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  const out: Array<{
    id: number;
    publicId: string;
    url: string;
    formFactor: string;
    date: number;
    status: string;
    processingStartedAt: number | null;
    data: any;
  }> = [];

  for (const key of keys) {
    const raw = await env.KV.get(key);
    if (!raw) continue;
    const r: StoredRecord = JSON.parse(raw);
    if (
      r.status === "processing" &&
      r.processingStartedAt != null &&
      r.processingStartedAt < cutoff
    ) {
      out.push({
        id: 0,
        publicId: r.publicId,
        url: r.url,
        formFactor: r.formFactor,
        date: r.date,
        status: r.status,
        processingStartedAt: r.processingStartedAt,
        data: null,
      });
    }
  }

  return out;
}
