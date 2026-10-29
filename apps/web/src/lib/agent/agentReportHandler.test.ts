import { describe, expect, it } from "vitest";
import exampleReport from "@/features/page-speed-insights/example-report.json";
import { handleAgentReportRequest, handleAgentReportUsage } from "@/lib/agent/agentReportHandler";

const psi = (exampleReport as unknown as { item: { lighthouseResult: unknown } }[])[0].item;
const lhr = psi.lighthouseResult;

const post = (body: unknown, query = "", headers: Record<string, string> = {}) =>
  new Request(`https://site.test/api/agent/report${query}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("handleAgentReportRequest", () => {
  it("analyzes a PageSpeed Insights API response", async () => {
    const response = await handleAgentReportRequest(post(psi));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reports[0].label).toBe("Desktop");
    expect(body.reports[0].field.source).toBe("url");
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("analyzes a raw Lighthouse result without field data", async () => {
    const body = await (await handleAgentReportRequest(post(lhr))).json();
    expect(body.url).toContain("https://www.clearchoice.com/locations/");
    expect(body.reports[0].field).toBeNull();
  });

  it("analyzes an array of reports together", async () => {
    const body = await (await handleAgentReportRequest(post([lhr, psi]))).json();
    expect(body.reports).toHaveLength(2);
  });

  it("returns markdown when asked", async () => {
    const response = await handleAgentReportRequest(post(lhr, "", { accept: "text/markdown" }));
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain(
      "# Web performance report: https://www.clearchoice.com/",
    );
  });

  it("rejects bodies without a Lighthouse result", async () => {
    expect((await handleAgentReportRequest(post("not json"))).status).toBe(400);
    expect((await handleAgentReportRequest(post({ hello: "world" }))).status).toBe(400);
  });

  it("explains how to use the endpoint on GET", async () => {
    const response = handleAgentReportUsage(new Request("https://site.test/api/agent/report"));
    expect(response.status).toBe(405);
    expect((await response.json()).error).toContain("POST a Lighthouse JSON report");
  });
});
