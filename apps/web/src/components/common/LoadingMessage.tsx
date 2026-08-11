"use client";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ANALYSIS_STAGES = [
  "Launching lab tests",
  "Measuring Core Web Vitals",
  "Auditing resources & network",
  "Checking accessibility & SEO",
  "Assembling insights",
] as const;

const STAGE_INTERVAL_MS = 5000;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function stageStatus(index: number, activeIndex: number): "done" | "active" | "pending" {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "active";
  return "pending";
}

export function LoadingMessage() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    const stageInterval = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, ANALYSIS_STAGES.length - 1));
    }, STAGE_INTERVAL_MS);

    return () => {
      clearInterval(timerInterval);
      clearInterval(stageInterval);
    };
  }, []);

  const activeStage = ANALYSIS_STAGES[stageIndex];
  const circumference = 2 * Math.PI * 54;

  return (
    <div
      className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Generating PageSpeed Insights report"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-linear-to-r from-transparent via-border to-transparent"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8">
        <div className="relative grid place-items-center">
          <svg
            className="size-36 -rotate-90 motion-safe:animate-spin [animation-duration:1.4s]"
            viewBox="0 0 120 120"
            aria-hidden
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * 0.72}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
              {formatTime(elapsedTime)}
            </span>
            <span className="text-muted-foreground mt-0.5 text-[11px] tracking-[0.18em] uppercase">
              elapsed
            </span>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight">Generating report</h2>
          <p
            key={activeStage}
            className="text-foreground/85 min-h-6 text-base font-medium motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
          >
            {activeStage}…
          </p>
          <p className="text-muted-foreground text-sm">
            Lab runs usually finish within about a minute. Keep this tab open.
          </p>
        </div>

        <ol className="border-border/60 bg-card/40 w-full space-y-0 overflow-hidden rounded-xl border">
          {ANALYSIS_STAGES.map((stage, index) => {
            const status = stageStatus(index, stageIndex);
            return (
              <li
                key={stage}
                className={cn(
                  "flex items-center gap-3 border-b border-border/50 px-4 py-3 text-sm last:border-b-0",
                  status === "pending" && "text-muted-foreground/55",
                  status === "active" && "bg-muted/40 text-foreground",
                  status === "done" && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                    status === "done" && "border-foreground bg-foreground text-background",
                    status === "active" && "border-foreground",
                    status === "pending" && "border-border",
                  )}
                  aria-hidden
                >
                  {status === "done" ? (
                    <Check className="size-3 stroke-3" />
                  ) : status === "active" ? (
                    <span className="bg-foreground size-1.5 rounded-full motion-safe:animate-pulse" />
                  ) : (
                    <span className="size-1 rounded-full bg-transparent" />
                  )}
                </span>
                <span className={cn(status === "active" && "font-medium")}>{stage}</span>
                {status === "active" ? (
                  <span className="text-muted-foreground ml-auto font-mono text-[10px] tracking-wider uppercase">
                    running
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
