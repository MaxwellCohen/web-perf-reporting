import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/agent/delivery/route";

describe("/api/agent/delivery", () => {
  it("requires a url", async () => {
    const res = await GET(new Request("http://x/api/agent/delivery"));
    expect(res.status).toBe(400);
  });

  it("rejects private hosts before doing any work", async () => {
    const res = await GET(
      new Request("http://x/api/agent/delivery?url=http://localhost:8080&format=md"),
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("text/markdown");
  });

  it("rejects a non-JSON POST body", async () => {
    const res = await POST(
      new Request("http://x/api/agent/delivery", { method: "POST", body: "nope" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects private hosts in a POST body", async () => {
    const res = await POST(
      new Request("http://x/api/agent/delivery", {
        method: "POST",
        body: JSON.stringify({ url: "http://10.0.0.1" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
