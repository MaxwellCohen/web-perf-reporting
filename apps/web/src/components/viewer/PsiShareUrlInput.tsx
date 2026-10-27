"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PsiShareUrlInputProps = {
  psiShareUrl: string;
  setPsiShareUrl: (url: string) => void;
  idPrefix?: string;
};

export function PsiShareUrlInput({
  psiShareUrl,
  setPsiShareUrl,
  idPrefix = "",
}: PsiShareUrlInputProps) {
  const urlId = `${idPrefix}psi-share-url`;

  return (
    <div className="space-y-2">
      <Label htmlFor={urlId}>PageSpeed Insights URL</Label>
      <Input
        id={urlId}
        type="url"
        placeholder="https://pagespeed.web.dev/analysis/..."
        value={psiShareUrl}
        onChange={(event) => setPsiShareUrl(event.target.value)}
      />
    </div>
  );
}
