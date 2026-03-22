'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { LhJsonTextEntry } from '@/components/lh/types';
import { RemoveJsonEntryButton } from '@/components/lh/inputs/RemoveJsonEntryButton';

type LhTextInputProps = {
  jsonInputs: LhJsonTextEntry[];
  setJsonInputs: React.Dispatch<React.SetStateAction<LhJsonTextEntry[]>>;
};

export function LhTextInput({ jsonInputs, setJsonInputs }: LhTextInputProps) {
  const addJsonInput = () => {
    setJsonInputs((prev) => [...prev, { name: '', content: '' }]);
  };

  const updateJsonInput = (
    index: number,
    field: 'name' | 'content',
    value: string,
  ) => {
    setJsonInputs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeJsonInput = (index: number) => {
    setJsonInputs((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <TabsContent value="text">
      <div className="space-y-4">
        <Label>JSON Entries</Label>
        {jsonInputs.map((input, index) => (
          <div key={index} className="relative space-y-2 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`json-name-${index}`} className="w-24">
                Name:
              </Label>
              <Input
                id={`json-name-${index}`}
                placeholder="Entry name"
                value={input.name}
                onChange={(e) => updateJsonInput(index, 'name', e.target.value)}
                className="flex-1"
              />
              <RemoveJsonEntryButton
                onRemove={() => removeJsonInput(index)}
              />
            </div>
            <div>
              <Label htmlFor={`json-text-${index}`}>JSON Content</Label>
              <Textarea
                id={`json-text-${index}`}
                placeholder='{"example": "Paste your JSON here"}'
                className="mt-1 min-h-[150px] font-mono"
                value={input.content}
                onChange={(e) =>
                  updateJsonInput(index, 'content', e.target.value)
                }
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={addJsonInput}
          className="w-full"
        >
          Add Another JSON Entry
        </Button>
      </div>
    </TabsContent>
  );
}
