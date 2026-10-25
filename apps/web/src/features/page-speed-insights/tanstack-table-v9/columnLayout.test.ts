import { describe, expect, it } from "vitest";
import {
  applyMovableOrder,
  columnLayoutLabel,
  isLayoutColumn,
  moveId,
} from "@/features/page-speed-insights/tanstack-table-v9/columnLayout";

describe("columnLayout", () => {
  it("labels a column from its header", () => {
    expect(columnLayoutLabel({ id: "url", columnDef: { header: "URL" } })).toBe("URL");
    expect(columnLayoutLabel({ id: "mimeType", columnDef: {} })).toBe("mimeType");
  });

  it("keeps the expander out of the layout menu", () => {
    expect(isLayoutColumn({ id: "expander" })).toBe(false);
    expect(isLayoutColumn({ id: "url" })).toBe(true);
  });

  it("moves an id and leaves the list alone at the ends", () => {
    expect(moveId(["url", "type", "size"], "type", -1)).toEqual(["type", "url", "size"]);
    expect(moveId(["url", "type", "size"], "url", -1)).toEqual(["url", "type", "size"]);
  });

  it("reorders movable columns without moving fixed ones", () => {
    expect(applyMovableOrder(["expander", "url", "type"], ["type", "url"])).toEqual([
      "expander",
      "type",
      "url",
    ]);
  });
});
