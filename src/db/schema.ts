import { CruxReport } from '@/lib/schema';
import * as t from 'drizzle-orm/sqlite-core';

export const historicalMetrics = t.sqliteTable('Historical_Metrics', {
  id: t.text().primaryKey(),
  url: t.text(),
  origin: t.text(),
  formFactor: t.text(),
  date: t.text().notNull(),
  data: t.blob({mode: 'json'}).$type<CruxReport>().notNull(),
},
(table) => [
  t.uniqueIndex('historicalMetrics2_index').on(
    table.url,
    table.formFactor,
    table.origin,
    table.date,
  ),
  t.index('historical_Metrics_url_index').on(table.url),
  t.index('historicalMetrics2_index').on(
    table.url,
    table.formFactor,
    table.origin,
  ),
]);


