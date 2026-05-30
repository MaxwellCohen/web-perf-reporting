import { describe, expect, it } from "vitest";
import {
  getWorkerEnvelopeToResponse,
  workerEnvelopeToHttpResponse,
} from "@/lib/page-speed-insights/workerPagespeedApiAdapter";
import {
  resolveWorkerEnvelope,
  type WorkerJobEnvelope,
} from "@/lib/page-speed-insights/resolveWorkerEnvelope";

describe("resolveWorkerEnvelope", () => {
  it("returns missing for null", () => {
    expect(resolveWorkerEnvelope(null)).toEqual({ kind: "missing" });
  });

  it("returns failed with error and url", () => {
    expect(
      resolveWorkerEnvelope({
        status: "failed",
        url: "https://example.com/page",
        data: { error: "Lighthouse could not load the page." },
      }),
    ).toEqual({
      kind: "failed",
      error: "Lighthouse could not load the page.",
      url: "https://example.com/page",
    });
  });

  it("returns pending for non-terminal status", () => {
    const envelope = { status: "pending" };
    expect(resolveWorkerEnvelope(envelope)).toEqual({
      kind: "pending",
      envelope,
    });
  });

  it("returns ready with string payload when completed", () => {
    expect(resolveWorkerEnvelope({ status: "completed", data: '{"x":1}' })).toEqual({
      kind: "ready",
      body: '{"x":1}',
    });
  });
});

describe("getWorkerEnvelopeToResponse", () => {
  it("returns 404 when envelope is null", async () => {
    const res = getWorkerEnvelopeToResponse(null);
    expect(res.status).toBe(404);
  });

  it("returns 500 JSON with error message and url when failed", async () => {
    const res = getWorkerEnvelopeToResponse({
      status: "failed",
      url: "https://example.com/page",
      data: { error: "Lighthouse could not load the page." },
    });
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      status: "failed",
      error: "Lighthouse could not load the page.",
      url: "https://example.com/page",
    });
  });

  it("returns 200 JSON for completed with object data", async () => {
    const env: WorkerJobEnvelope = { status: "completed", data: { ok: true } };
    const res = getWorkerEnvelopeToResponse(env);
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(JSON.stringify({ ok: true }));
  });

  it("returns 200 full envelope when completed without data.data", async () => {
    const env = { status: "completed", meta: "info" } as WorkerJobEnvelope;
    const res = getWorkerEnvelopeToResponse(env);
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(JSON.stringify(env));
  });

  it("maps pending to 404 via workerEnvelopeToHttpResponse", async () => {
    const res = workerEnvelopeToHttpResponse(
      resolveWorkerEnvelope({ status: "PENDING" } as WorkerJobEnvelope),
    );
    expect(res.status).toBe(404);
  });
});
