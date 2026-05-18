import { describe, expect, it } from "vitest";
import {
  getWorkerEnvelopeToResponse,
  postWorkerEnvelopeToResponse,
} from "@/lib/page-speed-insights/workerPagespeedApiAdapter";
import type { WorkerJobEnvelope } from "@/lib/page-speed-insights/pageSpeedWorkerClient";

describe("postWorkerEnvelopeToResponse", () => {
  it("returns 404 when envelope is null", async () => {
    const res = postWorkerEnvelopeToResponse(null);
    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toBe("Data is not yet ready no data");
  });

  it("returns 404 when not completed", async () => {
    const res = postWorkerEnvelopeToResponse({ status: "PENDING" } as WorkerJobEnvelope);
    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toContain("Data is not yet ready");
  });

  it("returns payload when completed with string data", async () => {
    const res = postWorkerEnvelopeToResponse({ status: "completed", data: '{"x":1}' });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('{"x":1}');
  });

  it("returns 500 when completed without data", async () => {
    const res = postWorkerEnvelopeToResponse({ status: "completed" });
    expect(res.status).toBe(500);
    await expect(res.text()).resolves.toBe("");
  });
});

describe("getWorkerEnvelopeToResponse", () => {
  it("returns 404 when envelope is null", async () => {
    const res = getWorkerEnvelopeToResponse(null);
    expect(res.status).toBe(404);
  });

  it("returns 500 when failed", async () => {
    const res = getWorkerEnvelopeToResponse({ status: "failed" });
    expect(res.status).toBe(500);
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
});
