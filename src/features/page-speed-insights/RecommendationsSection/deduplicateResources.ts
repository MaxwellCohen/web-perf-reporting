/**
 * Deduplicates resources by URL, keeping the entry with the maximum values.
 * Items without URLs are kept as-is (not deduplicated).
 */
export function deduplicateResourcesByUrl(
  items: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const resourceMap = new Map<string, Record<string, unknown>>();
  const itemsWithoutUrl: Array<Record<string, unknown>> = [];

  items.forEach((item) => {
    const url = item.url as string | undefined;
    
    // Keep items without URLs separately (don't deduplicate them)
    if (!url || url === 'Unattributable') {
      itemsWithoutUrl.push({ ...item });
      return;
    }

    const existing = resourceMap.get(url);
    
    if (!existing) {
      // First occurrence of this URL
      resourceMap.set(url, { ...item });
    } else {
      // Merge with existing entry, keeping maximum values
      const merged: Record<string, unknown> = { ...existing };
      
      // Merge numeric values, keeping the maximum
      const numericFields = [
        'wastedBytes',
        'wastedMs',
        'totalBytes',
        'wastedPercent',
        'scripting',
        'scriptParseCompile',
        'total',
      ];
      
      numericFields.forEach((field) => {
        const existingValue = existing[field] as number | undefined;
        const newValue = item[field] as number | undefined;
        
        if (newValue !== undefined) {
          if (existingValue === undefined || newValue > existingValue) {
            merged[field] = newValue;
          } else {
            merged[field] = existingValue;
          }
        } else if (existingValue !== undefined) {
          merged[field] = existingValue;
        }
      });
      
      // Preserve URL
      merged.url = url;
      
      // Merge any other fields, preferring new values
      Object.keys(item).forEach((key) => {
        if (!numericFields.includes(key) && key !== 'url') {
          merged[key] = item[key];
        }
      });
      
      resourceMap.set(url, merged);
    }
  });

  // Return deduplicated items with URLs first, then items without URLs
  return [...Array.from(resourceMap.values()), ...itemsWithoutUrl];
}

