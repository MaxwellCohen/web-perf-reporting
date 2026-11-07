import { createRequire } from "node:module";

// Resolved at runtime from the package root (works from src/ and dist/).
export const version: string = createRequire(import.meta.url)("../package.json").version;
