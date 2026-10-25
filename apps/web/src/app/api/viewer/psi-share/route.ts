import {
  extractLighthouseFromPsiShareHtml,
  labelForPsiLighthouse,
} from "@/lib/viewer/extractLighthouseFromPsiShareHtml";
import { PsiShareUrlError, fetchPsiShareHtml, parsePsiShareUrl } from "@/lib/viewer/psiShareUrl";

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
    const shareUrl = parsePsiShareUrl(url);
    const html = await fetchPsiShareHtml(shareUrl);
    const reports = extractLighthouseFromPsiShareHtml(html);
    return Response.json({
      data: reports.map((lighthouseResult) => ({ lighthouseResult })),
      labels: reports.map((report, index) => labelForPsiLighthouse(report, index)),
    });
  } catch (error) {
    if (error instanceof PsiShareUrlError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Could not import PageSpeed report";
    return Response.json({ error: message }, { status: 502 });
  }
}
