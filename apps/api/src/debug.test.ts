import { describe, expect, it } from "vitest";
import type { ApiBindings } from "./bindings";
import { collectDebugStatus, renderDebugHtml } from "./debug";

function memoryKv(entries: Record<string, string>) {
  const store = new Map(Object.entries(entries));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async () => undefined,
    delete: async () => undefined,
    list: async ({ prefix }: { prefix: string }) => ({
      keys: [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    }),
  };
}

function record(publicId: string, date: number, status: string, error?: string) {
  return JSON.stringify({
    publicId,
    url: `https://example.com/${publicId}`,
    formFactor: "ALL",
    date,
    status,
    dataUrl: "",
    processingStartedAt: null,
    failure: error ? { error } : null,
  });
}

function bindings(overrides: Partial<ApiBindings> = {}): ApiBindings {
  return {
    KV: memoryKv({
      "record:a": record("a", 1_000, "completed"),
      "record:a:strategy:mobile": JSON.stringify({ status: "completed" }),
      "record:b": record("b", 3_000, "failed", "quota exceeded"),
      "record:c": record("c", 2_000, "pending"),
      "url:https://example.com/a": "a",
      "crux-job:1": "{}",
      "crux-job:2": "{}",
    }),
    RESULTS_BUCKET: { get: async () => null, put: async () => undefined, delete: async () => undefined },
    DB: {
      prepare: () => ({ first: async () => ({ total: 42, newest: 1_793_000_000 }) }),
    } as unknown as D1Database,
    PAGESPEED_INSIGHTS_API: "google-key",
    WORKER_API_KEY: "",
    ...overrides,
  };
}

describe("collectDebugStatus", () => {
  it("summarises stores, newest records first, without secret values", async () => {
    const status = await collectDebugStatus(bindings());

    expect(status.checks.kv.ok && status.checks.d1.ok && status.checks.r2.ok).toBe(true);
    expect(status.secrets).toEqual({ PAGESPEED_INSIGHTS_API: true, WORKER_API_KEY: false });
    expect(status.d1).toEqual({ historicalMetricsRows: 42, newestHistoryAt: "2026-10-26T07:33:20.000Z" });
    expect(status.pagespeed?.recordsListed).toBe(3);
    expect(status.pagespeed?.byStatus).toEqual({ completed: 1, failed: 1, pending: 1 });
    expect(status.pagespeed?.recent.map((item) => item.publicId)).toEqual(["b", "c", "a"]);
    expect(status.pagespeed?.recent[0]?.error).toBe("quota exceeded");
    expect(status.crux).toEqual({ jobsListed: 2, truncated: false });
    expect(JSON.stringify(status)).not.toContain("google-key");
  });

  it("reports a failing store instead of throwing", async () => {
    const status = await collectDebugStatus(
      bindings({
        DB: { prepare: () => ({ first: async () => Promise.reject(new Error("D1 down")) }) } as unknown as D1Database,
      }),
    );

    expect(status.checks.d1).toMatchObject({ ok: false, error: "D1 down" });
    expect(status.d1).toBeNull();
    expect(status.checks.kv.ok).toBe(true);
  });
});

describe("renderDebugHtml", () => {
  it("escapes stored values", async () => {
    const kv = memoryKv({ "record:x": record("x", 1, "failed", "<script>alert(1)</script>") });
    const html = renderDebugHtml(await collectDebugStatus(bindings({ KV: kv })), "/debug?format=json&key=k");

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="/debug?format=json&amp;key=k"');
  });
});
