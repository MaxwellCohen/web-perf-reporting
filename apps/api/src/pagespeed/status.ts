import type { ApiBindings } from "../bindings";
import {
  combinedObjectKey,
  readJson,
  readStoredRecord,
  readStrategy,
  saveJson,
  strategyObjectKey,
  writeStoredRecord,
  writeStrategy,
  type RecordResponse,
  type StoredRecord,
  type StrategyState,
} from "./storage";

export type DerivedPageSpeed = {
  status: "pending" | "completed" | "failed";
  error?: string;
  mobileKey?: string;
  desktopKey?: string;
};

export function derivePageSpeedStatus(
  record: StoredRecord,
  mobile: StrategyState | null,
  desktop: StrategyState | null,
): DerivedPageSpeed {
  if (record.status === "completed" && record.dataUrl) {
    return { status: "completed" };
  }
  if (record.status === "failed") {
    return { status: "failed", error: record.failure?.error };
  }
  if (mobile?.status === "failed" || desktop?.status === "failed") {
    return {
      status: "failed",
      error: mobile?.error || desktop?.error || "PageSpeed API error",
    };
  }
  if (mobile?.status === "completed" && desktop?.status === "completed") {
    return {
      status: "completed",
      mobileKey: mobile.dataUrl,
      desktopKey: desktop.dataUrl,
    };
  }
  return { status: "pending" };
}

export async function pageSpeedResponse(env: ApiBindings, publicId: string): Promise<RecordResponse | null> {
  const record = await readStoredRecord(env, publicId);
  if (!record) return null;

  if (record.status === "completed" && record.dataUrl) {
    return {
      publicId: record.publicId,
      url: record.url,
      status: "completed",
      dataUrl: record.dataUrl,
      data: await readJson(env, record.dataUrl),
      processingStartedAt: record.processingStartedAt,
    };
  }

  const mobile = await readStrategy(env, publicId, "mobile");
  const desktop = await readStrategy(env, publicId, "desktop");
  const derived = derivePageSpeedStatus(record, mobile, desktop);

  if (derived.status === "failed") {
    if (record.status !== "failed") {
      await writeStoredRecord(env, {
        ...record,
        status: "failed",
        failure: { error: derived.error ?? "PageSpeed API error" },
      });
    }
    return {
      publicId: record.publicId,
      url: record.url,
      status: "failed",
      dataUrl: "",
      data: { error: derived.error ?? record.failure?.error ?? "PageSpeed API error" },
      processingStartedAt: record.processingStartedAt,
    };
  }

  if (derived.status === "completed" && derived.mobileKey && derived.desktopKey) {
    const data = [await readJson(env, derived.mobileKey), await readJson(env, derived.desktopKey)];
    const dataUrl = combinedObjectKey(record.publicId, record.url);
    await saveJson(env, dataUrl, data);
    await writeStoredRecord(env, {
      ...record,
      status: "completed",
      dataUrl,
      failure: null,
      processingStartedAt: null,
    });
    return {
      publicId: record.publicId,
      url: record.url,
      status: "completed",
      dataUrl,
      data,
      processingStartedAt: null,
    };
  }

  return {
    publicId: record.publicId,
    url: record.url,
    status: "pending",
    dataUrl: "",
    data: null,
    processingStartedAt: record.processingStartedAt,
  };
}

export async function storeStrategyResult(
  env: ApiBindings,
  publicId: string,
  strategy: "mobile" | "desktop",
  result: unknown,
): Promise<void> {
  const error =
    result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error
      : null;
  if (error) {
    await writeStrategy(env, publicId, strategy, { status: "failed", error: error.slice(0, 2000) });
    return;
  }
  const key = strategyObjectKey(publicId, strategy);
  await saveJson(env, key, result);
  await writeStrategy(env, publicId, strategy, { status: "completed", dataUrl: key });
  await pageSpeedResponse(env, publicId);
}
