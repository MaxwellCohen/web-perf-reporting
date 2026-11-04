const VALUE_FLAGS = new Set(["--device", "--format", "--file", "--api"]);

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
