import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiBindings } from "../bindings";

const send = vi.fn<(body: unknown) => Promise<void>>();
vi.mock("void/queues", () => ({ queues: { crux: { send: (body: unknown) => send(body) } } }));
vi.mock("./history-store", () => ({
  readHistory: vi.fn<() => Promise<unknown>>(),
  saveHistoryReports: vi.fn<() => Promise<number>>(),
}));

const { startCruxJob } = await import("./jobs");

function memoryKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => void store.set(key, value),
    delete: async (key: string) => void store.delete(key),
    list: async () => ({ keys: [], list_complete: true }),
  };
}

function bindings(kv = memoryKv()) {
  return { KV: kv, PAGESPEED_INSIGHTS_API: "key" } as unknown as ApiBindings;
}

describe("startCruxJob", () => {
  beforeEach(() => send.mockReset());
  afterEach(() => vi.unstubAllGlobals());

  it("fetches every current slot inline and returns them ready", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ record: { metrics: {} } }));
    vi.stubGlobal("fetch", fetchMock);

    const job = await startCruxJob(bindings(), "current", "https://example.com");

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(job.slots).toHaveLength(8);
    expect(job.slots.every((slot) => slot.status === "ready")).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it("queues slots that fail with a retryable error and leaves them pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response("busy", { status: 503 })),
    );

    const job = await startCruxJob(bindings(), "current", "https://example.com");

    expect(send).toHaveBeenCalledTimes(8);
    expect(job.slots.every((slot) => slot.status === "pending")).toBe(true);
  });

  it("serves cached slots without calling Google", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const kv = memoryKv();
    for (const scope of ["origin", "url"]) {
      for (const factor of ["", "DESKTOP", "TABLET", "PHONE"]) {
        kv.store.set(
          `crux-current:v1:${scope}:${factor}:https://example.com`,
          JSON.stringify({ report: { cached: true } }),
        );
      }
    }

    const job = await startCruxJob(bindings(kv), "current", "https://example.com");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(job.slots[0]).toMatchObject({ status: "ready", report: { cached: true } });
  });
});
