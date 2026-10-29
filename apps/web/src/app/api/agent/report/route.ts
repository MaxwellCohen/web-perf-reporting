import { handleAgentReportRequest, handleAgentReportUsage } from "@/lib/agent/agentReportHandler";

export function POST(request: Request) {
  return handleAgentReportRequest(request);
}

export function GET(request: Request) {
  return handleAgentReportUsage(request);
}
