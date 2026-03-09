export type FormState = { error: string | null; success: boolean };

export type FormInputs = {
  jsonInputs: Array<{ name: string; content: string }>;
  jsonFiles: Array<{ name: string; file: File }>;
  jsonUrl: string;
  activeTab: string;
};

export function validateJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

export async function fetchJsonFromUrl(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON from URL: ${response.statusText}`);
  }
  const data = await response.text();
  if (!validateJson(data)) {
    throw new Error('URL did not return valid JSON');
  }
  return data;
}

export async function executeSubmit(
  _prevState: FormState,
  formInputs: FormInputs,
  fetchFn: typeof fetch = fetch,
): Promise<FormState> {
  const { jsonInputs, jsonFiles, jsonUrl, activeTab } = formInputs;

  try {
    const processedData: Array<{ name: string; data: unknown }> = [];

    if (activeTab === 'text') {
      if (jsonInputs.length === 0) {
        throw new Error('Please add at least one JSON entry');
      }

      for (const input of jsonInputs) {
        if (!input.name.trim()) {
          throw new Error('All JSON entries must have a name');
        }
        if (!input.content.trim()) {
          throw new Error(`JSON content for "${input.name}" is empty`);
        }
        if (!validateJson(input.content)) {
          throw new Error(`Invalid JSON format for "${input.name}"`);
        }
        processedData.push({
          name: input.name,
          data: JSON.parse(input.content),
        });
      }
    } else if (activeTab === 'file') {
      if (jsonFiles.length === 0) {
        throw new Error('Please select at least one JSON file');
      }

      for (const fileEntry of jsonFiles) {
        if (!fileEntry.name.trim()) {
          throw new Error('All files must have a name');
        }
        const fileContent = await fileEntry.file.text();
        if (!validateJson(fileContent)) {
          throw new Error(
            `File "${fileEntry.file.name}" does not contain valid JSON`,
          );
        }
        processedData.push({
          name: fileEntry.name,
          data: JSON.parse(fileContent),
        });
      }
    } else if (activeTab === 'url') {
      if (!jsonUrl.trim()) {
        throw new Error('Please enter a URL');
      }
      const jsonData = await fetchJsonFromUrl(jsonUrl, fetchFn);
      processedData.push({
        name: new URL(jsonUrl).hostname,
        data: JSON.parse(jsonData),
      });
    }

    return { error: null, success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'An unknown error occurred',
      success: false,
    };
  }
}
