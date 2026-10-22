import { describe, expect, it } from "vitest";
import { cruxSlots, historyScopeColumns } from "./slots";

describe("cruxSlots", () => {
  it("lists eight slots with origin then url for each form factor", () => {
    expect(cruxSlots().map((slot) => slot.key)).toEqual([
      "originAll",
      "urlAll",
      "originDESKTOP",
      "urlDESKTOP",
      "originTABLET",
      "urlTABLET",
      "originPHONE",
      "urlPHONE",
    ]);
  });

  it("maps origin and url scopes onto the Turso column pair", () => {
    const [originAll, urlAll] = cruxSlots();
    expect(historyScopeColumns("https://example.com", originAll)).toEqual({
      url: "",
      origin: "https://example.com",
    });
    expect(historyScopeColumns("https://example.com", urlAll)).toEqual({
      url: "https://example.com",
      origin: "",
    });
  });
});
