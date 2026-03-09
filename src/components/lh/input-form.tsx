'use client';

import type React from 'react';

import { useActionState, useRef, useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  executeSubmit,
  type FormInputs,
  type FormState,
} from '@/components/lh/input-form-action';
import { LhTabList } from '@/components/lh/LhTabList';
import { InputFormAlert } from '@/components/lh/InputFormAlert';
import { LhTextInput } from '@/components/lh/LhTextInput';
import { LhFileInput } from '@/components/lh/LhFileInput';
import { LhUrlInput } from '@/components/lh/LhUrlInput';

export function LhInputForm() {
  const [jsonInputs, setJsonInputs] = useState<
    Array<{ name: string; content: string }>
  >([{ name: '', content: '' }]);

  const [jsonFiles, setJsonFiles] = useState<
    Array<{ name: string; file: File }>
  >([]);

  const [jsonUrl, setJsonUrl] = useState('');
  const [activeTab, setActiveTab] = useState('text');

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

          {state.error && (
            <InputFormAlert type="error" message={state.error} />
          )}
          {state.success && <InputFormAlert type="success" />}
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form="lh-input-form"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? 'Processing...' : 'Submit'}
        </Button>
      </CardFooter>
    </Card>
  );
}
