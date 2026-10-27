import { describe, expect, it } from "vitest";
import {
  extractBarPoints,
  extractDebugKpis,
  extractDomSizeKpis,
  extractStackedSegmentPoints,
} from "./extractAuditBarPoints";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

function tableRow(
  label: string,
  items: Array<Record<string, unknown>>,
  id = "cache-insight",
): DetailTableItem {
  return {
    _userLabel: label,
    auditResult: {
      id,
      details: {
        type: "table",
        headings: [],
        items: items as never,
      },
    },
  };
}

describe("extractBarPoints", () => {
  it("builds labeled points sorted by value and limited", () => {
    const points = extractBarPoints(
      [
        tableRow("Mobile", [
          { url: "https://example.com/a.js", wastedBytes: 100 },
          { url: "https://example.com/b.js", wastedBytes: 500 },
          { url: "https://example.com/c.js", wastedBytes: 50 },
        ]),
      ],
      { labelKeys: ["url"], valueKeys: ["wastedBytes"], limit: 2 },
    );

    expect(points).toEqual([
      { label: "Mobile", category: "example.com/b.js", value: 500 },
      { label: "Mobile", category: "example.com/a.js", value: 100 },
    ]);
  });
});

describe("extractStackedSegmentPoints", () => {
  it("derives used/unused from total and wasted bytes", () => {
    const points = extractStackedSegmentPoints(
      [
        tableRow(
          "Desktop",
          [{ url: "https://cdn.example.com/app.js", totalBytes: 1000, wastedBytes: 400 }],
          "unused-javascript",
        ),
      ],
      { labelKeys: ["url"], segments: [], usedUnusedFromBytes: true },
    );

    expect(points).toEqual([
      { label: "Desktop", category: "cdn.example.com/app.js", segment: "used", value: 600 },
      { label: "Desktop", category: "cdn.example.com/app.js", segment: "unused", value: 400 },
    ]);
  });
});

describe("extractDomSizeKpis", () => {
  it("reads numeric statistic values", () => {
    const groups = extractDomSizeKpis([
      tableRow(
        "Mobile",
        [
          { statistic: "Total elements", value: { type: "numeric", value: 890 } },
          { statistic: "Maximum depth", value: { type: "numeric", value: 12 } },
        ],
        "dom-size-insight",
      ),
    ]);

    expect(groups).toEqual([
      {
        reportLabel: "Mobile",
        stats: [
          { label: "Total elements", value: 890 },
          { label: "Maximum depth", value: 12 },
        ],
      },
    ]);
  });
});

describe("extractDebugKpis", () => {
  it("pulls selected keys from debugdata items", () => {
    const groups = extractDebugKpis(
      [
        {
          _userLabel: "Mobile",
          auditResult: {
            details: {
              type: "debugdata",
              items: [{ numRequests: 146, totalByteWeight: 3990555, missing: null }],
            },
          },
        },
      ],
      [
        { key: "numRequests", label: "Requests", format: "count" },
        { key: "totalByteWeight", label: "Byte weight", format: "bytes" },
        { key: "missing", label: "Missing", format: "count" },
      ],
    );

    expect(groups[0]?.metrics).toEqual([
      { key: "numRequests", label: "Requests", value: 146, format: "count" },
      { key: "totalByteWeight", label: "Byte weight", value: 3990555, format: "bytes" },
    ]);
  });
});
