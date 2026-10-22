type CruxKind = "current" | "history";

function workerCruxUrl(kind: CruxKind, jobId?: string): string {
  const origin = process.env.WORKER_URL;
  if (!origin) {
    throw new Error("WORKER_URL is not set");
  }
  const url = new URL(`/crux/${kind}`, origin);
  if (jobId) url.searchParams.set("jobId", jobId);
  return url.toString();
}

async function passThrough(response: Response): Promise<Response> {
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

function unreachable(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Could not reach the CrUX API";
  return Response.json({ error: message }, { status: 500 });
}

export async function proxyCruxPost(kind: CruxKind, request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const pageUrl = body?.url?.trim();
  if (!pageUrl) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const response = await fetch(workerCruxUrl(kind), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.WORKER_API_KEY ?? "",
      },
      body: JSON.stringify({ url: pageUrl }),
    });
    return passThrough(response);
  } catch (error) {
    return unreachable(error);
  }
}

export async function proxyCruxGet(kind: CruxKind, request: Request): Promise<Response> {
  const jobId = new URL(request.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return Response.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    return passThrough(await fetch(workerCruxUrl(kind, jobId)));
  } catch (error) {
    return unreachable(error);
  }
}
