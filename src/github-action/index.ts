import * as core from "@actions/core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { appendGithubEnvVar } from "./github-env";
import { normalizeHostname, resolveEnvAssignments } from "./pick-env";

async function run(): Promise<void> {
  const hostname = normalizeHostname(core.getInput("hostname", { required: true }));
  const apiKey = core.getInput("api-key", { required: true });
  const secret = core.getInput("secret", { required: true });
  const mode = (core.getInput("mode") || "export").toLowerCase();
  const outputPath = core.getInput("output-path");
  const pickLines = core.getMultilineInput("pick");
  const pick =
    pickLines.length > 0 ? pickLines.join("\n") : core.getInput("pick")?.trim() || undefined;
  const envPrefix = core.getInput("env_prefix") ?? "";

  const url = new URL("/api/ci/file", hostname);
  url.searchParams.set("secret", secret);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Cerberus request failed: HTTP ${res.status}${errText ? ` — ${errText.slice(0, 200)}` : ""}`);
  }

  let data: { content?: string };
  try {
    data = (await res.json()) as { content?: string };
  } catch {
    throw new Error("Cerberus returned non-JSON body");
  }

  const content = data.content;
  if (typeof content !== "string") {
    throw new Error("Cerberus response missing string content");
  }

  if (mode === "export") {
    if (!outputPath?.trim()) {
      throw new Error("output-path is required when mode is export");
    }
    const out = path.resolve(outputPath.trim());
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, content, "utf8");
    core.setOutput("output-path", out);
    return;
  }

  if (mode !== "env") {
    throw new Error(`mode must be "export" or "env" (got ${mode})`);
  }

  const assignments = resolveEnvAssignments({
    secretPath: secret,
    content,
    pickRaw: pick,
    envPrefix,
  });
  const githubEnv = process.env.GITHUB_ENV;

  for (const [envName, value] of Object.entries(assignments)) {
    core.exportVariable(envName, value);
    if (githubEnv) {
      await appendGithubEnvVar(githubEnv, envName, value);
    }
  }

  if (!githubEnv) {
    core.warning("GITHUB_ENV is not set; variables are set for this step only. Use in a normal job step on GitHub-hosted runners for persistence across steps.");
  }
}

run().catch((e) => {
  core.setFailed(e instanceof Error ? e.message : String(e));
});
