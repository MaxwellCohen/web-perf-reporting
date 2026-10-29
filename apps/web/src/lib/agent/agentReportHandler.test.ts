import { describe, expect, it, vi } from "vitest";
import exampleReport from "@/features/page-speed-insights/example-report.json";
import { handleAgentReportRequest, type AgentReportDeps } from "@/lib/agent/agentReportHandler";

const psi = (exampleReport as unknown as { item: unknown }[]).map((entry) => entry.item);
const completed = { publicId: "abc", url: "https://example.com", status: "completed", data: psi };
const pending = { publicId: "abc", url: "https://example.com", status: "pending", data: null };

function deps(overrides: Partial<AgentReportDeps> = {}): AgentReportDeps {
  let clock = 0;
  return {
    start: vi.fn<AgentReportDeps["start"]>(async () => completed),
    poll: vi.fn<AgentReportDeps["poll"]>(async () => completed),
    sleep: vi.fn<AgentReportDeps["sleep"]>(async (ms) => {
      clock += ms;
    }),
    now: () => clock,
    ...overrides,
  };
}

const request = (query: string, headers: Record<string, string> = {}) =>
  new Request(`https://site.test/api/agent/report${query}`, { headers });

describe("handleAgentReportRequest", () => {
  it("requires url or id", async () => {
    const response = await handleAgentReportRequest(request(""), deps());
    expect(response.status).toBe(400);
  });

  it("normalizes the url and returns a completed JSON report", async () => {
    const d = deps();
    const response = await handleAgentReportRequest(request("?url=example.com"), d);
    expect(d.start).toHaveBeenCalledWith("https://example.com");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("completed");
    expect(body.reports[0].label).toBe("Desktop");
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("returns markdown when asked", async () => {
    const response = await handleAgentReportRequest(
      request("?id=abc", { accept: "text/markdown" }),
      deps(),
    );
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("# Web performance report: https://example.com");
  });

  it("polls until the run completes", async () => {
    const poll = vi
      .fn<AgentReportDeps["poll"]>()
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(completed);
    const d = deps({ start: vi.fn<AgentReportDeps["start"]>(async () => pending), poll });
    const response = await handleAgentReportRequest(request("?url=https://example.com"), d);
    expect(response.status).toBe(200);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it("returns 202 with a poll url when the wait runs out", async () => {
    const d = deps({
      start: vi.fn<AgentReportDeps["start"]>(async () => pending),
      poll: vi.fn<AgentReportDeps["poll"]>(async () => pending),
    });
    const response = await handleAgentReportRequest(
      request("?url=https://example.com&wait=0&format=json"),
      d,
    );
    expect(response.status).toBe(202);
    expect(response.headers.get("retry-after")).toBe("10");
    const body = await response.json();
    expect(body.pollUrl).toBe("https://site.test/api/agent/report?id=abc");
    expect(d.poll).not.toHaveBeenCalled();
  });

  it("reports failed runs and unknown ids", async () => {
    const failed = deps({
      poll: vi.fn<AgentReportDeps["poll"]>(async () => ({
        status: "failed",
        url: "https://x.test",
        data: { error: "boom" },
      })),
    });
    const failedResponse = await handleAgentReportRequest(request("?id=abc"), failed);
    expect(failedResponse.status).toBe(502);
    expect((await failedResponse.json()).error).toBe("boom");

    const missing = await handleAgentReportRequest(
      request("?id=nope"),
      deps({ poll: vi.fn<AgentReportDeps["poll"]>(async () => null) }),
    );
    expect(missing.status).toBe(404);
  });
});
