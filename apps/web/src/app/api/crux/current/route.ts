import { proxyCruxGet, proxyCruxPost } from "@/lib/crux/proxyCruxJob";

export function POST(request: Request) {
  return proxyCruxPost("current", request);
}

export function GET(request: Request) {
  return proxyCruxGet("current", request);
}
