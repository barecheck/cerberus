import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";

/** Append one variable in a GITHUB_ENV–compatible way (supports multiline values). */
export async function appendGithubEnvVar(
  envFilePath: string,
  name: string,
  value: string,
): Promise<void> {
  const delim = `CERBERUS_EOF_${randomBytes(12).toString("hex")}`;
  await appendFile(
    envFilePath,
    `${name}<<${delim}\n${value}\n${delim}\n`,
    "utf8",
  );
}
