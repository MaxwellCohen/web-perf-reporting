import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyCruxGet, proxyCruxPost } from "./proxyCruxJob";

describe("proxyCruxJob", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("starts a CrUX job on the Void worker", async () => {
    vi.stubEnv("WORKER_URL", "https://web-perf-report-api.example.workers.dev");
    vi.stubEnv("WORKER_API_KEY", "worker-secret");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ jobId: "job-1", slots: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await proxyCruxPost(
      "current",
      new Request("http://localhost/api/crux/current", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://web-perf-report-api.example.workers.dev/crux/current",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "worker-secret" }),
        body: JSON.stringify({ url: "https://example.com" }),
      }),
    );
  });

  it("reads a CrUX job without sending the API key", async () => {
    vi.stubEnv("WORKER_URL", "https://web-perf-report-api.example.workers.dev");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ jobId: "job-1" }), { status: 200 }));

    const response = await proxyCruxGet(
      "history",
      new Request("http://localhost/api/crux/history?jobId=job-1"),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://web-perf-report-api.example.workers.dev/crux/history?jobId=job-1",
    );
  });
});
