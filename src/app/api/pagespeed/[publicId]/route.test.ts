import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/pagespeed/[publicId]/route";

describe("app/api/pagespeed/[publicId] route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a validation error when no public id is provided", async () => {
    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "" }),
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("No publicId provided");
  });

  it("returns json data when the worker reports a completed result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "completed", data: { ok: true } }),
    } as Response);

    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(JSON.stringify({ ok: true }));
  });

  it("returns 500 when fetch is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
    } as Response);

    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "abc123" }),
    });

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("Error fetching data!");
  });

  it("returns 404 when worker returns no data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => null,
    } as Response);

    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "abc123" }),
    });

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Data is not yet ready no data!!");
  });

  it("returns 500 when worker status is failed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "failed" }),
    } as Response);

    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "abc123" }),
    });

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toContain("Failed to fetch data!");
  });

  it("returns a not-ready response when the worker is still processing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "pending" }),
    } as Response);

    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "abc123" }),
    });

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe(JSON.stringify({ status: "pending" }));
  });

  it("returns 200 with full data when completed but no data.data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "completed", meta: "info" }),
    } as Response);

    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      JSON.stringify({ status: "completed", meta: "info" }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const response = await GET({} as any, {
      params: Promise.resolve({ publicId: "abc123" }),
    });

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("Internal server error");
  });
});
