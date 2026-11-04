import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import { writeFileSync } from "node:fs";
import { lighthouseArgs, postReport, runAudit } from "../src/core.js";

function fakeChild(code: number, stderr = "") {
  const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
  child.stderr = new EventEmitter();
  setImmediate(() => {
    if (stderr) child.stderr.emit("data", stderr);
    child.emit("close", code);
  });
  return child;
}

beforeEach(() => {
  spawnMock.mockReset();
  vi.unstubAllGlobals();
});

describe("lighthouseArgs", () => {
  it("adds desktop preset only for desktop", () => {
    expect(lighthouseArgs("https://a.test", "/o.json", "desktop")).toContain("--preset=desktop");
    expect(lighthouseArgs("https://a.test", "/o.json", "mobile")).not.toContain("--preset=desktop");
  });
});

describe("runAudit", () => {
  it("posts an array for both devices to the configured API", async () => {
    spawnMock.mockImplementation((_cmd: string, args: string[]) => {
      const out = args.find((a) => a.startsWith("--output-path="))!.slice("--output-path=".length);
      writeFileSync(out, JSON.stringify({ d: args.includes("--preset=desktop") }));
      return fakeChild(0);
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response("# report"));
    vi.stubGlobal("fetch", fetchMock);
    const out = await runAudit({ url: "https://a.test", apiBase: "https://api.test/", format: "md" });
    expect(out).toBe("# report");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/agent/report?format=md");
    expect(JSON.parse(init.body)).toEqual([{ d: false }, { d: true }]);
  });

  it("includes stderr tail when Lighthouse fails", async () => {
    spawnMock.mockImplementation(() => fakeChild(1, "no chrome found"));
    await expect(runAudit({ url: "https://a.test", device: "mobile" })).rejects.toThrow(/no chrome found/);
  });

  it("skips Lighthouse with lighthouseJson", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
    await runAudit({ lighthouseJson: { audits: {} } });
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

describe("postReport", () => {
  it("reports status and body on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad body", { status: 400 })));
    await expect(postReport({}, { apiBase: "https://api.test" })).rejects.toThrow(/400: bad body/);
  });
});
