"use client";

import { useActionState, useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { executeSubmit, type FormState } from "@/components/lh/input-form-action";
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

  const submitAction = async (prevState: FormState) =>
    executeSubmit(prevState, { jsonInputs, jsonFiles, jsonUrl, activeTab }, fetch);

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
            <TabsContent value="text">
              <LhTextInput jsonInputs={jsonInputs} setJsonInputs={setJsonInputs} />
            </TabsContent>
            <TabsContent value="file">
              <LhFileInput jsonFiles={jsonFiles} setJsonFiles={setJsonFiles} />
            </TabsContent>
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
