import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendGithubEnvVar } from "./github-env";

describe("appendGithubEnvVar", () => {
  it("writes heredoc format for multiline values", async () => {
    const dir = join(
      process.cwd(),
      "node_modules",
      ".cache",
      "cerberus-test-env",
    );
    const p = join(dir, "github-env-test");
    await rm(dir, { recursive: true }).catch(() => {});
    await mkdir(dir, { recursive: true });
    await appendGithubEnvVar(p, "K", "line1\nline2");
    const txt = await readFile(p, "utf8");
    const m = txt.match(/^K<<(CERBERUS_EOF_[a-f0-9]+)\nline1\nline2\n\1\n$/);
    expect(m).not.toBeNull();
  });
});
