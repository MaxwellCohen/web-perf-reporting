import { buildLocalScript } from "@/lib/stream-timing/localScript";
import { requestOrigin } from "@/lib/stream-timing/origin";
import { getSiteUrl } from "@/lib/siteUrl";

export function GET(request: Request) {
  return new Response(buildLocalScript(requestOrigin(request, getSiteUrl())), {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}
