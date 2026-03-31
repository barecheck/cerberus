export type DotenvEntry = { key: string; value: string };

function tryParseDotenvLine(line: string): DotenvEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  if (!key) return null;
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

/**
 * Minimal .env-style parser: ignores blank lines and # comments;
 * supports KEY=value with optional single/double quotes.
 */
export function parseDotenv(content: string): DotenvEntry[] {
  const lines = content.split(/\r?\n/);
  const out: DotenvEntry[] = [];
  for (const line of lines) {
    const entry = tryParseDotenvLine(line);
    if (entry) out.push(entry);
  }
  return out;
}

/** Drops every line that {@link parseDotenv} would treat as this key (preserves comments and blanks). */
export function removeDotenvKey(content: string, key: string): string {
  const lines = content.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const entry = tryParseDotenvLine(line);
    return !entry || entry.key !== key;
  });
  return filtered.join("\n");
}
