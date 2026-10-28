// `vite build` emits dist/ssr/wrangler.json but not wrangler's deploy pointer.
// Without it, a bare `wrangler deploy` (Cloudflare Workers Builds) finds no
// config, runs auto-setup and breaks the Void build. Point wrangler at the
// generated config so `wrangler deploy` uploads what the build produced.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generated = resolve(root, "dist/ssr/wrangler.json");
const pointer = resolve(root, ".wrangler/deploy/config.json");

if (!existsSync(generated)) {
  throw new Error(`Expected build output at ${generated}`);
}

mkdirSync(dirname(pointer), { recursive: true });
writeFileSync(
  pointer,
  `${JSON.stringify({ configPath: relative(dirname(pointer), generated) }, null, 2)}\n`,
);
console.log(`Wrote ${relative(root, pointer)} -> ${relative(root, generated)}`);
