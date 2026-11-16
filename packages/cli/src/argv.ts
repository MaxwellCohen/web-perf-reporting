/** Value-taking flags of `trace`. Listed here, not in traceCli.ts, so routing never loads the trace engine. */
export const TRACE_VALUE_FLAGS = [
  "--time-range",
  "--category",
  "--navigation",
  "--nav",
  "--min-duration",
  "--tree",
  "--top",
  "--function",
  "--slowest",
  "--initiator-chain",
  "--name",
  "--cat",
  "--phase",
  "--fields",
  "--limit",
  "--grep",
];

const VALUE_FLAGS = new Set(["--device", "--format", "--file", "--api", ...TRACE_VALUE_FLAGS]);

/** argv without its first positional (the subcommand name), keeping flags and their values. */
export function dropFirstPositional(argv: string[]): string[] {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("-")) {
      if (VALUE_FLAGS.has(a)) i++;
      continue;
    }
    return [...argv.slice(0, i), ...argv.slice(i + 1)];
  }
  return argv;
}

/** First positional arg, skipping flags and the values of value-taking flags. */
export function firstPositional(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("-")) {
      if (VALUE_FLAGS.has(a)) i++;
      continue;
    }
    return a;
  }
  return undefined;
}
