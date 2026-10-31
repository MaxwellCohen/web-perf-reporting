"use client";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const LAB_STAGES = [
  "Launching lab tests",
  "Measuring Core Web Vitals",
  "Auditing resources & network",
  "Checking accessibility & SEO",
  "Assembling insights",
] as const;

const CRUX_STAGES = [
  "Querying Chrome UX Report",
  "Retrieving Core Web Vitals",
  "Loading device & form factors",
  "Preparing charts",
] as const;

const LOADING_VARIANTS = {
  lab: {
    stages: LAB_STAGES,
    title: "Generating report",
    description: "Lab runs usually finish within about a minute. Keep this tab open.",
    ariaLabel: "Generating PageSpeed Insights report",
    stageIntervalMs: 5000,
  },
  crux: {
    stages: CRUX_STAGES,
    title: "Looking up CrUX data",
    description: "Fetching real-user experience metrics. This usually takes a few seconds.",
    ariaLabel: "Looking up Chrome UX Report data",
    stageIntervalMs: 2500,
  },
} as const;

export type LoadingMessageVariant = keyof typeof LOADING_VARIANTS;

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

export function LoadingMessage({ variant = "lab" }: { variant?: LoadingMessageVariant } = {}) {
  const config = LOADING_VARIANTS[variant];
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    const stageInterval = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, config.stages.length - 1));
    }, config.stageIntervalMs);

    return () => {
      clearInterval(timerInterval);
      clearInterval(stageInterval);
    };
  }, [config.stageIntervalMs, config.stages.length]);

  const activeStage = config.stages[stageIndex];
  const circumference = 2 * Math.PI * 54;

  return (
    <div
      className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={config.ariaLabel}
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
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
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
          <h2 className="text-2xl font-extrabold tracking-tight">{config.title}</h2>
          <p
            key={activeStage}
            className="text-foreground/85 min-h-6 text-base font-medium motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
          >
            {activeStage}…
          </p>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>

        <ol className="border-border/60 bg-card/40 w-full space-y-0 overflow-hidden rounded-xl border">
          {config.stages.map((stage, index) => {
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
                    {variant === "crux" ? "looking up" : "running"}
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
