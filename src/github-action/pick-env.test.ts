import { describe, expect, it } from "vitest";
import { normalizeHostname, parsePickList, resolveEnvAssignments } from "./pick-env";

describe("normalizeHostname", () => {
  it("adds https when missing", () => {
    expect(normalizeHostname("vault.example.com")).toBe("https://vault.example.com");
  });

  it("strips trailing slashes", () => {
    expect(normalizeHostname("https://vault.example.com///")).toBe("https://vault.example.com");
  });
});

describe("parsePickList", () => {
  it("parses multiline keys", () => {
    expect(parsePickList("API_KEY\nDATABASE_URL")).toEqual(["API_KEY", "DATABASE_URL"]);
  });

  it("strips YAML-style list markers", () => {
    expect(parsePickList("- API_KEY\n- DATABASE_URL")).toEqual(["API_KEY", "DATABASE_URL"]);
  });

  it("parses comma-separated line", () => {
    expect(parsePickList("API_KEY, DATABASE_URL")).toEqual(["API_KEY", "DATABASE_URL"]);
  });

  it("parses single token", () => {
    expect(parsePickList("MY_KEY")).toEqual(["MY_KEY"]);
  });
});

describe("resolveEnvAssignments", () => {
  const envBody = "A=1\nB=two\n# c\nC=\"x\"\n";

  it("dotenv + multiline pick", () => {
    const out = resolveEnvAssignments({
      secretPath: "team/prod/.env",
      content: envBody,
      pickRaw: "A\nB",
      envPrefix: "",
    });
    expect(out).toEqual({ A: "1", B: "two" });
  });

  it("dotenv + env_prefix", () => {
    const out = resolveEnvAssignments({
      secretPath: "team/prod/.env",
      content: envBody,
      pickRaw: "A,B",
      envPrefix: "CERBERUS_",
    });
    expect(out).toEqual({ CERBERUS_A: "1", CERBERUS_B: "two" });
  });

  it("dotenv + single key", () => {
    const out = resolveEnvAssignments({
      secretPath: "team/prod/.env",
      content: envBody,
      pickRaw: "B",
      envPrefix: "",
    });
    expect(out).toEqual({ B: "two" });
  });

  it("raw file + single name + prefix", () => {
    const out = resolveEnvAssignments({
      secretPath: "team/pem/id_rsa",
      content: "PRIVATE",
      pickRaw: "SSH_KEY",
      envPrefix: "APP_",
    });
    expect(out).toEqual({ APP_SSH_KEY: "PRIVATE" });
  });

  it("rejects raw file without pick", () => {
    expect(() =>
      resolveEnvAssignments({
        secretPath: "team/file.txt",
        content: "x",
        pickRaw: undefined,
        envPrefix: "",
      }),
    ).toThrow(/pick is required/i);
  });

  it("rejects dotenv without pick", () => {
    expect(() =>
      resolveEnvAssignments({
        secretPath: "team/.env",
        content: envBody,
        pickRaw: undefined,
        envPrefix: "",
      }),
    ).toThrow(/pick is required/i);
  });

  it("rejects multiple names for raw file", () => {
    expect(() =>
      resolveEnvAssignments({
        secretPath: "team/file.txt",
        content: "x",
        pickRaw: "A\nB",
        envPrefix: "",
      }),
    ).toThrow(/exactly one env name/i);
  });
});
