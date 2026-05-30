import { describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";

const redirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirect(path),
}));

describe("app/not-found", () => {
  it("redirects users back to the homepage", () => {
    const element = NotFound();

    expect(redirect).toHaveBeenCalledWith("/");
    expect(element).toBeDefined();
  });
});
