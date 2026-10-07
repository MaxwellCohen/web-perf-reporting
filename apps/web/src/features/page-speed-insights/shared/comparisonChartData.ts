export type LabeledValue = {
  label: string;
  category: string;
  value: number;
};

export type ComparisonSeries = {
  key: string;
  label: string;
};

export type GroupedComparison = {
  series: ComparisonSeries[];
  rows: Array<Record<string, string | number>>;
};

type GroupedComparisonOptions = {
  /** Report labels in display order. Reports with no points still get a series. */
  labels?: string[];
  limit?: number;
  aggregate?: "sum" | "max";
  /**
   * `magnitude` puts the largest category first so it renders at the top.
   * `listed-top-first` keeps first-seen category order.
   */
  order?: "magnitude" | "listed-top-first";
};

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of labels) {
    if (seen.has(label)) continue;
    seen.add(label);
    unique.push(label);
  }
  return unique;
}

function comparisonSeriesFromLabels(labels: string[]): ComparisonSeries[] {
  return labels.map((label, index) => ({
    key: `r${index}`,
    label: label.trim() || `Report ${index + 1}`,
  }));
}

function maxValue(values: Record<string, number>, series: ComparisonSeries[]): number {
  let max = 0;
  for (const entry of series) {
    max = Math.max(max, values[entry.key] ?? 0);
  }
  return max;
}

export function buildGroupedComparison(
  points: LabeledValue[],
  { labels, limit, aggregate = "sum", order = "magnitude" }: GroupedComparisonOptions = {},
): GroupedComparison {
  const seriesLabels = uniqueLabels(labels ?? points.map((point) => point.label));
  const series = comparisonSeriesFromLabels(seriesLabels);
  const keyByLabel = new Map(seriesLabels.map((label, index) => [label, series[index]?.key]));

  const grouped = new Map<string, Record<string, number>>();
  const categoryOrder: string[] = [];

  for (const point of points) {
    if (!Number.isFinite(point.value)) continue;
    const seriesKey = keyByLabel.get(point.label);
    if (!seriesKey) continue;

    let values = grouped.get(point.category);
    if (!values) {
      values = {};
      grouped.set(point.category, values);
      categoryOrder.push(point.category);
    }

    if (aggregate === "max") {
      values[seriesKey] = Math.max(values[seriesKey] ?? 0, point.value);
    } else {
      values[seriesKey] = (values[seriesKey] ?? 0) + point.value;
    }
  }

  let categories =
    order === "listed-top-first"
      ? categoryOrder
      : categoryOrder.filter((category) => maxValue(grouped.get(category) ?? {}, series) > 0);

  if (order === "magnitude") {
    categories.sort(
      (categoryA, categoryB) =>
        maxValue(grouped.get(categoryB) ?? {}, series) -
        maxValue(grouped.get(categoryA) ?? {}, series),
    );
    if (limit && categories.length > limit) {
      categories = categories.slice(0, limit);
    }
  } else if (limit && categories.length > limit) {
    categories = categories.slice(0, limit);
  }

  const rows = categories.map((category) => {
    const values = grouped.get(category) ?? {};
    const row: Record<string, string | number> = { category };
    for (const entry of series) {
      row[entry.key] = values[entry.key] ?? 0;
    }
    return row;
  });

  return { series, rows };
}
