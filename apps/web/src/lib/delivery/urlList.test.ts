import { describe, expect, it } from "vitest";
import type { DeliveryReport } from "@maxwellcohen/delivery-core";
import { bulkCsv, parseUrlList } from "./urlList";

describe("parseUrlList", () => {
  it("splits on newlines, commas and spaces, dedupes and skips comments", () => {
    expect(parseUrlList("a.com\n# note\nb.com, c.com  a.com\r\n\n")).toEqual({
      urls: ["a.com", "b.com", "c.com"],
      dropped: 0,
    });
  });

  it("caps the list", () => {
    expect(parseUrlList("a b c d", 2)).toEqual({ urls: ["a", "b"], dropped: 2 });
  });
});

describe("bulkCsv", () => {
  it("summarises each row and lists ghost resources", () => {
    const res = (url: string, complete: boolean | null, receivedBytes: number) => ({
      url,
      protocol: "h2" as const,
      status: 200,
      timings: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, totalMs: 0 },
      declaredBytes: 100,
      receivedBytes,
      end: { kind: "rst_stream" as const, atMs: 5 },
      complete,
      check: "content-length" as const,
    });
    const report = {
      document: res("https://a.com/", true, 100),
      assets: [res("https://a.com/app.js", false, 10)],
      notChecked: [],
      ghosts: 1,
    } as unknown as DeliveryReport;
    const csv = bulkCsv([
      { url: "https://a.com/", state: "done", report },
      { url: "b.com", state: "error", error: 'bad, "x"' },
    ]);
    expect(csv.split("\n")).toEqual([
      "url,state,status,ghosts,checked,ghost_resources,not_checked,error",
      "https://a.com/,done,200,1,2,https://a.com/app.js (10/100 rst_stream),0,",
      'b.com,error,,,,,,"bad, ""x"""',
      "",
    ]);
  });
});
