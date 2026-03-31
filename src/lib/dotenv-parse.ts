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

function formatDotenvLine(key: string, value: string): string {
  const needsQuotes =
    /[\s#"']/.test(value) ||
    (value.length > 0 && value !== value.trim());
  const encoded = needsQuotes
    ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : value;
  return `${key}=${encoded}`;
}

export type AppendDotenvKeyResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

/** Appends `KEY=value` at the end (preserves existing lines). Rejects duplicate keys {@link parseDotenv} would surface. */
export function appendDotenvKey(
  content: string,
  key: string,
  value: string,
): AppendDotenvKeyResult {
  const k = key.trim();
  if (!k) {
    return { ok: false, error: "Enter a variable name" };
  }
  if (k.includes("=")) {
    return { ok: false, error: "Key cannot contain \"=\"" };
  }
  if (k.startsWith("#")) {
    return { ok: false, error: "Key cannot start with #" };
  }
  if (/\r|\n/.test(k)) {
    return { ok: false, error: "Key cannot span lines" };
  }
  if (/\r|\n/.test(value)) {
    return { ok: false, error: "Value cannot contain line breaks" };
  }

  const entries = parseDotenv(content);
  if (entries.some((e) => e.key === k)) {
    return { ok: false, error: `"${k}" is already defined` };
  }

  const line = formatDotenvLine(k, value);
  const trimmedEnd = content.replace(/\s+$/, "");
  const next = trimmedEnd === "" ? line : `${trimmedEnd}\n${line}`;
  return { ok: true, content: next };
}
