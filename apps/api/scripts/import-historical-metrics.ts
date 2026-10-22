import { createClient, type Client, type InValue } from "@libsql/client";
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import path from "node:path";

const D1_ROW_LIMIT_BYTES = 2_000_000;
const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS Historical_Metrics (
  id text PRIMARY KEY NOT NULL,
  url text,
  origin text,
  formFactor text,
  date text NOT NULL,
  date2 integer,
  data text NOT NULL
);
`;

function asBytes(value: unknown): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === "string") return Buffer.from(value);
  return Buffer.from(JSON.stringify(value));
}

function sqlText(value: unknown): string {
  return new TextDecoder().decode(asBytes(value));
}

async function countRows(client: Client): Promise<number> {
  const result = await client.execute("SELECT COUNT(*) AS count FROM Historical_Metrics");
  return Number(result.rows[0]?.count ?? 0);
}

async function main() {
  config({ path: path.resolve(import.meta.dirname, "../../../apps/web/.env") });
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN are required in apps/web/.env");
    process.exitCode = 1;
    return;
  }

  const remote = createClient({ url, authToken });
  const remoteCount = await countRows(remote);
  const remoteRows = await remote.execute(
    "SELECT id, url, origin, formFactor, date, date2, data FROM Historical_Metrics",
  );

  let maxBytes = 0;
  let oversized = 0;
  for (const row of remoteRows.rows) {
    const bytes = asBytes(row.data).byteLength;
    if (bytes > maxBytes) maxBytes = bytes;
    if (bytes > D1_ROW_LIMIT_BYTES) oversized++;
  }

  const dataDir = path.resolve(import.meta.dirname, "../.data");
  mkdirSync(dataDir, { recursive: true });
  const local = createClient({ url: `file:${path.join(dataDir, "historical-metrics.db")}` });
  await local.execute("DROP TABLE IF EXISTS Historical_Metrics");
  await local.execute(CREATE_TABLE);

  const batchSize = 40;
  for (let index = 0; index < remoteRows.rows.length; index += batchSize) {
    const chunk = remoteRows.rows.slice(index, index + batchSize);
    await local.batch(
      chunk.map((row) => ({
        sql: `INSERT INTO Historical_Metrics (id, url, origin, formFactor, date, date2, data)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id,
          row.url ?? "",
          row.origin ?? "",
          row.formFactor ?? "",
          row.date,
          row.date2 ?? null,
          sqlText(row.data),
        ] as InValue[],
      })),
      "write",
    );
  }

  const localCount = await countRows(local);
  const localMax = await local.execute("SELECT MAX(length(data)) AS maxBytes FROM Historical_Metrics");
  console.log(
    JSON.stringify({
      remoteCount,
      localCount,
      maxBytes,
      localMaxBytes: Number(localMax.rows[0]?.maxBytes ?? 0),
      oversized,
      matches: remoteCount === localCount && Number(localMax.rows[0]?.maxBytes ?? 0) === maxBytes,
    }),
  );
  if (remoteCount !== localCount || Number(localMax.rows[0]?.maxBytes ?? 0) !== maxBytes) {
    process.exitCode = 1;
  }
  remote.close();
  local.close();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
