"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { catchError } from "next/error";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

type ErrorMessageProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

const DEFAULT_REPORT_ERROR_DESCRIPTION =
  "We couldn't load the PageSpeed Insights data. This might be due to a temporary issue or the report might not be available.";

export function ReportErrorCard({
  title = "Failed to Load Report",
  description = DEFAULT_REPORT_ERROR_DESCRIPTION,
  testUrl,
  onRetry,
  onRunAgain,
  runAgainPending = false,
}: {
  title?: string;
  description?: string;
  testUrl?: string;
  /** Re-fetches the same report (timeouts / transient errors). */
  onRetry?: () => void;
  /** Restarts the run for the same URL (failed jobs). */
  onRunAgain?: () => void;
  runAgainPending?: boolean;
}) {
  const hasActions = Boolean(onRetry || onRunAgain);
  return (
    <div className="flex flex-col items-center justify-center min-h-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          {testUrl ? (
            <p className="text-sm text-muted-foreground mt-2 text-left break-all">
              <span className="font-medium">URL tested: </span>
              <a
                href={testUrl}
                className="underline hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                {testUrl}
              </a>
            </p>
          ) : null}
          <CardDescription className="mt-2 whitespace-pre-wrap text-left">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {onRetry ? (
            <Button className="w-full" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {onRunAgain ? (
            <Button className="w-full" onClick={onRunAgain} disabled={runAgainPending}>
              {runAgainPending ? "Starting…" : "Run again"}
            </Button>
          ) : null}
          <Button asChild variant={hasActions ? "outline" : "default"} className="w-full">
            <Link href="/page-speed">{hasActions ? "Start a new report" : "Try Again"}</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">Go to Homepage</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorMessageFallback({ title, description }: Omit<ErrorMessageProps, "children">) {
  return <ReportErrorCard title={title} description={description} />;
}

export const ErrorMessage = catchError(ErrorMessageFallback);
