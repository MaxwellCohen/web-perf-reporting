function sortDataByKeyMaxValue<T>(
  data: T[],
  getKey: (item: T) => string,
  getValue: (item: T) => number,
  numReports: number,
): T[] {
  if (numReports <= 1) {
    return data;
  }

  const keyMaxMap = new Map<string, number>();
  data.forEach((item) => {
    const key = getKey(item);
    const value = getValue(item) || 0;
    const currentMax = keyMaxMap.get(key) || 0;
    keyMaxMap.set(key, Math.max(currentMax, value));
  });

  return data.sort((a, b) => {
    const aMax = keyMaxMap.get(getKey(a)) || 0;
    const bMax = keyMaxMap.get(getKey(b)) || 0;
    return bMax - aMax;
  });
}

/**
 * Sorts data by maximum value per key when multiple reports exist
 */
export function sortByMaxValue<T>(
  data: T[],
  getKey: (item: T) => string,
  getValue: (item: T) => number,
  numReports: number,
): T[] {
  return sortDataByKeyMaxValue(data, getKey, getValue, numReports);
}

/**
 * Sorts data by maximum value per composite key (e.g., URL + Type)
 */
export function sortByMaxValueComposite<T>(
  data: T[],
  getCompositeKey: (item: T) => string,
  getValue: (item: T) => number,
  numReports: number,
): T[] {
  return sortDataByKeyMaxValue(data, getCompositeKey, getValue, numReports);
}
