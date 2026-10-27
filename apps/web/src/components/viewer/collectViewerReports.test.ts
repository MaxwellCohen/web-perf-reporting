import { afterEach, describe, expect, it, vi } from "vitest";
import { collectViewerReports } from "@/components/viewer/collectViewerReports";

describe("collectViewerReports", () => {
  const lighthouseResult = { categories: {} };
  const json = JSON.stringify({ lighthouseResult });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("collects multiple pasted reports with labels", async () => {
    const result = await collectViewerReports([
      {
        method: "text",
        jsonInputs: [
          { name: "Mobile", content: json },
          { name: "Desktop", content: json },
        ],
      },
    ]);

    expect(result.data).toHaveLength(2);
    expect(result.labels).toEqual(["Mobile", "Desktop"]);
  });

  it("collects multiple uploaded files with labels", async () => {
    const mobile = new File([json], "mobile.json", { type: "application/json" });
    const desktop = new File([json], "desktop.json", { type: "application/json" });

    const result = await collectViewerReports([
      {
        method: "file",
        jsonFiles: [
          { name: "Mobile", file: mobile },
          { name: "Desktop", file: desktop },
        ],
      },
    ]);

    expect(result.data).toHaveLength(2);
    expect(result.labels).toEqual(["Mobile", "Desktop"]);
  });

  it("throws when no files are uploaded", async () => {
    await expect(collectViewerReports([{ method: "file", jsonFiles: [] }])).rejects.toThrow(
      "Please upload at least one JSON file",
    );
  });

  it("throws when pasted JSON is invalid", async () => {
    await expect(
      collectViewerReports([
        { method: "text", jsonInputs: [{ name: "Bad", content: "not json" }] },
      ]),
    ).rejects.toThrow();
  });

  it("imports a PSI share URL through the proxy", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }, { lighthouseResult: { categories: {} } }],
        labels: ["Mobile", "Desktop"],
      }),
    );

    const result = await collectViewerReports([
      {
        method: "psi",
        psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/abc",
      },
    ]);

    expect(result.labels).toEqual(["Mobile", "Desktop"]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/viewer/psi-share",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("merges two PSI shares with default A/B run prefixes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      if (String(body.url).includes("run-a")) {
        return Response.json({
          data: [{ lighthouseResult: { categories: { a: true } } }],
          labels: ["Mobile"],
        });
      }
      return Response.json({
        data: [{ lighthouseResult: { categories: { b: true } } }],
        labels: ["Mobile"],
      });
    });

    const result = await collectViewerReports([
      { method: "psi", psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/run-a" },
      { method: "psi", psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/run-b" },
    ]);

    expect(result.labels).toEqual(["A · Mobile", "B · Mobile"]);
    expect(result.data).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("merges two PSI shares with custom run labels", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Desktop"],
      }),
    );

    const result = await collectViewerReports([
      {
        method: "psi",
        psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/a",
        label: "Before",
      },
      {
        method: "psi",
        psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/b",
        label: "After",
      },
    ]);

    expect(result.labels).toEqual(["Before · Desktop", "After · Desktop"]);
  });

  it("disambiguates identical custom run labels", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Mobile"],
      }),
    );

    const result = await collectViewerReports([
      {
        method: "psi",
        psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/a",
        label: "Run",
      },
      {
        method: "psi",
        psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/b",
        label: "Run",
      },
    ]);

    expect(result.labels).toEqual(["Run · Mobile", "Run (2) · Mobile"]);
  });

  it("merges mixed methods with A/B run prefixes", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: { psi: true } } }],
        labels: ["Mobile"],
      }),
    );

    const result = await collectViewerReports([
      {
        method: "psi",
        psiUrl: "https://pagespeed.web.dev/analysis/https-example-com/a",
        label: "Before",
      },
      {
        method: "text",
        label: "After",
        jsonInputs: [{ name: "Paste", content: json }],
      },
    ]);

    expect(result.labels).toEqual(["Before · Mobile", "After · Paste"]);
    expect(result.data).toHaveLength(2);
  });

  it("throws when the PSI share URL is empty", async () => {
    await expect(
      collectViewerReports([{ method: "psi", psiUrl: "  " }]),
    ).rejects.toThrow("Enter a PageSpeed Insights share URL");
  });
});
