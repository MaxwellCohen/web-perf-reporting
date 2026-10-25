import { describe, expect, it, vi } from "vitest";
import {
  PsiShareFetchError,
  PsiShareUrlError,
  fetchPsiShareHtml,
  parsePsiShareUrl,
} from "@/lib/viewer/psiShareUrl";

const SHARE = "https://pagespeed.web.dev/analysis/https-example-com/abc?form_factor=mobile";

describe("parsePsiShareUrl", () => {
  it("accepts a pagespeed.web.dev analysis link", () => {
    const url = parsePsiShareUrl(`  ${SHARE}  `);
    expect(url.hostname).toBe("pagespeed.web.dev");
    expect(url.pathname).toBe("/analysis/https-example-com/abc");
    expect(url.searchParams.get("form_factor")).toBe("mobile");
  });

  it.each([
    "https://evil.example/analysis/abc",
    "https://pagespeed.web.dev.evil.example/analysis/abc",
    "http://pagespeed.web.dev/analysis/abc",
    "https://pagespeed.web.dev/report/abc",
    "https://pagespeed.web.dev/analysis/",
    "https://user:pass@pagespeed.web.dev/analysis/abc",
    "https://pagespeed.web.dev:444/analysis/abc",
    "not a url",
  ])("rejects %s", (input) => {
    expect(() => parsePsiShareUrl(input)).toThrow(PsiShareUrlError);
  });
});

describe("fetchPsiShareHtml", () => {
  it("returns HTML from an allowed share URL", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("<html>ok</html>", { status: 200 }));
    await expect(fetchPsiShareHtml(parsePsiShareUrl(SHARE), fetchFn)).resolves.toBe(
      "<html>ok</html>",
    );
    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("follows redirects that stay on pagespeed.web.dev", async () => {
    const next = "https://pagespeed.web.dev/analysis/https-example-com/next";
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: next } }))
      .mockResolvedValueOnce(new Response("<html>next</html>", { status: 200 }));

    await expect(fetchPsiShareHtml(parsePsiShareUrl(SHARE), fetchFn)).resolves.toBe(
      "<html>next</html>",
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("rejects redirects off the allowlist", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/analysis/abc" },
        }),
      );
    await expect(fetchPsiShareHtml(parsePsiShareUrl(SHARE), fetchFn)).rejects.toThrow(
      PsiShareUrlError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("raises a fetch error when the share page is not ok", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    await expect(fetchPsiShareHtml(parsePsiShareUrl(SHARE), fetchFn)).rejects.toThrow(
      PsiShareFetchError,
    );
  });
});
