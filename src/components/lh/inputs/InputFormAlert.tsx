'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type InputFormAlertProps =
  | { type: 'error'; message: string }
  | { type: 'success' };

export function InputFormAlert(props: InputFormAlertProps) {
  if (props.type === 'error') {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{props.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        JSON data has been successfully processed.
      </AlertDescription>
    </Alert>
  );
}
