import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/viewer/psi-share/route";

function embed(report: object): string {
  return JSON.stringify(JSON.stringify(report));
}

function lighthouse(formFactor: string) {
  return {
    fetchTime: "2026-10-25T20:58:56.939Z",
    lighthouseVersion: "13.5.0",
    audits: { "largest-contentful-paint": { numericValue: 1 } },
    categories: { performance: { score: 1 } },
    configSettings: { formFactor },
  };
}

const SHARE = "https://pagespeed.web.dev/analysis/https-example-com/abc?form_factor=mobile";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/viewer/psi-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/viewer/psi-share", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized reports extracted from share HTML", async () => {
    const html = `${embed(lighthouse("mobile"))}${embed(lighthouse("desktop"))}`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(html, { status: 200 }));

    const response = await post({ url: SHARE });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { lighthouseResult: lighthouse("mobile") },
        { lighthouseResult: lighthouse("desktop") },
      ],
      labels: ["Mobile", "Desktop"],
    });
  });

  it("rejects hosts outside pagespeed.web.dev", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await post({ url: "https://evil.example/analysis/abc" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "URL must be a pagespeed.web.dev analysis link",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 502 when the share page cannot be parsed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html></html>", { status: 200 }));

    const response = await post({ url: SHARE });

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toMatch(/embedded Lighthouse/i);
  });
});
