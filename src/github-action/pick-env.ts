import { parseDotenv } from "./dotenv-parse";

function pathBasename(secretPath: string): string {
  const parts = secretPath.trim().split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function isDotenvPath(secretPath: string): boolean {
  return pathBasename(secretPath).endsWith(".env");
}

/**
 * Parse pick input: one entry per line (YAML block scalar), or comma-separated on one line, or a single token.
 * Does not accept JSON objects/arrays — use workflow list style with `pick: |` multiline strings.
 */
export function parsePickList(pickRaw: string | undefined): string[] {
  if (pickRaw === undefined || pickRaw.trim() === "") return [];
  const t = pickRaw.trim();
  if (t.includes("\n")) {
    return t
      .split(/\r?\n/)
      .map((s) => s.replace(/^\s*-\s+/, "").trim())
      .filter((s) => s.length > 0 && !s.startsWith("#"));
  }
  if (t.includes(",")) {
    return t
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [t];
}

function exportName(fileOrEnvKey: string, envPrefix: string): string {
  return `${envPrefix}${fileOrEnvKey}`;
}

/** Build env name -> value for mode=env. Names always use dotenv key (or single raw name) plus env_prefix. */
export function resolveEnvAssignments(params: {
  secretPath: string;
  content: string;
  pickRaw: string | undefined;
  envPrefix: string;
}): Record<string, string> {
  const { secretPath, content, pickRaw, envPrefix } = params;
  const dotenvPath = isDotenvPath(secretPath);
  const keys = parsePickList(pickRaw);

  if (!dotenvPath) {
    if (keys.length === 0) {
      throw new Error(
        "For non-.env files, pick is required: one env name (exported as env_prefix + name), or multiple lines with a single name only",
      );
    }
    if (keys.length > 1) {
      throw new Error("For non-.env files, pick must contain exactly one env name");
    }
    const logical = keys[0];
    const name = exportName(logical, envPrefix);
    return { [name]: content };
  }

  const entries = parseDotenv(content);
  const map = new Map(entries.map((e) => [e.key, e.value]));

  if (keys.length === 0) {
    throw new Error(
      "For .env files in env mode, pick is required: newline-separated keys, comma-separated keys, or one key per workflow line (see README).",
    );
  }

  const out: Record<string, string> = {};
  for (const k of keys) {
    if (!k.trim()) continue;
    const v = map.get(k);
    if (v === undefined) throw new Error(`Key not found in .env: ${k}`);
    const name = exportName(k, envPrefix);
    out[name] = v;
  }
  return out;
}

export function normalizeHostname(hostname: string): string {
  const t = hostname.trim().replace(/\/+$/, "");
  if (!t.startsWith("http://") && !t.startsWith("https://")) {
    return `https://${t}`;
  }
  return t;
}
