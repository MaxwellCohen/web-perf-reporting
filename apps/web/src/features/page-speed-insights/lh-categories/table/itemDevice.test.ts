import { describe, expect, it } from "vitest";
import { getItemDevice } from "@/features/page-speed-insights/lh-categories/table/itemDevice";

describe("getItemDevice", () => {
  it("returns the device from the item when present", () => {
    expect(getItemDevice({ _device: "Mobile" }, "Desktop")).toBe("Mobile");
  });

  it("falls back to the provided device when the item has none", () => {
    expect(getItemDevice({}, "Desktop")).toBe("Desktop");
  });
});
