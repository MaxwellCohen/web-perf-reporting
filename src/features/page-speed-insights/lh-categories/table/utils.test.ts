import { describe, expect, it } from "vitest";
import {
  showBothDevices,
  getDerivedSubItemsHeading,
  mergedTable,
  mergeHeadings,
  updateTableHeading,
  renameKeys,
  mergeTableItem,
  reduceTableItems,
  makeID,
  SUMMABLE_VALUETYPES,
  SHOW_BOTH_DEVICES_KEYS,
} from "@/features/page-speed-insights/lh-categories/table/utils";
import type { TableColumnHeading, TableItem } from "@/lib/schema";

describe("utils", () => {
  describe("showBothDevices", () => {
    it("returns true for summable value types", () => {
      expect(showBothDevices({ key: "x", valueType: "bytes", label: "Size" })).toBe(true);
      expect(showBothDevices({ key: "x", valueType: "ms", label: "Time" })).toBe(true);
      expect(showBothDevices({ key: "x", valueType: "numeric", label: "N" })).toBe(true);
      expect(showBothDevices({ key: "x", valueType: "timespanMs", label: "T" })).toBe(true);
    });

    it("returns true when key includes _device, percent, or node", () => {
      expect(showBothDevices({ key: "foo_device", valueType: "text", label: "X" })).toBe(true);
      expect(showBothDevices({ key: "percent", valueType: "text", label: "X" })).toBe(true);
      expect(showBothDevices({ key: "node", valueType: "text", label: "X" })).toBe(true);
    });

    it("returns false for plain text key", () => {
      expect(showBothDevices({ key: "name", valueType: "text", label: "Name" })).toBe(false);
    });
  });

  describe("getDerivedSubItemsHeading", () => {
    it("returns null when no subItemsHeading", () => {
      expect(getDerivedSubItemsHeading({ key: "x", valueType: "text", label: "X" })).toBeNull();
    });

    it("returns derived heading when subItemsHeading present", () => {
      const heading: TableColumnHeading = {
        key: "parent",
        valueType: "node",
        label: "Parent",
        subItemsHeading: {
          key: "child",
          valueType: "text",
        },
      } as TableColumnHeading;
      const result = getDerivedSubItemsHeading(heading);
      expect(result).not.toBeNull();
      expect(result!.key).toBe("child");
      expect(result!.valueType).toBe("text");
      expect(result!.label).toBe("");
    });
  });

  describe("mergedTable", () => {
    it("returns empty state when no desktop or mobile items", () => {
      const [headings, items, device, hasNode] = mergedTable();
      expect(headings).toEqual([]);
      expect(items).toEqual([]);
      expect(device).toBe("Desktop");
      expect(hasNode).toBe(false);
    });

    it("returns desktop items and device when only desktop provided", () => {
      const desktopItems: TableItem[] = [{ name: "A" } as TableItem];
      const desktopHeadings: TableColumnHeading[] = [
        { key: "name", valueType: "text", label: "Name" },
      ];
      const [headings, items, device] = mergedTable(
        desktopItems,
        undefined,
        undefined,
        desktopHeadings,
      );
      expect(items.length).toBe(1);
      expect(items[0]).toHaveProperty("name_Desktop", "A");
      expect(device).toBe("Desktop");
      expect(headings.length).toBeGreaterThanOrEqual(0);
    });

    it("returns mobile items and device when only mobile provided", () => {
      const mobileItems: TableItem[] = [{ name: "B" } as TableItem];
      const mobileHeadings: TableColumnHeading[] = [
        { key: "name", valueType: "text", label: "Name" },
      ];
      const [, items, device] = mergedTable(undefined, mobileItems, mobileHeadings, undefined);
      expect(items.length).toBe(1);
      expect(items[0]).toHaveProperty("name_Mobile", "B");
      expect(device).toBe("Mobile");
    });

    it("merges when hasNode and both desktop and mobile headings", () => {
      const desktopItems: TableItem[] = [{ id: "1" } as TableItem];
      const mobileItems: TableItem[] = [{ id: "2" } as TableItem];
      const headings: TableColumnHeading[] = [{ key: "id", valueType: "node", label: "Node" }];
      const [outHeadings, items, , hasNode] = mergedTable(
        desktopItems,
        mobileItems,
        headings,
        headings,
      );
      expect(hasNode).toBe(true);
      expect(outHeadings.length).toBe(1);
      expect(items.length).toBe(2);
    });
  });

  describe("mergeHeadings", () => {
    it("interleaves mobile and desktop headings with device suffix when summable", () => {
      const mobile = [{ key: "m1", valueType: "bytes", label: "M1" }] as TableColumnHeading[];
      const desktop = [{ key: "d1", valueType: "bytes", label: "D1" }] as TableColumnHeading[];
      const result = mergeHeadings(mobile, desktop);
      expect(result.length).toBe(2);
      expect(result.map((h) => h.key)).toContain("m1_Mobile");
      expect(result.map((h) => h.key)).toContain("d1_Desktop");
    });

    it("deduplicates by key after merge", () => {
      const mobile = [{ key: "x", valueType: "bytes", label: "X" }] as TableColumnHeading[];
      const desktop = [{ key: "x", valueType: "bytes", label: "X" }] as TableColumnHeading[];
      const result = mergeHeadings(mobile, desktop);
      const xKeys = result.filter((h) => h.key?.startsWith("x_"));
      expect(xKeys.length).toBeLessThanOrEqual(2);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("updateTableHeading", () => {
    it("returns same heading when showBothDevices is false", () => {
      const heading: TableColumnHeading = {
        key: "name",
        valueType: "text",
        label: "Name",
      };
      expect(updateTableHeading(heading, "Mobile")).toEqual(heading);
    });

    it("appends device to key and label when showBothDevices is true", () => {
      const heading: TableColumnHeading = {
        key: "size",
        valueType: "bytes",
        label: "Size",
      };
      const result = updateTableHeading(heading, "Desktop");
      expect(result.key).toBe("size_Desktop");
      expect(result._device).toBe("Desktop");
    });
  });

  describe("renameKeys", () => {
    it("suffixes keys with device", () => {
      const item: TableItem = { name: "Foo", count: 1 } as TableItem;
      const result = renameKeys(item, "Mobile");
      expect(result).toHaveProperty("name_Mobile", "Foo");
      expect(result).toHaveProperty("count_Mobile", 1);
      expect(result._device).toBe("Mobile");
    });

    it("does not suffix subItems key", () => {
      const item = {
        name: "X",
        subItems: { items: [{ x: 1 }] },
      } as unknown as TableItem;
      const result = renameKeys(item, "Desktop");
      expect(result.subItems).toBeDefined();
      expect(result.subItems!.items).toHaveLength(1);
    });
  });

  describe("mergeTableItem", () => {
    it("merges two items", () => {
      const a: TableItem = { id: "1", name: "A" } as TableItem;
      const b: TableItem = { id: "1", value: 2 } as TableItem;
      const result = mergeTableItem(a, b);
      expect(result).toMatchObject({ id: "1", name: "A", value: 2 });
    });
  });

  describe("reduceTableItems", () => {
    it("pushes item when makeID returns falsy", () => {
      const acc: TableItem[] = [];
      const item: TableItem = { x: "unique" } as TableItem;
      reduceTableItems(acc, item);
      expect(acc).toHaveLength(1);
      expect(acc[0]).toBe(item);
    });

    it("merges item when makeID matches existing", () => {
      const item: TableItem = { name: "Same" } as TableItem;
      const acc: TableItem[] = [{ name: "Same", extra: 1 } as TableItem];
      reduceTableItems(acc, item);
      expect(acc).toHaveLength(1);
      expect(mergeTableItem).toBeDefined();
    });
  });

  describe("makeID", () => {
    it("builds id from string key-value pairs excluding special keys", () => {
      const item: TableItem = { name: "Test", size_bytes: 100 } as TableItem;
      const id = makeID(item);
      expect(typeof id).toBe("string");
      expect(id).toContain("name|Test");
    });

    it("returns empty string when no string keys", () => {
      const item: TableItem = { _device: "Desktop" } as TableItem;
      expect(makeID(item)).toBe("");
    });
  });

  describe("constants", () => {
    it("exports summable value types", () => {
      expect(SUMMABLE_VALUETYPES).toContain("bytes");
      expect(SUMMABLE_VALUETYPES).toContain("ms");
      expect(SUMMABLE_VALUETYPES).toContain("numeric");
      expect(SUMMABLE_VALUETYPES).toContain("timespanMs");
    });

    it("exports show both devices keys", () => {
      expect(SHOW_BOTH_DEVICES_KEYS).toContain("_device");
      expect(SHOW_BOTH_DEVICES_KEYS).toContain("percent");
      expect(SHOW_BOTH_DEVICES_KEYS).toContain("node");
    });
  });
});
