import { defineEnv, string } from "void/env";

export default defineEnv({
  PAGESPEED_INSIGHTS_API: string(),
  WORKER_API_KEY: string(),
});
