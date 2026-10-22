export type KvStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  list(options: { prefix: string; cursor?: string; limit?: number }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
};

export type ResultObject = {
  text(): Promise<string>;
};

export type ResultBucket = {
  get(key: string): Promise<ResultObject | null>;
  put(
    key: string,
    value: string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
};

export type ApiBindings = {
  KV: KvStore;
  RESULTS_BUCKET: ResultBucket;
  DB: D1Database;
  PAGESPEED_INSIGHTS_API?: string;
  WORKER_API_KEY?: string;
};

/** Void's generated binding type does not list RESULTS_BUCKET until deploy. */
export function asBindings(env: unknown): ApiBindings {
  return env as ApiBindings;
}
