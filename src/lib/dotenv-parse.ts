export type DotenvEntry = { key: string; value: string };

/**
 * Minimal .env-style parser: ignores blank lines and # comments;
 * supports KEY=value with optional single/double quotes.
 */
export function parseDotenv(content: string): DotenvEntry[] {
  const lines = content.split(/\r?\n/);
  const out: DotenvEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out.push({ key, value });
  }
  return out;
}
