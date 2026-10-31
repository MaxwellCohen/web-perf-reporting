import { describe, expect, it } from "vitest";
import {
  resolveWorkerEnvelope,
  type WorkerJobEnvelope,
} from "@/lib/page-speed-insights/resolveWorkerEnvelope";

describe("resolveWorkerEnvelope", () => {
  it("stringifies object data when completed", () => {
    expect(resolveWorkerEnvelope({ status: "completed", data: { ok: true } })).toEqual({
      kind: "ready",
      body: JSON.stringify({ ok: true }),
    });
  });
});
