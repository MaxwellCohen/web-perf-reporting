import { runCruxLookup } from "@/lib/crux/runCruxLookup";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const pageUrl = body?.url?.trim();
  if (!pageUrl) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const job = await runCruxLookup("current", pageUrl);
  return Response.json(job);
}
