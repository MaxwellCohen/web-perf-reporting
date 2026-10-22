import { proxyCruxGet, proxyCruxPost } from "@/lib/crux/proxyCruxJob";

export function POST(request: Request) {
  return proxyCruxPost("history", request);
}

export function GET(request: Request) {
  return proxyCruxGet("history", request);
}
