import { describe, expect, it } from "vitest";
import {
  compareItemValues,
  itemValueNumber,
  itemValueText,
} from "@/features/page-speed-insights/shared/itemValueText";

const numeric = (value: number) => ({ type: "numeric", granularity: 1, value });

describe("itemValueText", () => {
  it("returns primitives as text and empty for nullish", () => {
    expect(itemValueText("abc")).toBe("abc");
    expect(itemValueText(12)).toBe("12");
    expect(itemValueText(undefined)).toBe("");
  });

  it("uses the visible parts of object cells", () => {
    expect(itemValueText(numeric(1081))).toBe("1081");
    expect(
      itemValueText({ type: "source-location", url: "https://a.test/x.js", line: 1, column: 0 }),
    ).toBe("https://a.test/x.js:1:0");
    expect(
      itemValueText({ type: "node", nodeLabel: "Total", snippet: "<body>", selector: "body" }),
    ).toBe("Total <body> body");
    expect(itemValueText({ nodeLabel: "svg > path", selector: "div > svg > path" })).toBe(
      "svg > path div > svg > path",
    );
    expect(itemValueText({ type: "link", text: "Docs", url: "https://a.test" })).toBe(
      "Docs https://a.test",
    );
    expect(itemValueText({ type: "url", value: "https://a.test" })).toBe("https://a.test");
  });
});

describe("itemValueNumber", () => {
  it("unwraps numeric objects and rejects non-numbers", () => {
    expect(itemValueNumber(numeric(16))).toBe(16);
    expect(itemValueNumber(7)).toBe(7);
    expect(itemValueNumber("7")).toBeUndefined();
    expect(itemValueNumber({ type: "node" })).toBeUndefined();
  });
});

describe("compareItemValues", () => {
  it("sorts numeric object cells by number, not as text", () => {
    const values = [numeric(128), numeric(16), numeric(1081)];
    expect(values.sort(compareItemValues).map((v) => v.value)).toEqual([16, 128, 1081]);
  });

  it("sorts object cells by their visible text", () => {
    const a = { type: "source-location", url: "https://b.test/x.js", line: 1, column: 0 };
    const b = { type: "source-location", url: "https://a.test/x.js", line: 1, column: 0 };
    expect(compareItemValues(a, b)).toBeGreaterThan(0);
  });
});
