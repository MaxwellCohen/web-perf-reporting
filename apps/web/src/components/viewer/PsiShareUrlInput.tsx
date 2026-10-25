"use client";

import type React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";

type PsiShareUrlInputProps = {
  psiShareUrl: string;
  setPsiShareUrl: React.Dispatch<React.SetStateAction<string>>;
};

export function PsiShareUrlInput({ psiShareUrl, setPsiShareUrl }: PsiShareUrlInputProps) {
  return (
    <TabsContent value="psi">
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
    </TabsContent>
  );
}
