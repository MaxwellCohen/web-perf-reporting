"use client";

import type React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import {
  DEFAULT_PSI_RUN_LABEL_A,
  DEFAULT_PSI_RUN_LABEL_B,
} from "@/lib/viewer/psiCompareLabels";

type PsiShareUrlInputProps = {
  psiShareUrl: string;
  setPsiShareUrl: React.Dispatch<React.SetStateAction<string>>;
  psiRunLabel: string;
  setPsiRunLabel: React.Dispatch<React.SetStateAction<string>>;
  psiCompareUrl: string;
  setPsiCompareUrl: React.Dispatch<React.SetStateAction<string>>;
  psiCompareLabel: string;
  setPsiCompareLabel: React.Dispatch<React.SetStateAction<string>>;
};

export function PsiShareUrlInput({
  psiShareUrl,
  setPsiShareUrl,
  psiRunLabel,
  setPsiRunLabel,
  psiCompareUrl,
  setPsiCompareUrl,
  psiCompareLabel,
  setPsiCompareLabel,
}: PsiShareUrlInputProps) {
  return (
    <TabsContent value="psi">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="psi-share-url">PageSpeed Insights URL</Label>
            <Input
              id="psi-share-url"
              type="url"
              placeholder="https://pagespeed.web.dev/analysis/..."
              value={psiShareUrl}
              onChange={(event) => setPsiShareUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="psi-run-label">Run label (optional)</Label>
            <Input
              id="psi-run-label"
              type="text"
              placeholder={DEFAULT_PSI_RUN_LABEL_A}
              value={psiRunLabel}
              onChange={(event) => setPsiRunLabel(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Compare with (optional)</p>
            <p className="text-xs text-muted-foreground">
              Add a second PSI share to compare side-by-side. Leave blank for a single report.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="psi-compare-url">Second PageSpeed Insights URL</Label>
            <Input
              id="psi-compare-url"
              type="url"
              placeholder="https://pagespeed.web.dev/analysis/..."
              value={psiCompareUrl}
              onChange={(event) => setPsiCompareUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="psi-compare-label">Compare run label (optional)</Label>
            <Input
              id="psi-compare-label"
              type="text"
              placeholder={DEFAULT_PSI_RUN_LABEL_B}
              value={psiCompareLabel}
              onChange={(event) => setPsiCompareLabel(event.target.value)}
              disabled={!psiCompareUrl.trim()}
            />
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
