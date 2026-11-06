"use client";

import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import type { ViewerRunMethod } from "@/components/viewer/collectViewerReports";
import { detectRunInput, validateRun } from "@/components/viewer/viewerRunValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, FileJson, X } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";

export type ViewerRunState = {
  id: string;
  method: ViewerRunMethod;
  label: string;
  psiUrl: string;
  jsonFiles: LhJsonFileEntry[];
  jsonInputs: LhJsonTextEntry[];
};

/** Stable IDs for SSR; avoid module counters (they diverge across server/client). */
export function createEmptyViewerRun(overrides: Partial<ViewerRunState> = {}): ViewerRunState {
  return {
    method: "psi",
    label: "",
    psiUrl: "",
    jsonFiles: [],
    jsonInputs: [{ name: "", content: "" }],
    ...overrides,
    // Prefer explicit id (SSR-safe). Fallback only for client-only creates.
    id: overrides.id ?? crypto.randomUUID(),
  };
}

function rawValue(run: ViewerRunState) {
  return run.method === "psi" ? run.psiUrl : (run.jsonInputs[0]?.content ?? "");
}

type ViewerRunSlotProps = {
  run: ViewerRunState;
  onChange: (run: ViewerRunState) => void;
  /** Called with the updated run after a paste or drop, so the page can auto-submit. */
  onAutoSubmit?: (run: ViewerRunState) => void;
  title?: string;
  labelPlaceholder: string;
  idPrefix: string;
  onRemove?: () => void;
};

export function ViewerRunSlot({
  run,
  onChange,
  onAutoSubmit,
  title,
  labelPlaceholder,
  idPrefix,
  onRemove,
}: ViewerRunSlotProps) {
  const [showLabel, setShowLabel] = useState(Boolean(run.label));
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const validation = validateRun(run);

  const withText = (raw: string): ViewerRunState => {
    const kind = detectRunInput(raw);
    if (kind === "text") {
      return {
        ...run,
        method: "text",
        psiUrl: "",
        jsonInputs: [{ name: "", content: raw }],
      };
    }
    return {
      ...run,
      method: "psi",
      psiUrl: raw,
      jsonInputs: [{ name: "", content: "" }],
    };
  };

  const withFiles = (files: File[]): ViewerRunState => ({
    ...run,
    method: "file",
    jsonFiles: files.map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ""),
      file,
    })),
  });

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const next = withText(event.clipboardData.getData("text"));
    if (validateRun(next).status === "valid") onAutoSubmit?.(next);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;
    const next = withFiles(files);
    onChange(next);
    onAutoSubmit?.(next);
  };

  const labelId = `${idPrefix}run-label`;
  const inputId = `${idPrefix}run-input`;

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {title ? <b className="font-semibold text-foreground">{title}</b> : null}
          {!showLabel ? (
            <button type="button" className="underline" onClick={() => setShowLabel(true)}>
              + Add label
            </button>
          ) : null}
        </span>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
            aria-label={`Remove ${title ?? "run"}`}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {showLabel ? (
        <Input
          id={labelId}
          aria-label="Run label (optional)"
          type="text"
          placeholder={labelPlaceholder}
          value={run.label}
          onChange={(event) => onChange({ ...run, label: event.target.value })}
        />
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border-2 border-dashed p-3",
          dragging && "border-primary",
          validation.status === "valid" && "border-solid border-green-600",
          validation.status === "invalid" && "border-solid border-destructive",
        )}
      >
        {run.method === "file" && run.jsonFiles.length ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 truncate">
              <FileJson size={16} />
              {run.jsonFiles.map((entry) => entry.file.name).join(", ")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Clear file"
              onClick={() => onChange({ ...run, method: "psi", jsonFiles: [] })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              id={inputId}
              aria-label="PSI URL, JSON, or file"
              rows={2}
              className="resize-none border-0 p-0 font-mono text-sm shadow-none focus-visible:ring-0"
              placeholder="Paste a PSI URL or JSON, or drop a .json file…"
              value={rawValue(run)}
              onChange={(event) => onChange(withText(event.target.value))}
              onPaste={handlePaste}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Type is detected automatically ·{" "}
              <button type="button" className="underline" onClick={() => fileRef.current?.click()}>
                Choose file
              </button>
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          multiple
          hidden
          aria-label="Upload JSON Files"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) onChange(withFiles(files));
          }}
        />
      </div>

      {validation.status !== "empty" ? (
        <p
          role="status"
          className={cn(
            "flex items-center gap-1 text-xs",
            validation.status === "valid" ? "text-green-600" : "text-destructive",
          )}
        >
          {validation.status === "valid" ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
          {validation.message}
        </p>
      ) : null}
    </div>
  );
}
