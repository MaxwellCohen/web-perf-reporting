"use client";

import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import { LhFileInput } from "@/components/lh/inputs/LhFileInput";
import { LhTextInput } from "@/components/lh/inputs/LhTextInput";
import { PsiShareUrlInput } from "@/components/viewer/PsiShareUrlInput";
import type { ViewerRunMethod } from "@/components/viewer/collectViewerReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, FileJson, Globe, X } from "lucide-react";

export type ViewerRunState = {
  id: string;
  method: ViewerRunMethod;
  label: string;
  psiUrl: string;
  jsonFiles: LhJsonFileEntry[];
  jsonInputs: LhJsonTextEntry[];
};

/** Stable IDs for SSR; avoid module counters (they diverge across server/client). */
export function createEmptyViewerRun(
  overrides: Partial<ViewerRunState> = {},
): ViewerRunState {
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

type ViewerRunSlotProps = {
  run: ViewerRunState;
  onChange: (run: ViewerRunState) => void;
  title: string;
  labelPlaceholder: string;
  idPrefix: string;
  onRemove?: () => void;
};

export function ViewerRunSlot({
  run,
  onChange,
  title,
  labelPlaceholder,
  idPrefix,
  onRemove,
}: ViewerRunSlotProps) {
  const labelId = `${idPrefix}run-label`;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={labelId}>Run label (optional)</Label>
        <Input
          id={labelId}
          type="text"
          placeholder={labelPlaceholder}
          value={run.label}
          onChange={(event) => onChange({ ...run, label: event.target.value })}
        />
      </div>

      <Tabs
        value={run.method}
        onValueChange={(method) => onChange({ ...run, method: method as ViewerRunMethod })}
      >
        <TabsList className="mb-4 grid grid-cols-3">
          <TabsTrigger value="psi" className="flex items-center gap-2">
            <Globe size={16} />
            <span>PSI share URL</span>
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center gap-2">
            <FileJson size={16} />
            <span>Upload JSON</span>
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Code size={16} />
            <span>Paste JSON</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="psi">
          <PsiShareUrlInput
            idPrefix={idPrefix}
            psiShareUrl={run.psiUrl}
            setPsiShareUrl={(url) => onChange({ ...run, psiUrl: url })}
          />
        </TabsContent>
        <TabsContent value="file">
          <LhFileInput
            idPrefix={idPrefix}
            jsonFiles={run.jsonFiles}
            setJsonFiles={(updater) =>
              onChange({
                ...run,
                jsonFiles: typeof updater === "function" ? updater(run.jsonFiles) : updater,
              })
            }
          />
        </TabsContent>
        <TabsContent value="text">
          <LhTextInput
            idPrefix={idPrefix}
            jsonInputs={run.jsonInputs}
            setJsonInputs={(updater) =>
              onChange({
                ...run,
                jsonInputs: typeof updater === "function" ? updater(run.jsonInputs) : updater,
              })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
