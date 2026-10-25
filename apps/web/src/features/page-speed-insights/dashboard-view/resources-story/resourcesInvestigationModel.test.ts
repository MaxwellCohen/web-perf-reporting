import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { formatBytes } from "@/features/page-speed-insights/shared/format";
import {
  buildResourcesInvestigation,
  resourcesInvestigationsFromItems,
  type ResourcesInvestigationInput,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";

const KB = 1024;

function input(overrides: Partial<ResourcesInvestigationInput> = {}): ResourcesInvestigationInput {
  return {
    label: "Mobile",
    totalBytes: null,
    requestCount: null,
    thirdPartyBytes: null,
    scriptBytes: null,
    unusedBytes: null,
    mainThreadMs: null,
    longTaskMs: null,
    loadTimeMs: null,
    requests: [],
    scripts: [],
    ...overrides,
  };
}

describe("buildResourcesInvestigation", () => {
  it("returns null when the report has nothing to investigate", () => {
    expect(buildResourcesInvestigation(input())).toBeNull();
  });

  it("leads with wasted download when unused script bytes are a large share", () => {
    const unused = 80 * KB;
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: 200 * KB,
        scriptBytes: 120 * KB,
        unusedBytes: unused,
        thirdPartyBytes: 20 * KB,
        mainThreadMs: 100,
        requests: [
          { url: "https://cdn.example.com/app.js", resourceType: "Script", transferSize: 120 * KB },
        ],
      }),
    );

    expect(investigation?.lead.kind).toBe("wasted-download");
    expect(investigation?.lead.stage).toBe("unused");
    expect(investigation?.lead.magnitude).toBe("67%");
    expect(investigation?.lead.sentence).toContain("never ran");
    expect(investigation?.lead.sentence).toContain(formatBytes(unused));
    expect(investigation?.stages.map((stage) => stage.id)).toEqual([
      "arrived",
      "scripts",
      "unused",
      "main-thread",
    ]);
  });

  it("leads with script weight when scripts dominate and unused does not", () => {
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: 200 * KB,
        scriptBytes: 150 * KB,
        unusedBytes: KB,
        thirdPartyBytes: 10 * KB,
        mainThreadMs: 100,
      }),
    );

    expect(investigation?.lead.kind).toBe("script-weight");
    expect(investigation?.lead.sentence).toContain("Scripts are 75%");
  });

  it("leads with third-party payload and names the heaviest outside source", () => {
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: 200 * KB,
        scriptBytes: 20 * KB,
        unusedBytes: KB,
        thirdPartyBytes: 120 * KB,
        requests: [
          {
            url: "https://ads.example.com/tag.js",
            resourceType: "Script",
            transferSize: 90 * KB,
            thirdParty: true,
            entity: "Ads",
          },
          {
            url: "https://example.com/app.js",
            resourceType: "Script",
            transferSize: 20 * KB,
          },
        ],
      }),
    );

    expect(investigation?.lead.kind).toBe("third-party");
    expect(investigation?.lead.sentence).toContain("60%");
    expect(investigation?.lead.sentence).toContain("Ads");
    expect(investigation?.suspects[0]?.actionHint).toBe("third-party-audit");
  });

  it("leads with main-thread cost when long tasks dominate a lighter download", () => {
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: 100 * KB,
        scriptBytes: 10 * KB,
        thirdPartyBytes: 10 * KB,
        longTaskMs: 800,
        mainThreadMs: 1200,
        loadTimeMs: 2000,
      }),
    );

    expect(investigation?.lead.kind).toBe("main-thread");
    expect(investigation?.lead.stage).toBe("main-thread");
    expect(investigation?.lead.sentence).toContain("long tasks");
  });

  it("falls through to the heaviest URL when no threshold is crossed", () => {
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: 500 * KB,
        scriptBytes: 40 * KB,
        unusedBytes: KB,
        thirdPartyBytes: 20 * KB,
        mainThreadMs: 100,
        requests: [
          { url: "https://example.com/hero.jpg", resourceType: "Image", transferSize: 400 * KB },
          { url: "https://example.com/app.js", resourceType: "Script", transferSize: 40 * KB },
        ],
      }),
    );

    expect(investigation?.lead.kind).toBe("heaviest-urls");
    expect(investigation?.lead.sentence).toContain("/hero.jpg");
    expect(investigation?.suspects[0]?.url).toContain("hero.jpg");
    expect(investigation?.suspects[0]?.actionHint).toBe("cut-weight");
  });

  it("ranks unused bytes ahead of a similar transfer and merges duplicate URLs", () => {
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: 100 * KB,
        scriptBytes: 40 * KB,
        requests: [
          { url: "https://example.com/a.js", resourceType: "Script", transferSize: 10 * KB },
          { url: "https://example.com/a.js", resourceType: "Script", transferSize: 10 * KB },
          { url: "https://example.com/b.js", resourceType: "Script", transferSize: 20 * KB },
        ],
        scripts: [
          {
            url: "https://example.com/b.js",
            transferSize: 20 * KB,
            unusedBytes: 50 * KB,
            bootupMs: 0,
          },
        ],
      }),
    );

    expect(investigation?.suspects[0]?.url).toBe("https://example.com/b.js");
    expect(investigation?.suspects[0]?.actionHint).toBe("remove-unused");
    expect(
      investigation?.suspects.find((suspect) => suspect.url.endsWith("a.js"))?.transferSize,
    ).toBe(20 * KB);
  });

  it("hints split or defer from bootup time when the script was used", () => {
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: 80 * KB,
        scriptBytes: 40 * KB,
        requests: [
          { url: "https://example.com/heavy.js", resourceType: "Script", transferSize: 30 * KB },
          { url: "https://example.com/late.js", resourceType: "Script", transferSize: 20 * KB },
        ],
        scripts: [
          {
            url: "https://example.com/heavy.js",
            transferSize: 30 * KB,
            unusedBytes: 0,
            bootupMs: 600,
          },
          {
            url: "https://example.com/late.js",
            transferSize: 20 * KB,
            unusedBytes: 0,
            bootupMs: 250,
          },
        ],
      }),
    );

    expect(
      investigation?.suspects.find((suspect) => suspect.url.endsWith("heavy.js"))?.actionHint,
    ).toBe("split");
    expect(
      investigation?.suspects.find((suspect) => suspect.url.endsWith("late.js"))?.actionHint,
    ).toBe("defer");
  });

  it("rolls extra URLs of one type into a smaller-files tile", () => {
    const requests = Array.from({ length: 7 }, (_, index) => ({
      url: `https://example.com/file-${index}.js`,
      resourceType: "Script",
      transferSize: (7 - index) * KB,
    }));
    const investigation = buildResourcesInvestigation(
      input({
        totalBytes: requests.reduce((sum, request) => sum + request.transferSize, 0),
        requests,
      }),
    );

    const scripts = investigation?.nodes.filter((node) => node.resourceType === "Script") ?? [];
    expect(scripts).toHaveLength(7);
    expect(scripts.at(-1)).toMatchObject({ aggregate: true, label: "1 smaller file" });
    expect(scripts.slice(0, -1).every((node) => !node.aggregate)).toBe(true);
  });
});

describe("resourcesInvestigationsFromItems", () => {
  it("builds a wasted-download lead from lighthouse network and unused-javascript rows", () => {
    const entry = {
      label: "Mobile",
      item: {
        lighthouseResult: {
          entities: [{ name: "Ads", isFirstParty: false, origins: ["https://cdn.example.com"] }],
          audits: {
            "resource-summary": {
              details: {
                type: "table",
                headings: [],
                items: [
                  {
                    resourceType: "total",
                    label: "Total",
                    requestCount: 2,
                    transferSize: 200 * KB,
                  },
                  {
                    resourceType: "script",
                    label: "Script",
                    requestCount: 1,
                    transferSize: 150 * KB,
                  },
                  {
                    resourceType: "third-party",
                    label: "Third-party",
                    requestCount: 1,
                    transferSize: 40 * KB,
                  },
                ],
              },
            },
            "network-requests": {
              details: {
                type: "table",
                headings: [],
                items: [
                  {
                    url: "https://cdn.example.com/app.js",
                    resourceType: "Script",
                    transferSize: 120 * KB,
                    entity: "Ads",
                  },
                  {
                    url: "https://example.com/photo.jpg",
                    resourceType: "Image",
                    transferSize: 30 * KB,
                  },
                ],
              },
            },
            "unused-javascript": {
              details: {
                type: "opportunity",
                headings: [],
                items: [{ url: "https://cdn.example.com/app.js", wastedBytes: 80 * KB }],
              },
            },
          },
        },
      },
    } as unknown as InsightsContextItem;

    const [investigation] = resourcesInvestigationsFromItems([entry]);
    expect(investigation?.lead.kind).toBe("wasted-download");
    expect(investigation?.suspects[0]?.url).toBe("https://cdn.example.com/app.js");
    expect(investigation?.suspects[0]?.thirdParty).toBe(true);
    expect(investigation?.nodes.some((node) => node.resourceType === "Image")).toBe(true);
  });

  it("returns nothing for an empty report list", () => {
    expect(resourcesInvestigationsFromItems([])).toEqual([]);
  });
});
