import { parseViewerJsonString } from "@/components/viewer/parseViewerJson";
import {
  LighthouseViewerGistError,
  fetchLighthouseViewerGist,
  parseLighthouseViewerGistId,
} from "@/lib/viewer/lighthouseViewerGist";
import {
  PsiShareExtractError,
  extractLighthouseFromPsiShareHtml,
  labelForPsiLighthouse,
  type PsiEmbeddedLighthouse,
} from "@/lib/viewer/extractLighthouseFromPsiShareHtml";
import { PsiShareFetchError, PsiShareUrlError, fetchPsiShareHtml, parsePsiShareUrl } from "@/lib/viewer/psiShareUrl";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url =
    body && typeof body === "object" && "url" in body ? (body as { url: unknown }).url : "";
  if (typeof url !== "string" || !url.trim()) {
    return Response.json({ error: "Enter a PageSpeed Insights share URL" }, { status: 400 });
  }

  try {
    const gistId = parseLighthouseViewerGistId(url);
    if (gistId) {
      let reports: ReturnType<typeof parseViewerJsonString>;
      try {
        reports = parseViewerJsonString(await fetchLighthouseViewerGist(gistId));
      } catch (error) {
        if (error instanceof SyntaxError) {
          return Response.json(
            { error: "Gist does not contain a valid Lighthouse report" },
            { status: 400 },
          );
        }
        throw error;
      }
      return Response.json({
        data: reports,
        labels: reports.map((report, index) =>
          labelForPsiLighthouse(
            (report.lighthouseResult ?? {}) as unknown as PsiEmbeddedLighthouse,
            index,
          ),
        ),
      });
    }
    const shareUrl = parsePsiShareUrl(url);
    const html = await fetchPsiShareHtml(shareUrl);
    const reports = extractLighthouseFromPsiShareHtml(html);
    return Response.json({
      data: reports.map((lighthouseResult) => ({ lighthouseResult })),
      labels: reports.map((report, index) => labelForPsiLighthouse(report, index)),
    });
  } catch (error) {
    if (error instanceof PsiShareUrlError || error instanceof LighthouseViewerGistError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PsiShareFetchError || error instanceof PsiShareExtractError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    // Unexpected failure: keep internals out of the response.
    console.error("PSI share import failed:", error);
    return Response.json({ error: "Could not import PageSpeed report" }, { status: 502 });
  }
}
