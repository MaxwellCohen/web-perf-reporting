import { defineConfig } from "void/config";

/**
 * New worker name on purpose. Do not point this at web-perf-report-cf.
 * KV and R2 ids are the live stores so existing PageSpeed reports stay put.
 * `storage: false` keeps Void from creating an empty STORAGE bucket.
 */
export default defineConfig({
  target: "cloudflare",
  inference: {
    appType: "void",
    bindings: {
      db: true,
      kv: true,
      storage: false,
    },
  },
  worker: {
    compatibility_date: "2026-02-24",
    compatibility_flags: ["nodejs_compat"],
  },
  cloudflare: {
    name: "web-perf-report-api",
    workers_dev: true,
    preview_urls: true,
    routes: [],
    kv_namespaces: [{ binding: "KV", id: "a243d4365c5542e789045e74791afdda" }],
    r2_buckets: [{ binding: "RESULTS_BUCKET", bucket_name: "api-results" }],
  },
});
