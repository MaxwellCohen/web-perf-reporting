import { buildLlmsTxt } from "@/lib/agent/llmsTxt";
import { getSiteUrl } from "@/lib/siteUrl";

export function GET() {
  return new Response(buildLlmsTxt(getSiteUrl()), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
