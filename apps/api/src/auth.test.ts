import { describe, expect, it } from "vitest";
import { isAuthorized } from "./auth";

describe("isAuthorized", () => {
  it("accepts the shared secret from the header or query", () => {
    expect(isAuthorized("secret", undefined, "secret")).toBe(true);
    expect(isAuthorized(undefined, "secret", "secret")).toBe(true);
  });

  it("rejects a missing or wrong secret", () => {
    expect(isAuthorized(undefined, undefined, "secret")).toBe(false);
    expect(isAuthorized("nope", "also-nope", "secret")).toBe(false);
    expect(isAuthorized("secret", undefined, undefined)).toBe(false);
  });
});
