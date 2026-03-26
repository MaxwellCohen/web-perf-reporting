"use client";

import type React from "react";

import { useActionState, useRef, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { executeSubmit, type FormInputs, type FormState } from "@/components/lh/input-form-action";
import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import { InputFormAlert } from "@/components/lh/inputs/InputFormAlert";
import { LhFileInput } from "@/components/lh/inputs/LhFileInput";
import { LhTabList } from "@/components/lh/inputs/LhTabList";
import { LhTextInput } from "@/components/lh/inputs/LhTextInput";
import { LhUrlInput } from "@/components/lh/inputs/LhUrlInput";

export function LhInputForm() {
  const [jsonInputs, setJsonInputs] = useState<LhJsonTextEntry[]>([{ name: "", content: "" }]);

  const [jsonFiles, setJsonFiles] = useState<LhJsonFileEntry[]>([]);

  const [jsonUrl, setJsonUrl] = useState("");
  const [activeTab, setActiveTab] = useState("text");

  const formStateRef = useRef<FormInputs>({
    jsonInputs,
    jsonFiles,
    jsonUrl,
    activeTab,
  });
  formStateRef.current = { jsonInputs, jsonFiles, jsonUrl, activeTab };

  const submitAction = async (prevState: FormState, formData: FormData) => {
    void formData;
    return executeSubmit(prevState, formStateRef.current, fetch);
  };

  const [state, formAction, isPending] = useActionState(submitAction, {
    error: null,
    success: false,
  } as FormState);

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Lighthouse Report Viewer</CardTitle>
        <CardDescription>View your Lighthouse Report</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="lh-input-form" action={formAction}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <LhTabList />
            <LhTextInput jsonInputs={jsonInputs} setJsonInputs={setJsonInputs} />
            <LhFileInput jsonFiles={jsonFiles} setJsonFiles={setJsonFiles} />
            <LhUrlInput jsonUrl={jsonUrl} setJsonUrl={setJsonUrl} />
          </Tabs>

          {state.error && <InputFormAlert type="error" message={state.error} />}
          {state.success && <InputFormAlert type="success" />}
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="lh-input-form" className="w-full" disabled={isPending}>
          {isPending ? "Processing..." : "Submit"}
        </Button>
      </CardFooter>
    </Card>
  );
}
