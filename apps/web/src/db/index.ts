import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql/http";
import * as schema from "@/db/schema";

config({ path: ".env" });
export const db = drizzle({
  connection: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
  schema,
});
