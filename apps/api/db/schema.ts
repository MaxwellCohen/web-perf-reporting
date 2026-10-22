import { blob, index, integer, sqliteTable, text, uniqueIndex } from "void/schema-d1";

/** CrUX history copied from Turso `Historical_Metrics`. PageSpeed payloads stay in R2. */
export const historicalMetrics = sqliteTable(
  "Historical_Metrics",
  {
    id: text().primaryKey(),
    url: text(),
    origin: text(),
    formFactor: text(),
    date: text().notNull(),
    date2: integer({ mode: "timestamp" }),
    data: blob({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    uniqueIndex("historicalMetrics_record_unique").on(
      table.url,
      table.formFactor,
      table.origin,
      table.date,
    ),
    index("historical_Metrics_url_index").on(table.url),
    index("historicalMetrics_scope_index").on(table.url, table.formFactor, table.origin),
  ],
);
