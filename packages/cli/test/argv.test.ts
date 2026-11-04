import { describe, expect, it } from "vitest";
import { firstPositional } from "../src/argv.js";
import { assertHttpUrl, lighthouseArgs, LIGHTHOUSE_VERSION, npxBinary } from "../src/core.js";

describe("firstPositional", () => {
  it.each([
    [["mcp"], "mcp"],
    [["--api", "http://x", "mcp"], "mcp"],
    [["--device", "mobile", "https://x.com"], "https://x.com"],
    [["https://x.com", "--device", "mobile"], "https://x.com"],
    [["--device=mobile", "--format", "json"], undefined],
  ])("%j -> %s", (argv, want) => {
    expect(firstPositional(argv as string[])).toBe(want);
  });
});

describe("core helpers", () => {
  it("rejects non-http(s) URLs", () => {
    expect(() => assertHttpUrl("file:///etc/passwd")).toThrow(/http/);
    expect(() => assertHttpUrl("nope")).toThrow(/Invalid URL/);
    expect(assertHttpUrl("http://localhost:3000")).toBe("http://localhost:3000/");
  });
  it("pins lighthouse", () => {
    expect(lighthouseArgs("https://x", "/tmp/o.json", "mobile")).toContain(`lighthouse@${LIGHTHOUSE_VERSION}`);
  });
  it("uses npx.cmd on windows", () => {
    expect(npxBinary("win32")).toBe("npx.cmd");
    expect(npxBinary("darwin")).toBe("npx");
  });
});
