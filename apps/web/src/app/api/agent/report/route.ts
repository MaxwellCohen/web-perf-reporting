import { handleAgentReportRequest } from "@/lib/agent/agentReportHandler";

// The handler blocks up to MAX_WAIT_SECONDS (50) polling PageSpeed before answering 202.
export const maxDuration = 60;

export function GET(request: Request) {
  return handleAgentReportRequest(request);
}
